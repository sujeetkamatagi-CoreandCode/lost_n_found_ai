import { supabase } from '../supabaseClient';
import {
  Match,
  InsertMatch,
  UpdateMatch,
  MatchStatus,
  MatchWithDetails,
} from '../database.types';

/**
 * Fetch matches for a specific lost item with joined found item details.
 */
export async function getMatchesForLostItem(
  lostItemId: string
): Promise<MatchWithDetails[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, lost_items(*), found_items(*), verifier:users!matches_verified_by_fkey(*)')
    .eq('lost_item_id', lostItemId)
    .order('confidence_score', { ascending: false });

  if (error) throw error;
  return (data as unknown as MatchWithDetails[]) || [];
}

/**
 * Fetch matches for a specific found item with joined lost item details.
 */
export async function getMatchesForFoundItem(
  foundItemId: string
): Promise<MatchWithDetails[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, lost_items(*), found_items(*), verifier:users!matches_verified_by_fkey(*)')
    .eq('found_item_id', foundItemId)
    .order('confidence_score', { ascending: false });

  if (error) throw error;
  return (data as unknown as MatchWithDetails[]) || [];
}

/**
 * Fetch a single match by ID with full item and verifier details.
 */
export async function getMatchById(id: string): Promise<MatchWithDetails | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, lost_items(*), found_items(*), verifier:users!matches_verified_by_fkey(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching match ${id}:`, error.message);
    return null;
  }
  return data as unknown as MatchWithDetails;
}

/**
 * Fetch high confidence matches (e.g. >= 70%).
 */
export async function getHighConfidenceMatches(
  minConfidence: number = 70.0,
  status?: MatchStatus
): Promise<MatchWithDetails[]> {
  let query = supabase
    .from('matches')
    .select('*, lost_items(*), found_items(*), verifier:users!matches_verified_by_fkey(*)')
    .gte('confidence_score', minConfidence)
    .order('confidence_score', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as MatchWithDetails[]) || [];
}

/**
 * Create or save an AI-generated match candidate.
 */
export async function createMatch(match: InsertMatch): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .upsert(match, { onConflict: 'lost_item_id,found_item_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Batch create/upsert match candidates.
 */
export async function upsertMatchesBatch(matches: InsertMatch[]): Promise<Match[]> {
  if (matches.length === 0) return [];

  const { data, error } = await supabase
    .from('matches')
    .upsert(matches, { onConflict: 'lost_item_id,found_item_id' })
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Update match status (e.g., 'verified', 'rejected', 'resolved').
 * Propagates to lost/found items for lifecycle coherence.
 */
export async function updateMatchStatus(
  id: string,
  status: MatchStatus,
  verifiedBy?: string
): Promise<Match> {
  const { data: current } = await supabase.from('matches').select('status, lost_item_id, found_item_id').eq('id', id).single();
  if (current && current.status !== status) {
    const { canTransitionMatch } = await import('../lifecycle');
    if (!canTransitionMatch(current.status, status)) {
      throw new Error(`Invalid match transition: ${current.status} → ${status}`);
    }
  }

  const updates: UpdateMatch = {
    status,
    ...(verifiedBy !== undefined && { verified_by: verifiedBy }),
  };

  const { data, error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Propagate verified/resolved to items
  if (data) {
    try {
      if (status === 'verified') {
        // set both items to matched if they are still in active lost/found
        const { data: lost } = await supabase.from('lost_items').select('status').eq('id', data.lost_item_id).single();
        const { data: found } = await supabase.from('found_items').select('status').eq('id', data.found_item_id).single();
        if (lost && ['lost'].includes(lost.status)) {
          await supabase.from('lost_items').update({ status: 'matched' }).eq('id', data.lost_item_id);
        }
        if (found && ['found'].includes(found.status)) {
          await supabase.from('found_items').update({ status: 'matched' }).eq('id', data.found_item_id);
        }
      } else if (status === 'resolved') {
        // resolved implies items should be archived
        await supabase.from('lost_items').update({ status: 'closed' }).eq('id', data.lost_item_id);
        await supabase.from('found_items').update({ status: 'returned' }).eq('id', data.found_item_id);
      }
    } catch (e) {
      console.warn('Match propagation warning:', e);
    }
  }

  return data;
}

/**
 * Fetch only active matches (pending, verified) - excludes resolved/rejected for main board
 */
export async function getActiveMatches(
  minConfidence: number = 0
): Promise<MatchWithDetails[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, lost_items(*), found_items(*), verifier:users!matches_verified_by_fkey(*)')
    .in('status', ['pending', 'verified'])
    .gte('confidence_score', minConfidence)
    .order('confidence_score', { ascending: false });
  if (error) throw error;
  return (data as unknown as MatchWithDetails[]) || [];
}

/**
 * Delete a match candidate.
 */
export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
