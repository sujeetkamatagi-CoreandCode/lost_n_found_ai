'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  PackageSearch,
  Filter,
  Layers,
  MapPin,
  Calendar,
  Loader2,
  Tag,
  AlertCircle,
  HelpCircle,
  Send,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getHighConfidenceMatches, updateMatchStatus } from '@/lib/api/matches';
import { MatchWithDetails, MatchStatus } from '@/lib/database.types';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import StatusBadge from '@/components/StatusBadge';

interface ParsedReasoning {
  summary: string;
  reasons: string[];
  uncertainties: string[];
  missingInformation: string[];
  followUpQuestion?: string;
  recommendedAction?: string;
  clarificationIncorporated?: string;
}

function parseReasoningPayload(raw: string): ParsedReasoning {
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
        clarificationIncorporated: parsed.clarificationIncorporated || undefined,
      };
    }
  } catch {
    // If raw string
  }
  return {
    summary: raw,
    reasons: [raw],
    uncertainties: [],
    missingInformation: [],
    followUpQuestion: undefined,
    recommendedAction: undefined,
  };
}

export default function MatchesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingMatchId, setProcessingMatchId] = useState<string | null>(null);

  // Clarification state per match
  const [clarificationInputs, setClarificationInputs] = useState<Record<string, string>>({});
  const [clarifyingMatchId, setClarifyingMatchId] = useState<string | null>(null);

  // Campus scan state
  const [isScanningCampus, setIsScanningCampus] = useState(false);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await getHighConfidenceMatches(
        minConfidence,
        statusFilter !== 'all' ? (statusFilter as MatchStatus) : undefined
      );
      // Hide resolved/rejected from main active view unless explicitly filtered
      // Resolved matches persist in Profile → Resolved History, not in active board
      let filtered = data;
      if (statusFilter === 'all') {
        filtered = data.filter((m) => m.status === 'pending' || m.status === 'verified');
      }
      setMatches(filtered);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [minConfidence, statusFilter]);

  const handleUpdateStatus = async (matchId: string, newStatus: MatchStatus) => {
    if (!user) {
      showToast('Sign in required', { type: 'error', message: 'Please sign in to verify matches.' });
      return;
    }

    setProcessingMatchId(matchId);
    try {
      const updated = await updateMatchStatus(matchId, newStatus, user.id);
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: updated.status } : m))
      );
      showToast(`Match marked as ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      showToast('Action failed', { type: 'error', message: err.message });
    } finally {
      setProcessingMatchId(null);
    }
  };

  const handleClarificationSubmit = async (match: MatchWithDetails) => {
    const answer = clarificationInputs[match.id];
    if (!answer || !answer.trim()) {
      showToast('Please enter an answer to clarify the match', { type: 'error' });
      return;
    }

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
      if (!res.ok) throw new Error(data.error || 'Failed to re-evaluate match');

      showToast(`Re-evaluation Complete: Score is now ${data.match.confidence_score}%!`, {
        message: 'Gemini incorporated your additional details into the confidence model.',
      });

      setMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, ...data.match } : m))
      );

      // Clear input
      setClarificationInputs((prev) => ({ ...prev, [match.id]: '' }));
    } catch (err: any) {
      showToast('Clarification failed', { type: 'error', message: err.message });
    } finally {
      setClarifyingMatchId(null);
    }
  };

  const handleRunCampusScan = async () => {
    setIsScanningCampus(true);
    try {
      const res = await fetch('/api/match/scan-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');

      showToast(`Campus Scan Complete: ${data.matchesGenerated || 0} match candidate(s) processed!`);
      fetchMatches();
    } catch (err: any) {
      showToast('Scan error', { type: 'error', message: err.message });
    } finally {
      setIsScanningCampus(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 70) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
    if (score >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Potential Matches Intelligence Board
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Agentic Gemini multimodal reasoning correlating lost reports with custody logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunCampusScan}
            disabled={isScanningCampus}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
          >
            {isScanningCampus ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scanning Campus...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Run Instant Campus AI Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {/* Confidence threshold tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setMinConfidence(0)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              minConfidence === 0
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Matches
          </button>
          <button
            onClick={() => setMinConfidence(70)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              minConfidence === 70
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔥 High Confidence (&gt;= 70%)
          </button>
          <button
            onClick={() => setMinConfidence(85)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              minConfidence === 85
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⭐ Top Matches (&gt;= 85%)
          </button>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Verification</option>
            <option value="verified">Verified Matches</option>
            <option value="resolved">Resolved / Claimed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && matches.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl bg-slate-900/30 border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Match Candidates Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Run a campus AI scan or report new items to correlate open loss reports with custody logs.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleRunCampusScan}
              disabled={isScanningCampus}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
            >
              Scan Campus Database Now
            </button>
            <Link
              href="/report-lost"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
            >
              Report Lost Item
            </Link>
          </div>
        </div>
      )}

      {/* Match Cards List */}
      {!loading && matches.length > 0 && (
        <div className="space-y-8">
          {matches.map((match) => {
            const lost = match.lost_items;
            const found = match.found_items;
            const isProcessing = processingMatchId === match.id;
            const isClarifying = clarifyingMatchId === match.id;
            const parsed = parseReasoningPayload(match.reasoning);
            const userClarificationText = clarificationInputs[match.id] || '';

            return (
              <div
                key={match.id}
                className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 backdrop-blur-xl shadow-xl space-y-6 transition-all"
              >
                {/* Card Top: Confidence & Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold border shadow-sm ${getConfidenceColor(
                        match.confidence_score
                      )}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{match.confidence_score}% Gemini Match Confidence</span>
                    </div>
                    <StatusBadge status={match.status} size="sm" />
                  </div>

                  <span className="text-xs text-slate-400">
                    Correlated on {new Date(match.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Side-by-Side Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Lost Item */}
                  <div className="p-5 rounded-2xl bg-amber-950/10 border border-amber-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        Lost Item Report
                      </span>
                      {lost && (
                        <Link
                          href={`/lost-items/${lost.id}`}
                          className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
                        >
                          View Full Report <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    {lost ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          {lost.image_urls && lost.image_urls.length > 0 ? (
                            <img
                              src={lost.image_urls[0]}
                              alt={lost.title}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                              <Tag className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-sm text-slate-100">{lost.title}</h4>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {lost.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-amber-500/15 grid grid-cols-2 gap-2 text-xs text-slate-300">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{lost.location_lost}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{new Date(lost.date_lost).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Lost item details unavailable.</p>
                    )}
                  </div>

                  {/* Right: Found Item */}
                  <div className="p-5 rounded-2xl bg-blue-950/10 border border-blue-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                        Found Property In Custody
                      </span>
                      {found && (
                        <Link
                          href={`/found-items/${found.id}`}
                          className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
                        >
                          View Custody Log <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    {found ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          {found.image_urls && found.image_urls.length > 0 ? (
                            <img
                              src={found.image_urls[0]}
                              alt={found.title}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                              <Tag className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-sm text-slate-100">{found.title}</h4>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {found.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-blue-500/15 grid grid-cols-2 gap-2 text-xs text-slate-300">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">{found.location_found}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{new Date(found.date_found).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Found item details unavailable.</p>
                    )}
                  </div>
                </div>

                {/* Gemini AI Reasoning & Evidence Breakdown */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gemini Match Reasoning & Evidence
                    </span>
                    {parsed.recommendedAction && (
                      <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Recommendation: {parsed.recommendedAction}
                      </span>
                    )}
                  </div>

                  {/* Reasons list */}
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {parsed.reasons.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Uncertainties & Missing Information Banners */}
                  {(parsed.uncertainties.length > 0 || parsed.missingInformation.length > 0) && (
                    <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {parsed.uncertainties.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-1">
                          <span className="font-semibold text-amber-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Identified Uncertainties
                          </span>
                          <ul className="space-y-1 text-slate-300">
                            {parsed.uncertainties.map((u, i) => (
                              <li key={i}>• {u}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {parsed.missingInformation.length > 0 && (
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-1">
                          <span className="font-semibold text-indigo-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Missing Information to Confirm
                          </span>
                          <ul className="space-y-1 text-slate-300">
                            {parsed.missingInformation.map((m, i) => (
                              <li key={i}>• {m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {parsed.clarificationIncorporated && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>User Clarification Incorporated:</strong> &quot;{parsed.clarificationIncorporated}&quot;
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Agentic Follow-up Clarification Box */}
                {(parsed.followUpQuestion || match.confidence_score < 80) && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-purple-500/30 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-purple-300 uppercase tracking-wider">
                          Gemini Agent Follow-Up Clarification
                        </h4>
                        <p className="text-xs font-semibold text-slate-100 mt-1">
                          {parsed.followUpQuestion ||
                            'Can you provide specific distinctive markings, serial numbers, case details, or sticker descriptions to confirm this match?'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Type your answer or distinctive details here (e.g. 'Yes, has a black case with CS major sticker')..."
                        value={userClarificationText}
                        onChange={(e) =>
                          setClarificationInputs((prev) => ({
                            ...prev,
                            [match.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleClarificationSubmit(match);
                        }}
                        className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        disabled={isClarifying || !userClarificationText.trim()}
                        onClick={() => handleClarificationSubmit(match)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 shrink-0"
                      >
                        {isClarifying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Re-evaluating with Gemini...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Re-evaluate with Gemini
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {found && (
                      <Link
                        href={`/found-items/${found.id}`}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Initiate Ownership Claim
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={isProcessing || match.status === 'verified'}
                      onClick={() => handleUpdateStatus(match.id, 'verified')}
                      className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verify Match
                    </button>
                    <button
                      disabled={isProcessing || match.status === 'rejected'}
                      onClick={() => handleUpdateStatus(match.id, 'rejected')}
                      className="px-3.5 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
