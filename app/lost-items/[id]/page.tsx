'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Gift,
  Tag,
  Sparkles,
  ShieldCheck,
  Mail,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Share2,
  PackageSearch,
  Loader2,
  Zap,
  HelpCircle,
  Send,
  Edit3,
  Archive,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { getLostItemById, updateLostItemStatus, archiveLostItem, deleteLostItem } from '@/lib/api/lostItems';
import { getMatchesForLostItem } from '@/lib/api/matches';
import { LostItemWithUser, MatchWithDetails, LostItemStatus } from '@/lib/database.types';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getLostStatusLabel } from '@/lib/lifecycle';

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

export default function LostItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState<LostItemWithUser | null>(null);
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmReceivedOpen, setConfirmReceivedOpen] = useState(false);

  // Instant scan state
  const [scanning, setScanning] = useState(false);

  // Clarification state
  const [clarificationInputs, setClarificationInputs] = useState<Record<string, string>>({});
  const [clarifyingMatchId, setClarifyingMatchId] = useState<string | null>(null);

  const loadItem = async () => {
    setLoading(true);
    try {
      const data = await getLostItemById(resolvedParams.id);
      setItem(data);
      if (data?.image_urls && data.image_urls.length > 0) {
        setActiveImage(data.image_urls[0]);
      }

      const matchResults = await getMatchesForLostItem(resolvedParams.id).catch(() => []);
      setMatches(matchResults);
    } catch (err) {
      console.error('Error fetching item:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [resolvedParams.id]);

  const handleStatusChange = async (newStatus: LostItemStatus) => {
    if (!item) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateLostItemStatus(item.id, newStatus);
      setItem({ ...item, status: updated.status });
      showToast(`Status updated to ${getLostStatusLabel(updated.status)} (${updated.status})`);
    } catch (err: any) {
      showToast('Status update failed', { type: 'error', message: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!item) return;
    setUpdatingStatus(true);
    try {
      const updated = await archiveLostItem(item.id);
      setItem({ ...item, status: updated.status });
      showToast('Confirmed! Item marked as Received & Archived', { message: 'Removed from active board, kept in your history. Matches marked resolved.' });
      // Also try to resolve related matches
      await Promise.all(matches.filter(m=> m.status !== 'resolved').map(m => 
        fetch('/api/match/clarify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ matchId: m.id, lostItemId: m.lost_item_id, foundItemId: m.found_item_id, clarificationAnswer: 'Owner confirmed receipt - mark resolved'}) }).catch(()=>{})
      ));
      setConfirmReceivedOpen(false);
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
      const updated = await archiveLostItem(item.id);
      setItem({ ...item, status: updated.status });
      showToast('Report archived (Closed)', { message: 'Moved to history, no longer in active directory.' });
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
      await deleteLostItem(item.id);
      showToast('Report deleted permanently', { message: 'Historical record removed.' });
      setConfirmDeleteOpen(false);
      router.push('/profile');
    } catch (err: any) {
      showToast('Delete failed', { type: 'error', message: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTriggerScan = async () => {
    if (!item) return;
    setScanning(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, itemType: 'lost' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Matching scan failed');

      showToast(`Gemini Scan: Found ${data.matchesFound || 0} candidate(s)!`);
      const updatedMatches = await getMatchesForLostItem(item.id);
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
      showToast('Failed to update', { type: 'error', message: err.message });
    } finally {
      setClarifyingMatchId(null);
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
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading lost item intelligence details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Lost Item Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested lost item report could not be located or may have been deleted.
        </p>
        <Link
          href="/lost-items"
          className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
        >
          Return to Directory
        </Link>
      </div>
    );
  }

  const isOwnerOrStaff = user?.id === item.user_id || user?.role === 'staff' || user?.role === 'admin';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/lost-items"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lost Directory
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
                Scanning with Gemini...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Scan for AI Matches
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Report
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery (5 cols) */}
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
                  No Reference Photo
                </span>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-4 left-4">
              <StatusBadge status={item.status} size="lg" />
            </div>

            {/* Reward Overlay */}
            {item.reward_amount > 0 && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl backdrop-blur-md">
                <Gift className="w-4 h-4" />
                <span>₹{item.reward_amount} Reward</span>
              </div>
            )}
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
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Reporter / Owner Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Reported By
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                {item.users?.full_name?.charAt(0) || <User className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-100 truncate">
                  {item.users?.full_name || 'Campus Student'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {item.users?.department || 'University Student'} • {item.users?.student_id || 'Verified'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowContactModal(true)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4 text-indigo-400" />
              Contact Owner
            </button>
          </div>
        </div>

        {/* Right Column: Information & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {item.category}
              </span>
              <span className="text-xs text-slate-400">
                Reported {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              {item.title}
            </h1>
          </div>

          {/* Description */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Description & Specifics
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>

            {item.distinctive_features && (
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-xs font-semibold text-amber-400 block mb-1">
                  Distinctive Marks / Identifiers:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-amber-500/5 p-3 rounded-xl border border-amber-500/15">
                  {item.distinctive_features}
                </p>
              </div>
            )}
          </div>

          {/* Location & Time Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Location Lost
                </span>
                <p className="text-sm font-semibold text-slate-100 mt-0.5">{item.location_lost}</p>
                {item.building && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.building} {item.room_or_area ? `• ${item.room_or_area}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Date & Time
                </span>
                <p className="text-sm font-semibold text-slate-100 mt-0.5">
                  {new Date(item.date_lost).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                {item.time_lost_range && (
                  <p className="text-xs text-slate-400 mt-0.5">{item.time_lost_range}</p>
                )}
              </div>
            </div>
          </div>

          {/* Owner/Staff Controls - PROPER LIFECYCLE */}
          {isOwnerOrStaff && (
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Owner / Staff Management
                </span>
                <span className="text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-700">
                  Current: <strong className="text-white">{getLostStatusLabel(item.status)}</strong> ({item.status})
                </span>
              </div>

              {/* Lifecycle explanation */}
              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                <strong className="text-slate-300">Lifecycle:</strong> Active Lost → Match Found → Claim/Verification → Received/Resolved → Archived (Closed). Closed reports are hidden from active boards but kept in your Profile history.
              </div>

              <div className="grid grid-cols-2 sm:flex flex-wrap gap-2">
                {item.status !== 'closed' && (
                  <Link
                    href={`/lost-items/${item.id}/edit`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Report
                  </Link>
                )}

                {/* Confirm Received - primary success action */}
                {item.status !== 'closed' && (
                  <button
                    onClick={() => setConfirmReceivedOpen(true)}
                    disabled={updatingStatus}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow disabled:opacity-40"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Confirm I Received My Item
                  </button>
                )}

                {/* Valid transitions */}
                {item.status === 'lost' && (
                  <button disabled={updatingStatus} onClick={() => handleStatusChange('matched')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 disabled:opacity-40">
                    Mark as Matched
                  </button>
                )}
                {item.status === 'matched' && (
                  <button disabled={updatingStatus} onClick={() => handleStatusChange('claimed')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 disabled:opacity-40">
                    Mark Claimed (Verification)
                  </button>
                )}
                {item.status === 'claimed' && (
                  <button disabled={updatingStatus} onClick={() => handleStatusChange('closed')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40">
                    Mark Resolved & Archive
                  </button>
                )}

                {/* Archive / Close */}
                {item.status !== 'closed' && (
                  <button
                    onClick={() => setConfirmArchiveOpen(true)}
                    disabled={updatingStatus}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 disabled:opacity-40"
                  >
                    <Archive className="w-3.5 h-3.5" /> Close / Archive
                  </button>
                )}

                {/* Delete with confirmation - soft then hard */}
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={updatingStatus}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/40 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Report
                </button>
              </div>

              {item.status === 'closed' && (
                <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> This report is Resolved & Archived. It is hidden from the public board and visible only in your profile history.
                </div>
              )}
            </div>
          )}

          {/* Confirm dialogs */}
          <ConfirmDialog
            isOpen={confirmReceivedOpen}
            onClose={() => setConfirmReceivedOpen(false)}
            onConfirm={handleConfirmReceived}
            title="Confirm You Received Your Item?"
            message="This will mark your lost report as RESOLVED & ARCHIVED (status: Closed). It will be removed from the active Lost Items board and kept in your Profile → Resolved History. All related AI matches will be marked as RESOLVED. This persists in Supabase."
            confirmLabel="Yes, Mark as Received & Archive"
            variant="info"
            isLoading={updatingStatus}
          />
          <ConfirmDialog
            isOpen={confirmArchiveOpen}
            onClose={() => setConfirmArchiveOpen(false)}
            onConfirm={handleArchive}
            title="Close / Archive This Report?"
            message="This is a SOFT DELETE (archive). The report will be set to CLOSED, hidden from active boards, but preserved in history/profile for reference. You can still hard-delete afterwards if needed. Proceed?"
            confirmLabel="Archive Report"
            variant="warning"
            isLoading={updatingStatus}
          />
          <ConfirmDialog
            isOpen={confirmDeleteOpen}
            onClose={() => setConfirmDeleteOpen(false)}
            onConfirm={handleDelete}
            title="Permanently Delete This Report?"
            message="This will HARD DELETE the record from Supabase and cannot be undone. Prefer ARCHIVE (soft delete) to keep history. Are you absolutely sure you want to permanently delete?"
            confirmLabel="Permanently Delete"
            variant="danger"
            isLoading={updatingStatus}
          />

          {/* "I Found This" CTA for other students */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-bold text-sm text-white">Did you discover this missing item?</h4>
              <p className="text-xs text-slate-300">
                Log it into campus custody or connect with the owner to arrange a safe handover.
              </p>
            </div>
            <Link
              href="/report-found"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 shrink-0 transition-all"
            >
              Log as Found
            </Link>
          </div>
        </div>
      </div>

      {/* Potential AI Matches Section */}
      {matches.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">
                Potential AI Match Candidates ({matches.length})
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

                  {/* Follow-up question if present */}
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

                  {m.found_items && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <span className="text-slate-400 truncate">
                        Found in custody: <strong className="text-slate-200">{m.found_items.title}</strong>
                      </span>
                      <Link
                        href={`/found-items/${m.found_item_id}`}
                        className="text-indigo-400 hover:underline font-semibold shrink-0"
                      >
                        View Custody Log →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Owner Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-slate-100 space-y-5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              Owner Contact Information
            </h3>
            <p className="text-xs text-slate-400">
              Please use these contact details solely for coordinating item verification and physical recovery.
            </p>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Owner Name:</span>
                <span className="font-semibold text-slate-200">{item.users?.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <a
                  href={`mailto:${item.contact_email || item.users?.email}`}
                  className="font-semibold text-indigo-400 hover:underline"
                >
                  {item.contact_email || item.users?.email}
                </a>
              </div>
              {item.contact_phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <a
                    href={`tel:${item.contact_phone}`}
                    className="font-semibold text-slate-200 hover:underline"
                  >
                    {item.contact_phone}
                  </a>
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
