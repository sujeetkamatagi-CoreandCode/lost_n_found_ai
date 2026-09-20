'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  ArrowRight,
  PackageCheck,
  MessageSquare,
  Building2,
  X,
} from 'lucide-react';
import { getUserClaims, updateClaimStatus, completeClaimHandover, confirmItemReceived } from '@/lib/api/claims';
import { getFoundItems } from '@/lib/api/foundItems';
import { supabase } from '@/lib/supabaseClient';
import { ClaimWithDetails, ClaimStatus } from '@/lib/database.types';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import StatusBadge from '@/components/StatusBadge';

export default function ClaimsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'my-claims' | 'review-claims'>('my-claims');
  const [myClaims, setMyClaims] = useState<ClaimWithDetails[]>([]);
  const [reviewClaims, setReviewClaims] = useState<ClaimWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Review / Handover Modal
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithDetails | null>(null);
  const [modalAction, setModalAction] = useState<'review' | 'handover' | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [handoverLocation, setHandoverLocation] = useState('Central Security Office - Student Union Rm 104');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchClaims = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch claims submitted by current user
      const userClaims = await getUserClaims(user.id);
      setMyClaims(userClaims);

      // 2. Fetch incoming claims to review
      // If staff/admin, fetch all claims; if student, fetch claims for items found by user
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
        .order('created_at', { ascending: false });

      if (user.role === 'student') {
        // Find items found by this student
        const { data: userFoundItems } = await supabase
          .from('found_items')
          .select('id')
          .eq('finder_id', user.id);

        const foundIds = (userFoundItems || []).map((f) => f.id);
        if (foundIds.length > 0) {
          query = query.in('found_item_id', foundIds);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // empty
        }
      }

      const { data: reviewData } = await query;
      setReviewClaims((reviewData as unknown as ClaimWithDetails[]) || []);
    } catch (err) {
      console.error('Error loading claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [user]);

  const handleReviewSubmit = async (status: 'approved' | 'rejected') => {
    if (!selectedClaim || !user) return;
    setSubmittingAction(true);
    try {
      await updateClaimStatus(selectedClaim.id, status, user.id, reviewerNotes);
      showToast(`Claim has been ${status.toUpperCase()}!`, {
        message: status === 'approved' ? 'Claimant notified to schedule handover.' : 'Reason logged.',
      });
      setModalAction(null);
      setSelectedClaim(null);
      setReviewerNotes('');
      fetchClaims();
    } catch (err: any) {
      showToast('Action failed', { type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleHandoverSubmit = async () => {
    if (!selectedClaim || !user) return;
    setSubmittingAction(true);
    try {
      await completeClaimHandover(selectedClaim.id, handoverLocation, user.id);
      showToast('Item handover completed!', {
        message: 'Chain of custody closed and item marked as returned to owner.',
      });
      setModalAction(null);
      setSelectedClaim(null);
      fetchClaims();
    } catch (err: any) {
      showToast('Handover logging failed', { type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleConfirmReceived = async (claimId: string) => {
    if (!user) return;
    setSubmittingAction(true);
    try {
      await confirmItemReceived(claimId, 'Owner confirmed receipt via Claims page');
      showToast('Confirmed! You have received your item.', {
        message: 'Claim marked completed, lost report archived, found item returned.',
      });
      fetchClaims();
    } catch (err: any) {
      showToast('Confirm failed', { type: 'error', message: err.message });
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Ownership Claims & Verifications
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Track your submitted property claims and review verification requests for found items.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('my-claims')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'my-claims'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Filed Claims ({myClaims.length})
          </button>
          <button
            onClick={() => setActiveTab('review-claims')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'review-claims'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Review Incoming ({reviewClaims.length})
            {user?.role === 'staff' && (
              <span className="ml-1 text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                Staff
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State: My Claims */}
      {!loading && activeTab === 'my-claims' && myClaims.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl bg-slate-900/30 border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <PackageCheck className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Submitted Claims</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            If you identify your missing item in the Found Directory, open its details and click &quot;Submit Ownership Claim&quot;.
          </p>
          <div className="flex justify-center pt-2">
            <Link
              href="/found-items"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md"
            >
              Browse Found Directory
            </Link>
          </div>
        </div>
      )}

      {/* Empty State: Review Claims */}
      {!loading && activeTab === 'review-claims' && reviewClaims.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl bg-slate-900/30 border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Incoming Claims to Review</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {user?.role === 'staff'
              ? 'All submitted campus claims have been reviewed!'
              : 'When students submit ownership claims on items you turned in, they will show up here.'}
          </p>
        </div>
      )}

      {/* Claims List: My Filed Claims */}
      {!loading && activeTab === 'my-claims' && myClaims.length > 0 && (
        <div className="space-y-4">
          {myClaims.map((claim) => (
            <div
              key={claim.id}
              className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Claimed Found Item:
                    </span>
                    <Link
                      href={`/found-items/${claim.found_item_id}`}
                      className="text-sm font-bold text-slate-100 hover:text-indigo-400 underline decoration-slate-700 underline-offset-2"
                    >
                      {claim.found_items?.title}
                    </Link>
                  </div>
                  <p className="text-xs text-slate-400">
                    Submitted on {new Date(claim.created_at).toLocaleDateString()}
                  </p>
                </div>

                <StatusBadge status={claim.status} size="md" />
              </div>

              {/* Claim Proof & Storage Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block">
                    Your Provided Ownership Proof:
                  </span>
                  <p className="text-slate-200 leading-relaxed">{claim.proof_description}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>Custody Location:</span>
                  </div>
                  <p className="text-slate-200">{claim.found_items?.current_storage_location}</p>

                  {claim.reviewer_notes && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="font-bold text-indigo-400 block mb-0.5">
                        Reviewer Feedback:
                      </span>
                      <p className="text-slate-300">{claim.reviewer_notes}</p>
                    </div>
                  )}

                  {claim.handover_location && (
                    <div className="pt-2 border-t border-emerald-500/20 text-emerald-400 font-medium">
                      ✓ Handed over at {claim.handover_location}
                    </div>
                  )}
                </div>
              </div>

              {/* Owner confirm received action */}
              {(claim.status === 'approved' || claim.status === 'pending') && (
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3">
                  <div className="text-[11px] text-slate-400 flex-1">When you physically receive the item, confirm below to archive and propagate status to all related records (persisted in Supabase).</div>
                  {claim.status === 'approved' && (
                    <button
                      onClick={() => handleConfirmReceived(claim.id)}
                      disabled={submittingAction}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm I Received My Item
                    </button>
                  )}
                  {claim.status === 'pending' && <span className="text-[11px] text-amber-400">Awaiting reviewer approval before handover</span>}
                </div>
              )}
              {claim.status === 'completed' && (
                <div className="pt-3 border-t border-emerald-500/20 text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  ✓ You have confirmed receipt. Historical record kept in Profile → Resolved History. Item removed from active boards.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Claims List: Incoming Claims to Review */}
      {!loading && activeTab === 'review-claims' && reviewClaims.length > 0 && (
        <div className="space-y-4">
          {reviewClaims.map((claim) => (
            <div
              key={claim.id}
              className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl space-y-5 hover:border-slate-700 transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Item:
                    </span>
                    <Link
                      href={`/found-items/${claim.found_item_id}`}
                      className="text-sm font-bold text-slate-100 hover:text-indigo-400 underline decoration-slate-700 underline-offset-2"
                    >
                      {claim.found_items?.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Claimant: <strong className="text-slate-200">{claim.claimant?.full_name}</strong></span>
                    <span>•</span>
                    <span>{claim.claimant?.department} ({claim.claimant?.student_id})</span>
                  </div>
                </div>

                <StatusBadge status={claim.status} size="md" />
              </div>

              {/* Proof details */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                  Confidential Ownership Proof Submitted:
                </span>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {claim.proof_description}
                </p>

                {claim.proof_image_urls && claim.proof_image_urls.length > 0 && (
                  <div className="pt-2 flex gap-2">
                    {claim.proof_image_urls.map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noreferrer"
                        className="w-16 h-16 rounded-xl border border-slate-700 overflow-hidden"
                      >
                        <img src={img} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviewer Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-xs text-slate-400">
                  {claim.reviewer && (
                    <span>Last reviewed by {claim.reviewer.full_name}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {claim.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedClaim(claim);
                          setModalAction('review');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verify & Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClaim(claim);
                          setModalAction('review');
                        }}
                        className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject Claim
                      </button>
                    </>
                  )}

                  {claim.status === 'approved' && (
                    <button
                      onClick={() => {
                        setSelectedClaim(claim);
                        setModalAction('handover');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Complete Physical Handover
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {modalAction === 'review' && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full text-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-400" />
                Claim Verification Decision
              </h3>
              <button
                onClick={() => setModalAction(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Item: <strong>{selectedClaim.found_items?.title}</strong>
              </p>
              <p className="text-xs text-slate-300">
                Claimant: <strong>{selectedClaim.claimant?.full_name}</strong>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reviewer Notes / Verification Reason
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Serial number verified matches records / Passcode tested and unlocked item successfully..."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalAction(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handleReviewSubmit('rejected')}
                className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-rose-100 rounded-xl text-xs font-semibold border border-rose-700 disabled:opacity-50"
              >
                Reject Claim
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handleReviewSubmit('approved')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
              >
                {submittingAction ? 'Processing...' : 'Approve Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {modalAction === 'handover' && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full text-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Confirm Physical Handover
              </h3>
              <button
                onClick={() => setModalAction(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Log the physical return of <strong>{selectedClaim.found_items?.title}</strong> to{' '}
                <strong>{selectedClaim.claimant?.full_name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Handover Location
                </label>
                <input
                  type="text"
                  value={handoverLocation}
                  onChange={(e) => setHandoverLocation(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalAction(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={handleHandoverSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
              >
                {submittingAction ? 'Logging Handover...' : 'Mark Completed Handover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
