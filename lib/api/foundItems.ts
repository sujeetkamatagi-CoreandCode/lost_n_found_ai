import { supabase } from '../supabaseClient';
import {
  FoundItem,
  InsertFoundItem,
  UpdateFoundItem,
  FoundItemStatus,
  FoundItemFilterOptions,
  FoundItemWithUser,
} from '../database.types';

/**
 * Fetch found items with flexible filtering, searching, and pagination.
 */
export async function getFoundItems(
  options: FoundItemFilterOptions = {}
): Promise<{ items: FoundItemWithUser[]; count: number }> {
  const {
    category,
    building,
    status,
    finderId,
    searchQuery,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  let query = supabase
    .from('found_items')
    .select('*, users!found_items_finder_id_fkey(*)', { count: 'exact' });

  if (category) {
    query = query.eq('category', category);
  }
  if (building) {
    query = query.ilike('building', `%${building}%`);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (finderId) {
    query = query.eq('finder_id', finderId);
  }
  if (startDate) {
    query = query.gte('date_found', startDate);
  }
  if (endDate) {
    query = query.lte('date_found', endDate);
  }
  if (searchQuery && searchQuery.trim().length > 0) {
    const term = searchQuery.trim();
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,location_found.ilike.%${term}%,current_storage_location.ilike.%${term}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { items: (data as unknown as FoundItemWithUser[]) || [], count: count || 0 };
}

/**
 * Fetch a single found item by its ID, with finder profile details.
 */
export async function getFoundItemById(id: string): Promise<FoundItemWithUser | null> {
  const { data, error } = await supabase
    .from('found_items')
    .select('*, users!found_items_finder_id_fkey(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching found item ${id}:`, error.message);
    return null;
  }
  return data as unknown as FoundItemWithUser;
}

/**
 * Fetch all found items reported by a specific user.
 */
export async function getUserFoundItems(
  finderId: string,
  status?: FoundItemStatus
): Promise<FoundItem[]> {
  let query = supabase
    .from('found_items')
    .select('*')
    .eq('finder_id', finderId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Create a new found item report.
 */
export async function createFoundItem(item: InsertFoundItem): Promise<FoundItem> {
  const { data, error } = await supabase
    .from('found_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing found item report.
 */
export async function updateFoundItem(
  id: string,
  updates: UpdateFoundItem
): Promise<FoundItem> {
  const { data, error } = await supabase
    .from('found_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update the status of a found item with lifecycle validation.
 */
export async function updateFoundItemStatus(
  id: string,
  status: FoundItemStatus
): Promise<FoundItem> {
  const { data: current, error: fetchErr } = await supabase
    .from('found_items')
    .select('status')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;
  if (current && current.status !== status) {
    const { canTransitionFound } = await import('../lifecycle');
    if (!canTransitionFound(current.status, status)) {
      throw new Error(`Invalid status transition: ${current.status} → ${status}. Allowed: ${(await import('../lifecycle')).FOUND_TRANSITIONS[current.status as FoundItemStatus]?.join(', ') || 'none'}`);
    }
  }
  return updateFoundItem(id, { status });
}

export async function transitionFoundItemStatus(
  id: string,
  newStatus: FoundItemStatus
): Promise<FoundItem> {
  return updateFoundItemStatus(id, newStatus);
}

/**
 * Archive a found item (soft delete) - sets status to 'disposed' (Archived)
 * Use 'returned' for successful handover, 'disposed' for archival.
 */
export async function archiveFoundItem(id: string): Promise<FoundItem> {
  const { data: current } = await supabase.from('found_items').select('status').eq('id', id).single();
  if (current?.status === 'disposed' || current?.status === 'returned') {
    // Already terminal, ensure disposed for fully archived
    return updateFoundItem(id, { status: current.status });
  }
  try {
    return await updateFoundItemStatus(id, 'disposed');
  } catch {
    return updateFoundItem(id, { status: 'disposed' });
  }
}

/**
 * Mark found item as successfully returned to owner - lifecycle terminal success
 */
export async function markFoundItemReturned(id: string): Promise<FoundItem> {
  try {
    return await updateFoundItemStatus(id, 'returned');
  } catch {
    return updateFoundItem(id, { status: 'returned' });
  }
}

/**
 * Delete a found item report - hard delete. Prefer soft archive.
 */
export async function deleteFoundItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('found_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetch only active found items (excludes returned/disposed). For main boards.
 */
export async function getActiveFoundItems(
  options: Omit<FoundItemFilterOptions, 'status'> = {}
): Promise<{ items: FoundItemWithUser[]; count: number }> {
  const { data, error, count } = await supabase
    .from('found_items')
    .select('*, users!found_items_finder_id_fkey(*)', { count: 'exact' })
    .in('status', ['found', 'matched', 'claimed'])
    .order('created_at', { ascending: false })
    .range(0, (options.limit || 50) - 1);
  if (error) throw error;
  return { items: (data as unknown as FoundItemWithUser[]) || [], count: count || 0 };
}
