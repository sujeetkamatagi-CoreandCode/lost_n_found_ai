import { supabase } from '../supabaseClient';
import {
  LostItem,
  InsertLostItem,
  UpdateLostItem,
  LostItemStatus,
  LostItemFilterOptions,
  LostItemWithUser,
} from '../database.types';

/**
 * Fetch lost items with flexible filtering, searching, and pagination.
 */
export async function getLostItems(
  options: LostItemFilterOptions = {}
): Promise<{ items: LostItemWithUser[]; count: number }> {
  const {
    category,
    building,
    status,
    userId,
    searchQuery,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  let query = supabase
    .from('lost_items')
    .select('*, users!lost_items_user_id_fkey(*)', { count: 'exact' });

  if (category) {
    query = query.eq('category', category);
  }
  if (building) {
    query = query.ilike('building', `%${building}%`);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (startDate) {
    query = query.gte('date_lost', startDate);
  }
  if (endDate) {
    query = query.lte('date_lost', endDate);
  }
  if (searchQuery && searchQuery.trim().length > 0) {
    const term = searchQuery.trim();
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,distinctive_features.ilike.%${term}%,location_lost.ilike.%${term}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { items: (data as unknown as LostItemWithUser[]) || [], count: count || 0 };
}

/**
 * Fetch a single lost item by its ID, with owner profile details.
 */
export async function getLostItemById(id: string): Promise<LostItemWithUser | null> {
  const { data, error } = await supabase
    .from('lost_items')
    .select('*, users!lost_items_user_id_fkey(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching lost item ${id}:`, error.message);
    return null;
  }
  return data as unknown as LostItemWithUser;
}

/**
 * Fetch all lost items reported by a specific user.
 */
export async function getUserLostItems(
  userId: string,
  status?: LostItemStatus
): Promise<LostItem[]> {
  let query = supabase
    .from('lost_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Create a new lost item report.
 */
export async function createLostItem(item: InsertLostItem): Promise<LostItem> {
  const { data, error } = await supabase
    .from('lost_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing lost item report.
 */
export async function updateLostItem(
  id: string,
  updates: UpdateLostItem
): Promise<LostItem> {
  const { data, error } = await supabase
    .from('lost_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update the status of a lost item with lifecycle validation.
 * Fetches current status and validates transition; throws if invalid.
 */
export async function updateLostItemStatus(
  id: string,
  status: LostItemStatus
): Promise<LostItem> {
  // Fetch current to validate transition
  const { data: current, error: fetchErr } = await supabase
    .from('lost_items')
    .select('status')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;
  if (current && current.status !== status) {
    const { canTransitionLost } = await import('../lifecycle');
    if (!canTransitionLost(current.status, status)) {
      throw new Error(`Invalid status transition: ${current.status} → ${status}. Allowed: ${(await import('../lifecycle')).LOST_TRANSITIONS[current.status as LostItemStatus]?.join(', ') || 'none'}`);
    }
  }
  return updateLostItem(id, { status });
}

/**
 * Safe transition with validation - use for lifecycle actions
 */
export async function transitionLostItemStatus(
  id: string,
  newStatus: LostItemStatus
): Promise<LostItem> {
  return updateLostItemStatus(id, newStatus);
}

/**
 * Archive a lost item (soft delete) - sets status to 'closed' (Resolved & Archived)
 * Preserves historical record, removes from active boards.
 */
export async function archiveLostItem(id: string): Promise<LostItem> {
  // archive is allowed from any active status; use direct update bypassing strict validation via updateLostItem
  // But we still attempt validated transition first, fallback to direct if needed (e.g., already closed)
  const { data: current } = await supabase.from('lost_items').select('status').eq('id', id).single();
  if (current?.status === 'closed') return updateLostItem(id, { status: 'closed' });
  try {
    return await updateLostItemStatus(id, 'closed');
  } catch {
    // Force archive if transition invalid but user explicitly wants to archive
    return updateLostItem(id, { status: 'closed' });
  }
}

/**
 * Delete a lost item report - hard delete. Should only be used after archiving.
 * Prefer archiveLostItem for soft delete.
 */
export async function deleteLostItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('lost_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetch only active lost items (excludes closed/archived). Used for main boards.
 */
export async function getActiveLostItems(
  options: Omit<LostItemFilterOptions, 'status'> = {}
): Promise<{ items: LostItemWithUser[]; count: number }> {
  // Active = lost, matched, claimed
  const { data, error, count } = await supabase
    .from('lost_items')
    .select('*, users!lost_items_user_id_fkey(*)', { count: 'exact' })
    .in('status', ['lost', 'matched', 'claimed'])
    .order('created_at', { ascending: false })
    .range(0, (options.limit || 50) - 1);
  if (error) throw error;
  // Apply additional filters client-side? For now return as is; exhaustive filtering via getLostItems recommended
  return { items: (data as unknown as LostItemWithUser[]) || [], count: count || 0 };
}
