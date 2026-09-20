'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Shield,
  Tag,
  Sparkles,
  ShieldCheck,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Share2,
  PackageCheck,
  FileCheck2,
  Loader2,
  X,
  Zap,
  HelpCircle,
  Send,
  Edit3,
  Archive,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { getFoundItemById, updateFoundItemStatus, archiveFoundItem, deleteFoundItem, markFoundItemReturned } from '@/lib/api/foundItems';
import { createClaim, getClaimsForFoundItem } from '@/lib/api/claims';
import { getMatchesForFoundItem } from '@/lib/api/matches';
import {
  FoundItemWithUser,
  ClaimWithDetails,
  MatchWithDetails,
  FoundItemStatus,
} from '@/lib/database.types';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import StatusBadge from '@/components/StatusBadge';
import ImageUploader from '@/components/ImageUploader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getFoundStatusLabel } from '@/lib/lifecycle';

interface ParsedReasoning {
  summary: string;
  reasons: string[];
  uncertainties: string[];
  missingInformation: string[];
  followUpQuestion?: string;
  recommendedAction?: string;
}

function parseReasoning(raw: string): ParsedReasoning {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        summary: parsed.summary || raw,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [parsed.summary || raw],
        uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
        missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
        followUpQuestion: parsed.followUpQuestion || undefined,
        recommendedAction: parsed.recommendedAction || undefined,
      };
    }
  } catch {}
  return {
    summary: raw,
    reasons: [raw],
    uncertainties: [],
    missingInformation: [],
    followUpQuestion: undefined,
    recommendedAction: undefined,
  };
}

export default function FoundItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState<FoundItemWithUser | null>(null);
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmReturnedOpen, setConfirmReturnedOpen] = useState(false);

  // Scan state
  const [scanning, setScanning] = useState(false);

  // Clarification state
  const [clarificationInputs, setClarificationInputs] = useState<Record<string, string>>({});
  const [clarifyingMatchId, setClarifyingMatchId] = useState<string | null>(null);

  // Claim Form State
  const [claimProof, setClaimProof] = useState('');
  const [claimImages, setClaimImages] = useState<string[]>([]);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const loadItem = async () => {
    setLoading(true);
    try {
      const data = await getFoundItemById(resolvedParams.id);
      setItem(data);
      if (data?.image_urls && data.image_urls.length > 0) {
        setActiveImage(data.image_urls[0]);
      }

      const [claimsRes, matchRes] = await Promise.all([
        getClaimsForFoundItem(resolvedParams.id).catch(() => []),
        getMatchesForFoundItem(resolvedParams.id).catch(() => []),
      ]);
      setClaims(claimsRes);
      setMatches(matchRes);
    } catch (err) {
      console.error('Error loading found item:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [resolvedParams.id]);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !item) {
      showToast('Sign in required', {
        type: 'error',
        message: 'Please sign in or select a demo persona to file a claim.',
      });
      return;
    }

    if (!claimProof.trim()) {
      showToast('Proof description required', {
        type: 'error',
        message: 'Please provide proof of ownership (secret marks, contents, serial numbers).',
      });
      return;
    }

    setSubmittingClaim(true);
    try {
      await createClaim({
        found_item_id: item.id,
        claimant_id: user.id,
        proof_description: claimProof.trim(),
        proof_image_urls: claimImages,
        status: 'pending',
      });

      showToast('Claim submitted for verification!', {
        message: 'Campus staff or the finder will review your ownership proof.',
      });

      setShowClaimModal(false);
      setClaimProof('');
      setClaimImages([]);
      router.push('/claims');
    } catch (err: any) {
      console.error('Claim submission error:', err);
      showToast('Failed to submit claim', { type: 'error', message: err.message });
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleTriggerScan = async () => {
    if (!item) return;
    setScanning(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, itemType: 'found' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');

      showToast(`AI Match Complete: Found ${data.matchesFound || 0} candidate(s)!`);
      const updatedMatches = await getMatchesForFoundItem(item.id);
      setMatches(updatedMatches);
    } catch (err: any) {
      showToast('Scan error', { type: 'error', message: err.message });
    } finally {
      setScanning(false);
    }
  };

  const handleClarificationSubmit = async (match: MatchWithDetails) => {
    const answer = clarificationInputs[match.id];
    if (!answer || !answer.trim()) return;

    setClarifyingMatchId(match.id);
    try {
      const res = await fetch('/api/match/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          lostItemId: match.lost_item_id,
          foundItemId: match.found_item_id,
          clarificationAnswer: answer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Confidence updated to ${data.match.confidence_score}%!`);
      setMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, ...data.match } : m))
      );
      setClarificationInputs((prev) => ({ ...prev, [match.id]: '' }));
    } catch (err: any) {
      showToast('Clarification failed', { type: 'error', message: err.message });
    } finally {
      setClarifyingMatchId(null);
    }
  };

  const handleStatusChange = async (newStatus: FoundItemStatus) => {
    if (!item) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateFoundItemStatus(item.id, newStatus);
      setItem({ ...item, status: updated.status });
      showToast(`Item status updated to ${getFoundStatusLabel(updated.status)} (${updated.status})`);
    } catch (err: any) {
      showToast('Status update failed', { type: 'error', message: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMarkReturned = async () => {
    if (!item) return;
    setUpdatingStatus(true);
    try {
      const updated = await markFoundItemReturned(item.id);
      setItem({ ...item, status: updated.status });
      showToast('Item marked as Returned to Owner', { message: 'Removed from active custody board, kept in finder history. Related matches resolved.' });
      setConfirmReturnedOpen(false);
    } catch (err: any) {
      showToast('Action failed', { type: 'error', message: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleArchive = async () => {
    if (!item) return;
    setUpdatingStatus(true);
    try {
      const updated = await archiveFoundItem(item.id);
      setItem({ ...item, status: updated.status });
      showToast('Entry archived', { message: 'Hidden from active board, kept in history.' });
      setConfirmArchiveOpen(false);
    } catch (err: any) {
      showToast('Archive failed', { type: 'error', message: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setUpdatingStatus(true);
    try {
      await deleteFoundItem(item.id);
      showToast('Entry deleted permanently');
      setConfirmDeleteOpen(false);
      router.push('/profile');
    } catch (err: any) {
      showToast('Delete failed', { type: 'error', message: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading custody log and item details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Found Item Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested found property entry could not be located.
        </p>
        <Link
          href="/found-items"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
        >
          Return to Found Directory
        </Link>
      </div>
    );
  }

  const isFinderOrStaff = user?.id === item.finder_id || user?.role === 'staff' || user?.role === 'admin';
  const hasUserClaimed = claims.some((c) => c.claimant_id === user?.id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/found-items"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Found Directory
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {scanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scanning for Matches...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Scan for Lost Reports
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Entry
          </button>
        </div>
      </div>

      {/* Main Grid: Images + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Photos & Custody Badge (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center">
            {activeImage ? (
              <img
                src={activeImage}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                <Tag className="w-12 h-12 opacity-40" />
                <span className="text-xs uppercase tracking-wider font-semibold opacity-40">
                  No Photo Attached
                </span>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-4 left-4">
              <StatusBadge status={item.status} size="lg" />
            </div>

            {/* Custody Tag */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-lg flex items-center gap-2.5 text-xs text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                  Current Custody
                </span>
                <span className="font-semibold text-slate-100 truncate block">
                  {item.current_storage_location}
                </span>
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          {item.image_urls && item.image_urls.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {item.image_urls.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(url)}
                  className={`aspect-square rounded-xl overflow-hidden border transition-all ${
                    activeImage === url
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Finder Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Turned In By
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                {item.users?.full_name?.charAt(0) || <User className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-100 truncate">
                  {item.users?.full_name || 'Campus Good Samaritan'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {item.users?.department || 'Campus Community'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowContactModal(true)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4 text-blue-400" />
              Contact Finder / Custodian
            </button>
          </div>
        </div>

        {/* Right Column: Metadata, Description & Claim CTA (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Title & Category */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {item.category}
              </span>
              <span className="text-xs text-slate-400">
                Logged {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              {item.title}
            </h1>
          </div>

          {/* Description */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Item Details & Condition
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
          </div>

          {/* Discovery Location & Date Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Where Found
                </span>
                <p className="text-sm font-semibold text-slate-100 mt-0.5">{item.location_found}</p>
                {item.building && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.building} {item.room_or_area ? `• ${item.room_or_area}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Date Found
                </span>
                <p className="text-sm font-semibold text-slate-100 mt-0.5">
                  {new Date(item.date_found).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Claim This Item Action Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-indigo-400" />
                  Is This Your Missing Property?
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Submit a verified ownership claim. Provide unique identifiers (serial number, passcode hint, secret engraving, contents) that only the real owner knows.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {hasUserClaimed ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  You have an active claim pending for this item
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClaimModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center gap-2"
                >
                  <FileCheck2 className="w-4 h-4" />
                  Submit Ownership Claim
                </button>
              )}

              <Link
                href="/claims"
                className="px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all"
              >
                Track Claims
              </Link>
            </div>
          </div>

          {/* Finder / Staff Controls - PROPER LIFECYCLE */}
          {isFinderOrStaff && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Finder / Custodian Controls
                </span>
                <span className="text-[11px] text-slate-300 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-700">
                  Current: <strong className="text-white">{getFoundStatusLabel(item.status)}</strong> ({item.status})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                <strong className="text-slate-300">Lifecycle:</strong> In Custody → Potential Match → Claimed → Returned → Archived. Returned/Disposed items are hidden from active custody board, preserved in your profile history.
              </div>
              <div className="grid grid-cols-2 sm:flex flex-wrap gap-2">
                {item.status !== 'returned' && item.status !== 'disposed' && (
                  <Link href={`/found-items/${item.id}/edit`} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Entry
                  </Link>
                )}
                {/* Mark Returned - primary success action */}
                {item.status === 'claimed' && (
                  <button onClick={() => setConfirmReturnedOpen(true)} disabled={updatingStatus} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow disabled:opacity-40">
                    <CheckCircle className="w-3.5 h-3.5" /> Mark as Returned to Owner
                  </button>
                )}
                {item.status !== 'returned' && item.status !== 'disposed' && (
                  <>
                    <button disabled={updatingStatus || item.status === 'found'} onClick={() => handleStatusChange('found')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 disabled:opacity-40">
                      In Custody (Found)
                    </button>
                    <button onClick={() => setConfirmArchiveOpen(true)} disabled={updatingStatus} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 disabled:opacity-40">
                      <Archive className="w-3.5 h-3.5" /> Archive / Dispose
                    </button>
                    <button onClick={() => setConfirmDeleteOpen(true)} disabled={updatingStatus} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/40 disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Entry
                    </button>
                  </>
                )}
                {item.status === 'found' && (
                  <button disabled={updatingStatus} onClick={() => handleStatusChange('matched')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 disabled:opacity-40">
                    Mark as Matched
                  </button>
                )}
                {item.status === 'matched' && (
                  <button disabled={updatingStatus} onClick={() => handleStatusChange('claimed')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 disabled:opacity-40">
                    Mark Claimed
                  </button>
                )}
              </div>
              {(item.status === 'returned' || item.status === 'disposed') && (
                <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> This entry is {item.status === 'returned' ? 'Returned & Archived' : 'Archived/Disposed'}. Hidden from active directory, visible in profile history.
                </div>
              )}
            </div>
          )}

          <ConfirmDialog isOpen={confirmReturnedOpen} onClose={() => setConfirmReturnedOpen(false)} onConfirm={handleMarkReturned} title="Mark Item as Returned to Owner?" message="This will set custody status to RETURNED, remove from active Found Items board, and mark related matches/claims as RESOLVED. This persists in Supabase and is shown in your returned history. Confirm handover was physically completed?" confirmLabel="Confirm Returned" variant="info" isLoading={updatingStatus} />
          <ConfirmDialog isOpen={confirmArchiveOpen} onClose={() => setConfirmArchiveOpen(false)} onConfirm={handleArchive} title="Archive / Dispose This Entry?" message="SOFT DELETE: Status will become DISPOSED, hidden from active board, kept in history. Use for items unclaimed long or after return." confirmLabel="Archive Entry" variant="warning" isLoading={updatingStatus} />
          <ConfirmDialog isOpen={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} onConfirm={handleDelete} title="Permanently Delete This Entry?" message="HARD DELETE: Record will be removed from Supabase forever. Prefer ARCHIVE to preserve history. Continue?" confirmLabel="Permanently Delete" variant="danger" isLoading={updatingStatus} />
        </div>
      </div>

      {/* Potential AI Matches Section for Found Item */}
      {matches.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">
                Matching Lost Reports ({matches.length})
              </h2>
            </div>
            <Link
              href="/matches"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              View Full Matches Board →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map((m) => {
              const parsed = parseReasoning(m.reasoning);
              const isClarifying = clarifyingMatchId === m.id;
              const clarText = clarificationInputs[m.id] || '';

              return (
                <div
                  key={m.id}
                  className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      {m.confidence_score}% Confidence Match
                    </span>
                    <StatusBadge status={m.status} size="sm" />
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="font-semibold text-slate-300 block">Gemini Reasoning:</span>
                    <ul className="space-y-1 text-slate-300">
                      {parsed.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {parsed.followUpQuestion && (
                    <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2">
                      <p className="text-xs font-semibold text-purple-300">
                        🤖 AI Clarification Question: {parsed.followUpQuestion}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Your answer..."
                          value={clarText}
                          onChange={(e) =>
                            setClarificationInputs((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                        />
                        <button
                          disabled={isClarifying || !clarText.trim()}
                          onClick={() => handleClarificationSubmit(m)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                        >
                          {isClarifying ? 'Evaluating...' : 'Re-evaluate'}
                        </button>
                      </div>
                    </div>
                  )}

                  {m.lost_items && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <span className="text-slate-400 truncate">
                        Lost Report: <strong className="text-slate-200">{m.lost_items.title}</strong>
                      </span>
                      <Link
                        href={`/lost-items/${m.lost_item_id}`}
                        className="text-indigo-400 hover:underline font-semibold shrink-0"
                      >
                        View Report →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Claims on this Item (Visible to Finder / Staff) */}
      {isFinderOrStaff && claims.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-400" />
              Ownership Claims on this Item ({claims.length})
            </h2>
            <Link href="/claims" className="text-xs font-semibold text-indigo-400 hover:underline">
              Go to Claims Management →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-100">
                    Claimant: {claim.claimant?.full_name}
                  </span>
                  <StatusBadge status={claim.status} size="sm" />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {claim.proof_description}
                </p>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>{claim.claimant?.department} • {claim.claimant?.student_id}</span>
                  <span>{new Date(claim.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Claim Submission Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 text-slate-100 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-indigo-400" />
                  Claim Ownership
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Item: {item.title}</p>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Proof of Ownership Details <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide private specifics that verify your ownership: lock screen wallpaper details, serial number, stickers, internal contents, purchase receipts, or scratches..."
                  value={claimProof}
                  onChange={(e) => setClaimProof(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <ImageUploader
                images={claimImages}
                onChange={setClaimImages}
                maxImages={2}
                label="Supporting Proof Photos (Optional)"
                helperText="Upload purchase receipt, old photo with item, or matching serial number screenshot."
              />

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingClaim ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Verification Claim'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finder Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-slate-100 space-y-5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Finder & Custody Contact
            </h3>
            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Finder:</span>
                <span className="font-semibold text-slate-200">{item.users?.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Custody Location:</span>
                <span className="font-semibold text-blue-400">{item.current_storage_location}</span>
              </div>
              {item.finder_contact_info && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Direct Contact:</span>
                  <span className="font-semibold text-slate-200">{item.finder_contact_info}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
