import { supabase } from '../supabaseClient';
import {
  Claim,
  InsertClaim,
  UpdateClaim,
  ClaimStatus,
  ClaimWithDetails,
} from '../database.types';

/**
 * Submit a new claim on a found item.
 */
export async function createClaim(claim: InsertClaim): Promise<Claim> {
  const { data, error } = await supabase
    .from('claims')
    .insert(claim)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch a single claim by its ID with full item, claimant, and reviewer details.
 */
export async function getClaimById(id: string): Promise<ClaimWithDetails | null> {
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      found_items(*),
      claimant:users!claims_claimant_id_fkey(*),
      lost_items(*),
      matches(*),
      reviewer:users!claims_reviewer_id_fkey(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching claim ${id}:`, error.message);
    return null;
  }
  return data as unknown as ClaimWithDetails;
}

/**
 * Fetch all claims submitted for a particular found item.
 */
export async function getClaimsForFoundItem(
  foundItemId: string
): Promise<ClaimWithDetails[]> {
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      found_items(*),
      claimant:users!claims_claimant_id_fkey(*),
      lost_items(*),
      matches(*),
      reviewer:users!claims_reviewer_id_fkey(*)
    `)
    .eq('found_item_id', foundItemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as ClaimWithDetails[]) || [];
}

/**
 * Fetch all claims made by a specific claimant (student).
 */
export async function getUserClaims(
  claimantId: string,
  status?: ClaimStatus
): Promise<ClaimWithDetails[]> {
  let query = supabase
    .from('claims')
    .select(`
      *,
      found_items(*),
      claimant:users!claims_claimant_id_fkey(*),
      lost_items(*),
      matches(*),
      reviewer:users!claims_reviewer_id_fkey(*)
    `)
    .eq('claimant_id', claimantId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as ClaimWithDetails[]) || [];
}

/**
 * Update the status of a claim (e.g. approve or reject) with reviewer notes.
 * Validates transition and propagates to related items if approved.
 */
export async function updateClaimStatus(
  id: string,
  status: ClaimStatus,
  reviewerId?: string,
  reviewerNotes?: string
): Promise<Claim> {
  // Fetch current for validation
  const { data: current } = await supabase.from('claims').select('status, found_item_id, lost_item_id, match_id').eq('id', id).single();
  if (current && current.status !== status) {
    const { canTransitionClaim } = await import('../lifecycle');
    if (!canTransitionClaim(current.status, status)) {
      throw new Error(`Invalid claim transition: ${current.status} → ${status}`);
    }
  }

  const updates: UpdateClaim = {
    status,
    ...(reviewerId !== undefined && { reviewer_id: reviewerId }),
    ...(reviewerNotes !== undefined && { reviewer_notes: reviewerNotes }),
    ...(status === 'approved' || status === 'rejected' ? { verified_at: new Date().toISOString() } : {}),
  };

  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Propagation for approved: set items to 'claimed' and match to 'verified'
  if (status === 'approved' && data) {
    try {
      await propagateClaimApproved(data as Claim);
    } catch (e) {
      console.warn('Propagation after approve failed (non-critical):', e);
    }
  }

  // Propagation for rejected/cancelled: optionally revert items to previous active status if no other active claims
  if ((status === 'rejected' || status === 'cancelled') && data) {
    try {
      await propagateClaimRejectedOrCancelled(data as Claim);
    } catch (e) {
      console.warn('Propagation after reject failed:', e);
    }
  }

  return data;
}

/**
 * Complete a claim handover once item is physically returned to owner.
 * This is the terminal lifecycle action: marks lost as closed, found as returned, match as resolved,
 * and removes from active boards while preserving history.
 */
export async function completeClaimHandover(
  id: string,
  handoverLocation: string,
  reviewerId: string
): Promise<Claim> {
  const { data: current } = await supabase.from('claims').select('status').eq('id', id).single();
  if (current && current.status !== 'approved' && current.status !== 'pending') {
    // Allow completing from approved primarily, but also permit from pending if reviewer does handover directly
  }

  const updates: UpdateClaim = {
    status: 'completed',
    handover_location: handoverLocation,
    handover_timestamp: new Date().toISOString(),
    reviewer_id: reviewerId,
  };

  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (data) {
    try {
      await propagateClaimCompleted(data as Claim);
    } catch (e) {
      console.warn('Propagation after completed failed:', e);
    }
  }

  return data;
}

/**
 * Claimant confirms they have received the item - same as completed but from owner perspective.
 * Updates claim to completed and propagates to items regardless of reviewer.
 */
export async function confirmItemReceived(
  claimId: string,
  handoverLocation: string = 'Owner confirmed receipt'
): Promise<Claim> {
  const { data: claim } = await supabase.from('claims').select('status, found_item_id, lost_item_id, match_id, claimant_id').eq('id', claimId).single();
  if (!claim) throw new Error('Claim not found');
  // Allow from approved or pending (owner self-confirmation)
  const updates: UpdateClaim = {
    status: 'completed',
    handover_location: handoverLocation,
    handover_timestamp: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('claims').update(updates).eq('id', claimId).select().single();
  if (error) throw error;
  if (data) await propagateClaimCompleted(data as Claim);
  return data;
}

// ============================================================================
// Internal propagation helpers
// ============================================================================

async function propagateClaimApproved(claim: Claim) {
  const promises: any[] = [];

  // Update lost item -> claimed
  if (claim.lost_item_id) {
    promises.push(
      (async () => {
        const { error } = await supabase.from('lost_items').update({ status: 'claimed' }).eq('id', claim.lost_item_id!);
        if (error) console.warn('lost claim propagation', error.message);
      })()
    );
  }
  // Update found item -> claimed
  if (claim.found_item_id) {
    promises.push(
      (async () => {
        const { error } = await supabase.from('found_items').update({ status: 'claimed' }).eq('id', claim.found_item_id!);
        if (error) console.warn('found claim propagation', error.message);
      })()
    );
  }
  // Update match -> verified
  if (claim.match_id) {
    promises.push(
      (async () => {
        const { error } = await supabase.from('matches').update({ status: 'verified' }).eq('id', claim.match_id!);
        if (error) console.warn('match verify propagation', error.message);
      })()
    );
  } else if (claim.lost_item_id && claim.found_item_id) {
    promises.push(
      (async () => {
        const { error } = await supabase.from('matches').update({ status: 'verified' }).eq('lost_item_id', claim.lost_item_id!).eq('found_item_id', claim.found_item_id!);
        if (error) {/* ignore */ }
      })()
    );
  }

  await Promise.all(promises);
}

async function propagateClaimCompleted(claim: Claim) {
  const promises: any[] = [];

  if (claim.lost_item_id) {
    promises.push(
      (async () => {
        const { error } = await supabase.from('lost_items').update({ status: 'closed' }).eq('id', claim.lost_item_id!);
        if (error) console.warn('lost completed propagation', error.message);
      })()
    );
  }
  if (claim.found_item_id) {
    promises.push(
      (async () => {
        const { error } = await supabase.from('found_items').update({ status: 'returned' }).eq('id', claim.found_item_id!);
        if (error) console.warn('found completed propagation', error.message);
      })()
    );
  }
  if (claim.match_id) {
    promises.push(
      (async () => {
        const { error } = await supabase.from('matches').update({ status: 'resolved' }).eq('id', claim.match_id!);
        if (error) console.warn('match resolved propagation', error.message);
      })()
    );
  } else if (claim.lost_item_id && claim.found_item_id) {
    promises.push(
      (async () => {
        await supabase.from('matches').update({ status: 'resolved' }).eq('lost_item_id', claim.lost_item_id!).eq('found_item_id', claim.found_item_id!);
      })()
    );
  }

  await Promise.all(promises);
}

async function propagateClaimRejectedOrCancelled(claim: Claim) {
  // Revert items to 'matched' if they were claimed, unless there are other active approved claims
  // For simplicity, check if there exists another approved/completed claim for same found item; if not, revert
  if (claim.found_item_id) {
    const { data: otherClaims } = await supabase.from('claims').select('id, status').eq('found_item_id', claim.found_item_id).in('status', ['approved', 'completed']);
    if (!otherClaims || otherClaims.length === 0) {
      // No active approved claims remain, revert found to 'matched' if it was claimed, else 'found'
      const { data: foundItem } = await supabase.from('found_items').select('status').eq('id', claim.found_item_id).single();
      if (foundItem?.status === 'claimed') {
        // Check if there are still matches indicating potential owner
        const { data: matches } = await supabase.from('matches').select('id').eq('found_item_id', claim.found_item_id).in('status', ['pending', 'verified']).limit(1);
        const revertStatus = matches && matches.length > 0 ? 'matched' : 'found';
        await supabase.from('found_items').update({ status: revertStatus }).eq('id', claim.found_item_id);
      }
    }
  }
  if (claim.lost_item_id) {
    const { data: otherClaims } = await supabase.from('claims').select('id, status').eq('lost_item_id', claim.lost_item_id).in('status', ['approved', 'completed']);
    if (!otherClaims || otherClaims.length === 0) {
      const { data: lostItem } = await supabase.from('lost_items').select('status').eq('id', claim.lost_item_id).single();
      if (lostItem?.status === 'claimed') {
        const { data: matches } = await supabase.from('matches').select('id').eq('lost_item_id', claim.lost_item_id).in('status', ['pending', 'verified']).limit(1);
        const revertStatus = matches && matches.length > 0 ? 'matched' : 'lost';
        await supabase.from('lost_items').update({ status: revertStatus }).eq('id', claim.lost_item_id);
      }
    }
  }
  if (claim.match_id) {
    // If claim rejected, revert match to pending unless other claims still approved
    await supabase.from('matches').update({ status: 'pending' }).eq('id', claim.match_id);
  }
}

/**
 * Delete / cancel a claim.
 */
export async function deleteClaim(id: string): Promise<void> {
  const { error } = await supabase
    .from('claims')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
