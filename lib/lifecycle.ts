import { LostItemStatus, FoundItemStatus, MatchStatus, ClaimStatus } from './database.types';

// ============================================================================
// Status Transition Maps - Valid lifecycle transitions
// ============================================================================

export const LOST_TRANSITIONS: Record<LostItemStatus, LostItemStatus[]> = {
  lost: ['matched', 'claimed', 'closed'], // can directly close or be claimed
  matched: ['claimed', 'closed', 'lost'], // revert to lost if matches rejected
  claimed: ['closed', 'lost', 'matched'], // revert if claim rejected, or close when resolved
  closed: [], // terminal - archived/resolved, keep historical
};

export const FOUND_TRANSITIONS: Record<FoundItemStatus, FoundItemStatus[]> = {
  found: ['matched', 'claimed', 'disposed'], // found can be disposed if unclaimed long
  matched: ['claimed', 'found', 'disposed'],
  claimed: ['returned', 'found', 'matched', 'disposed'], // revert if claim rejected
  returned: ['disposed'], // after returned, can be disposed/archived; terminal otherwise
  disposed: [], // terminal
};

export const CLAIM_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['completed', 'rejected', 'cancelled'],
  rejected: [], // terminal, but owner could re-submit new claim
  completed: [], // terminal - item returned
  cancelled: [], // terminal
};

export const MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  pending: ['verified', 'rejected'],
  verified: ['resolved', 'rejected'],
  rejected: [], // terminal
  resolved: [], // terminal
};

// ============================================================================
// Validation Helpers
// ============================================================================

export function canTransitionLost(from: string, to: string): boolean {
  const allowed = LOST_TRANSITIONS[from as LostItemStatus] || [];
  return allowed.includes(to as LostItemStatus);
}

export function canTransitionFound(from: string, to: string): boolean {
  const allowed = FOUND_TRANSITIONS[from as FoundItemStatus] || [];
  return allowed.includes(to as FoundItemStatus);
}

export function canTransitionClaim(from: string, to: string): boolean {
  const allowed = CLAIM_TRANSITIONS[from as ClaimStatus] || [];
  return allowed.includes(to as ClaimStatus);
}

export function canTransitionMatch(from: string, to: string): boolean {
  const allowed = MATCH_TRANSITIONS[from as MatchStatus] || [];
  return allowed.includes(to as MatchStatus);
}

// ============================================================================
// Active / Archived helpers
// ============================================================================

export const ACTIVE_LOST_STATUSES: LostItemStatus[] = ['lost', 'matched', 'claimed'];
export const ARCHIVED_LOST_STATUSES: LostItemStatus[] = ['closed'];
export const ACTIVE_FOUND_STATUSES: FoundItemStatus[] = ['found', 'matched', 'claimed'];
export const ARCHIVED_FOUND_STATUSES: FoundItemStatus[] = ['returned', 'disposed'];

export function isActiveLost(status: string): boolean {
  return ACTIVE_LOST_STATUSES.includes(status as LostItemStatus);
}
export function isActiveFound(status: string): boolean {
  return ACTIVE_FOUND_STATUSES.includes(status as FoundItemStatus);
}
export function isArchivedLost(status: string): boolean {
  return ARCHIVED_LOST_STATUSES.includes(status as LostItemStatus);
}
export function isArchivedFound(status: string): boolean {
  return ARCHIVED_FOUND_STATUSES.includes(status as FoundItemStatus);
}

// ============================================================================
// Human-readable status descriptions (for UI)
// ============================================================================

export const LOST_STATUS_META: Record<LostItemStatus, { label: string; description: string; color: string }> = {
  lost: { label: 'Active Lost', description: 'Awaiting match / custody', color: 'amber' },
  matched: { label: 'Potential Match Found', description: 'AI found candidate(s) - review matches', color: 'purple' },
  claimed: { label: 'Claim in Verification', description: 'Ownership claim pending verification', color: 'cyan' },
  closed: { label: 'Resolved & Archived', description: 'Item received / report closed', color: 'emerald' },
};

export const FOUND_STATUS_META: Record<FoundItemStatus, { label: string; description: string; color: string }> = {
  found: { label: 'In Custody', description: 'Logged & available for claim', color: 'blue' },
  matched: { label: 'Potential Owner Matched', description: 'AI correlated with lost report', color: 'purple' },
  claimed: { label: 'Claim in Review', description: 'Someone claimed ownership', color: 'cyan' },
  returned: { label: 'Returned to Owner', description: 'Successfully handed over', color: 'emerald' },
  disposed: { label: 'Archived / Disposed', description: 'Archived or transferred to security', color: 'slate' },
};

export function getLostStatusLabel(status: string): string {
  return (LOST_STATUS_META[status as LostItemStatus]?.label) || status;
}
export function getFoundStatusLabel(status: string): string {
  return (FOUND_STATUS_META[status as FoundItemStatus]?.label) || status;
}

// ============================================================================
// Lifecycle action descriptions
// ============================================================================

export function getNextActionsForLost(status: LostItemStatus, isOwner: boolean): string[] {
  if (!isOwner) return [];
  switch (status) {
    case 'lost': return ['matched', 'closed'];
    case 'matched': return ['claimed', 'closed'];
    case 'claimed': return ['closed']; // Confirm Received -> closed
    case 'closed': return [];
    default: return [];
  }
}

export function getNextActionsForFound(status: FoundItemStatus, isFinderOrStaff: boolean): string[] {
  if (!isFinderOrStaff) return [];
  switch (status) {
    case 'found': return ['matched', 'disposed'];
    case 'matched': return ['claimed', 'disposed'];
    case 'claimed': return ['returned', 'disposed'];
    case 'returned': return ['disposed'];
    case 'disposed': return [];
    default: return [];
  }
}
