'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Shield,
  Edit3,
  CheckCircle2,
  PackageSearch,
  FileCheck2,
  PlusCircle,
  Loader2,
  Sparkles,
  Save,
  X,
  Trash2,
  Archive,
  MapPin,
  Calendar,
  Gift,
  History,
  Layers,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import { useAuth, DEMO_USERS } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { getUserLostItems, deleteLostItem, archiveLostItem } from '@/lib/api/lostItems';
import { getUserFoundItems, deleteFoundItem, archiveFoundItem } from '@/lib/api/foundItems';
import { getUserClaims, confirmItemReceived } from '@/lib/api/claims';
import { getMatchesForLostItem, getMatchesForFoundItem } from '@/lib/api/matches';
import { updateUserProfile } from '@/lib/api/users';
import {
  LostItem,
  FoundItem,
  ClaimWithDetails,
  MatchWithDetails,
} from '@/lib/database.types';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getLostStatusLabel, getFoundStatusLabel } from '@/lib/lifecycle';

export default function ProfilePage() {
  const { user, isDemoMode, isAuthenticated, switchDemoUser, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'claims' | 'matches' | 'history'>('lost');
  const [lostReports, setLostReports] = useState<LostItem[]>([]);
  const [foundReports, setFoundReports] = useState<FoundItem[]>([]);
  const [claimsList, setClaimsList] = useState<ClaimWithDetails[]>([]);
  const [matchesList, setMatchesList] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm dialog state
  const [confirmDeleteLostId, setConfirmDeleteLostId] = useState<string | null>(null);
  const [confirmArchiveLostId, setConfirmArchiveLostId] = useState<string | null>(null);
  const [confirmDeleteFoundId, setConfirmDeleteFoundId] = useState<string | null>(null);
  const [confirmArchiveFoundId, setConfirmArchiveFoundId] = useState<string | null>(null);
  const [confirmReceivedClaimId, setConfirmReceivedClaimId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    student_id: '',
    phone: '',
    department: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        full_name: user.full_name || '',
        student_id: user.student_id || '',
        phone: user.phone || '',
        department: user.department || '',
      });
    }
  }, [user]);

  const loadUserActivity = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch each resource independently so one failure doesn't break all
      const [lostRes, foundRes, claimsRes] = await Promise.allSettled([
        getUserLostItems(user.id),
        getUserFoundItems(user.id),
        getUserClaims(user.id),
      ]);

      const lost = lostRes.status === 'fulfilled' ? lostRes.value : [];
      const found = foundRes.status === 'fulfilled' ? foundRes.value : [];
      const claims = claimsRes.status === 'fulfilled' ? claimsRes.value : [];

      if (lostRes.status === 'rejected') console.warn('Failed to load lost items for profile:', lostRes.reason);
      if (foundRes.status === 'rejected') console.warn('Failed to load found items for profile:', foundRes.reason);
      if (claimsRes.status === 'rejected') console.warn('Failed to load claims for profile:', claimsRes.reason);

      setLostReports(lost);
      setFoundReports(found);
      setClaimsList(claims);

      // Fetch matches for user's items (for Matches tab & history) - never fail the whole load
      try {
        const matchPromises: Promise<MatchWithDetails[]>[] = [];
        for (const l of lost.slice(0, 8)) {
          matchPromises.push(getMatchesForLostItem(l.id).catch(() => []));
        }
        for (const f of found.slice(0, 8)) {
          matchPromises.push(getMatchesForFoundItem(f.id).catch(() => []));
        }
        if (matchPromises.length > 0) {
          const matchResults = await Promise.all(matchPromises);
          const allMatches = matchResults.flat().filter(Boolean).sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
          const uniq = Array.from(new Map(allMatches.map((m) => [m.id, m])).values());
          setMatchesList(uniq);
        } else {
          setMatchesList([]);
        }
      } catch (matchErr) {
        console.warn('Failed to load matches for profile (non-critical):', matchErr);
        setMatchesList([]);
      }
    } catch (err: any) {
      const msg = err?.message || err?.error_description || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.warn('Error loading user profile activity (handled):', msg || err);
      // keep existing data as fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserActivity();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      if (!isDemoMode) {
        await updateUserProfile(user.id, editForm);
        await refreshProfile();
      }
      showToast('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      showToast('Update failed', { type: 'error', message: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleArchiveLost = async (id: string) => {
    setActionLoading(true);
    try {
      await archiveLostItem(id);
      setLostReports((prev) => prev.map((it) => (it.id === id ? { ...it, status: 'closed' as const } : it)));
      showToast('Report archived (soft delete)', { message: 'Hidden from active board, kept in Resolved History.' });
      setConfirmArchiveLostId(null);
    } catch (err: any) {
      showToast('Archive failed', { type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };
  const handleDeleteLost = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteLostItem(id);
      setLostReports((prev) => prev.filter((i) => i.id !== id));
      showToast('Report deleted permanently');
      setConfirmDeleteLostId(null);
    } catch (err: any) {
      showToast('Failed to delete', { type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveFound = async (id: string) => {
    setActionLoading(true);
    try {
      await archiveFoundItem(id);
      setFoundReports((prev) => prev.map((it) => (it.id === id ? { ...it, status: 'disposed' as const } : it)));
      showToast('Entry archived', { message: 'Hidden from active board, kept in history.' });
      setConfirmArchiveFoundId(null);
    } catch (err: any) {
      showToast('Archive failed', { type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };
  const handleDeleteFound = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteFoundItem(id);
      setFoundReports((prev) => prev.filter((i) => i.id !== id));
      showToast('Entry deleted');
      setConfirmDeleteFoundId(null);
    } catch (err: any) {
      showToast('Failed to delete', { type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceived = async (claimId: string) => {
    setActionLoading(true);
    try {
      await confirmItemReceived(claimId, 'Owner confirmed receipt via Profile');
      setClaimsList((prev) => prev.map((c) => (c.id === claimId ? { ...c, status: 'completed' as const } : c)));
      showToast('Confirmed! Item marked as Received & Archived', {
        message: 'Lost→Closed, Found→Returned, Match→Resolved. Removed from active boards.',
      });
      setConfirmReceivedClaimId(null);
      loadUserActivity();
    } catch (err: any) {
      showToast('Action failed', { type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <UserIcon className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Sign In Required</h2>
        <p className="text-xs text-slate-400">
          Please select a demo persona or authenticate with your campus account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Banner: Demo Persona Quick Switcher */}
      <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs text-indigo-300">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Active Persona: <strong className="text-white">{user.full_name}</strong> (
            <span className="capitalize">{user.role}</span>)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Switch Persona:</span>
          {DEMO_USERS.map((demo, idx) => (
            <button
              key={demo.id}
              onClick={() => switchDemoUser(idx)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                user.id === demo.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              {demo.full_name.split(' ')[0]} ({demo.role})
            </button>
          ))}
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={user.full_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white">{user.full_name}</h1>
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                    user.role === 'staff'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.department || 'Campus Department'} • {user.student_id || 'ID Verified'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Profile Details Grid / Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Student / Staff ID</label>
                <input
                  type="text"
                  value={editForm.student_id}
                  onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">Campus Email</span>
                <span className="text-slate-200 font-medium">{user.email}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">Phone Contact</span>
                <span className="text-slate-200 font-medium">{user.phone || 'Not provided'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">Department</span>
                <span className="text-slate-200 font-medium">{user.department || 'General Campus'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="text-lg font-bold text-amber-300">{lostReports.length}</div>
          <div className="text-[11px] text-slate-400">Lost Reports</div>
          <div className="text-[10px] text-slate-500">{lostReports.filter((r) => r.status !== 'closed').length} active • {lostReports.filter((r) => r.status === 'closed').length} resolved</div>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
          <div className="text-lg font-bold text-blue-300">{foundReports.length}</div>
          <div className="text-[11px] text-slate-400">Found Logs</div>
          <div className="text-[10px] text-slate-500">{foundReports.filter((r) => r.status !== 'returned' && r.status !== 'disposed').length} active • {foundReports.filter((r) => r.status === 'returned' || r.status === 'disposed').length} returned</div>
        </div>
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
          <div className="text-lg font-bold text-purple-300">{claimsList.length}</div>
          <div className="text-[11px] text-slate-400">Claims</div>
          <div className="text-[10px] text-slate-500">{claimsList.filter((c) => c.status === 'pending' || c.status === 'approved').length} active</div>
        </div>
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
          <div className="text-lg font-bold text-indigo-300">{matchesList.length}</div>
          <div className="text-[11px] text-slate-400">Matches</div>
          <div className="text-[10px] text-slate-500">{matchesList.filter((m) => m.status === 'pending' || m.status === 'verified').length} active</div>
        </div>
      </div>

      {/* Activity Hub Tabs */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto">
          {[
            { id: 'lost', label: `My Lost Reports (${lostReports.length})` },
            { id: 'found', label: `My Found Logs (${foundReports.length})` },
            { id: 'claims', label: `My Claims (${claimsList.length})` },
            { id: 'matches', label: `My Matches (${matchesList.length})` },
            { id: 'history', label: `Resolved History` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
            Loading your activity records...
          </div>
        )}

        {/* Tab 1: Lost Reports - with lifecycle, edit, archive, delete, dates, location, match info */}
        {!loading && activeTab === 'lost' && (
          <div className="space-y-6">
            {lostReports.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">You haven&apos;t filed any lost item reports yet.</p>
                <Link href="/report-lost" className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Report a Lost Item
                </Link>
              </div>
            ) : (
              <>
                {(() => {
                  const activeLost = lostReports.filter((r) => r.status !== 'closed');
                  const archivedLost = lostReports.filter((r) => r.status === 'closed');
                  return (
                    <>
                      {activeLost.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" /> Active Lost Reports ({activeLost.length}) - visible on board
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeLost.map((item) => (
                              <div key={item.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{item.category}</span>
                                    <StatusBadge status={item.status} size="sm" />
                                  </div>
                                  <h3 className="font-bold text-sm text-slate-100">{item.title}</h3>
                                  <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                                  <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-800/50">
                                    <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /><span className="truncate">{item.location_lost} {item.building ? `• ${item.building}` : ''}</span></div>
                                    <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>{new Date(item.date_lost).toLocaleDateString()} {item.time_lost_range ? `• ${item.time_lost_range}` : ''}</span></div>
                                    {item.reward_amount > 0 && <div className="flex items-center gap-1.5 text-emerald-400 font-semibold"><Gift className="w-3 h-3" /><span>₹{item.reward_amount} reward</span></div>}
                                    <div className="text-[10px]">Current: <strong className="text-slate-300">{getLostStatusLabel(item.status)}</strong> • Created {new Date(item.created_at).toLocaleDateString()}</div>
                                  </div>
                                </div>
                                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                                  <Link href={`/lost-items/${item.id}`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700">View →</Link>
                                  <Link href={`/lost-items/${item.id}/edit`} className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg flex items-center gap-1"><Edit3 className="w-3 h-3" />Edit</Link>
                                  <button onClick={() => setConfirmArchiveLostId(item.id)} className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1"><Archive className="w-3 h-3" />Archive</button>
                                  <button onClick={() => setConfirmDeleteLostId(item.id)} className="p-1.5 text-rose-400 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {archivedLost.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Resolved & Archived ({archivedLost.length}) - hidden from board</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {archivedLost.map((item) => (
                              <div key={item.id} className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-3 opacity-90">
                                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{item.category}</span><StatusBadge status={item.status} size="sm" /></div>
                                <h3 className="font-bold text-sm text-slate-200">{item.title}</h3>
                                <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>Archived • {new Date(item.updated_at).toLocaleDateString()}</span></div>
                                <div className="flex items-center gap-2 pt-2"><Link href={`/lost-items/${item.id}`} className="text-xs text-emerald-400 hover:underline">View History →</Link><button onClick={() => setConfirmDeleteLostId(item.id)} className="ml-auto text-rose-400 p-1"><Trash2 className="w-4 h-4" /></button></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Found Logs */}
        {!loading && activeTab === 'found' && (
          <div className="space-y-6">
            {foundReports.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">You haven&apos;t turned in or logged any found property yet.</p>
                <Link href="/report-found" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"><PlusCircle className="w-3.5 h-3.5" />Log Found Property</Link>
              </div>
            ) : (
              <>
                {(() => {
                  const activeFound = foundReports.filter((r) => r.status !== 'returned' && r.status !== 'disposed');
                  const archivedFound = foundReports.filter((r) => r.status === 'returned' || r.status === 'disposed');
                  return (
                    <>
                      {activeFound.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Active Custody ({activeFound.length})</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeFound.map((item) => (
                              <div key={item.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{item.category}</span><StatusBadge status={item.status} size="sm" /></div>
                                <h3 className="font-bold text-sm text-slate-100">{item.title}</h3>
                                <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-800/50">
                                  <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /><span>{item.location_found} {item.building ? `• ${item.building}` : ''}</span></div>
                                  <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /><span>{new Date(item.date_found).toLocaleDateString()}</span></div>
                                  <div className="text-[10px]">Custody: <span className="text-slate-300">{item.current_storage_location}</span></div>
                                  <div className="text-[10px]">Current: <strong className="text-slate-300">{getFoundStatusLabel(item.status)}</strong></div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800/80 text-xs">
                                  <Link href={`/found-items/${item.id}`} className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg border border-slate-700">View →</Link>
                                  <Link href={`/found-items/${item.id}/edit`} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg flex items-center gap-1"><Edit3 className="w-3 h-3" />Edit</Link>
                                  <button onClick={() => setConfirmArchiveFoundId(item.id)} className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1"><Archive className="w-3 h-3" />Archive</button>
                                  <button onClick={() => setConfirmDeleteFoundId(item.id)} className="p-1.5 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {archivedFound.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Returned / Archived ({archivedFound.length})</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {archivedFound.map((item) => (
                              <div key={item.id} className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2 opacity-90">
                                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{item.category}</span><StatusBadge status={item.status} size="sm" /></div>
                                <h3 className="font-bold text-sm text-slate-200">{item.title}</h3>
                                <p className="text-xs text-slate-400">{item.description.slice(0, 80)}...</p>
                                <Link href={`/found-items/${item.id}`} className="text-xs text-emerald-400 hover:underline">View History →</Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Tab 3: Submitted Claims with confirm received */}
        {!loading && activeTab === 'claims' && (
          <div className="space-y-3">
            {claimsList.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">You haven&apos;t submitted any ownership claims.</p>
                <Link href="/found-items" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs">Browse Found Directory</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {claimsList.map((claim) => (
                  <div key={claim.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-sm text-slate-100">{claim.found_items?.title || 'Found Item'}</span><StatusBadge status={claim.status} size="sm" /><span className="text-[11px] text-slate-500">Submitted {new Date(claim.created_at).toLocaleDateString()}</span></div>
                      <p className="text-xs text-slate-400 line-clamp-1">Proof: {claim.proof_description}</p>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-2"><span>Location: {claim.found_items?.current_storage_location}</span>{claim.handover_location && <span className="text-emerald-400">Handover: {claim.handover_location}</span>}</div>
                      {claim.reviewer_notes && <p className="text-[11px] text-indigo-400">Reviewer: {claim.reviewer_notes}</p>}
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <Link href="/claims" className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 text-center">View in Claims Hub</Link>
                      {claim.status === 'approved' && <button onClick={() => setConfirmReceivedClaimId(claim.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Confirm I Received My Item</button>}
                      {claim.status === 'completed' && <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Completed - Item Returned</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: My Matches */}
        {!loading && activeTab === 'matches' && (
          <div className="space-y-3">
            {matchesList.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400">No AI matches for your items yet. Run a scan from your item detail page or the Matches board.</p>
                <Link href="/matches" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Go to Matches Board</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800">AI matches correlating your lost reports with found custody logs. Verify or re-evaluate with Gemini follow-up.</div>
                {matchesList.map((m) => (
                  <div key={m.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between"><span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">{m.confidence_score}% Match</span><StatusBadge status={m.status} size="sm" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20"><div className="font-semibold text-amber-300 mb-1">Lost: {m.lost_items?.title}</div><p className="text-slate-400 line-clamp-2">{m.lost_items?.description}</p><div className="text-[11px] text-slate-500 mt-1">{m.lost_items?.location_lost}</div></div>
                      <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20"><div className="font-semibold text-blue-300 mb-1">Found: {m.found_items?.title}</div><p className="text-slate-400 line-clamp-2">{m.found_items?.description}</p><div className="text-[11px] text-slate-500 mt-1">{m.found_items?.location_found}</div></div>
                    </div>
                    <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">{(() => { try { const p = JSON.parse(m.reasoning); return (p.reasons || []).slice(0, 2).join(' • ') || p.summary || m.reasoning.slice(0, 120); } catch { return m.reasoning.slice(0, 120); }})()}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <Link href={`/lost-items/${m.lost_item_id}`} className="text-amber-400 hover:underline">View Lost →</Link>
                      <span className="text-slate-600">•</span>
                      <Link href={`/found-items/${m.found_item_id}`} className="text-blue-400 hover:underline">View Found →</Link>
                      <Link href="/matches" className="ml-auto text-indigo-400 hover:underline">Open Board →</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Resolved History */}
        {!loading && activeTab === 'history' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2"><History className="w-4 h-4 text-emerald-400" /> Resolved & Returned History</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Items that completed the full lifecycle and were archived (soft-deleted) from active boards but preserved here. Includes Lost→Closed, Found→Returned/Disposed, Claims→Completed, Matches→Resolved.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center"><div className="text-lg font-bold text-amber-300">{lostReports.filter((r) => r.status === 'closed').length}</div><div className="text-slate-400">Lost Resolved</div></div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center"><div className="text-lg font-bold text-blue-300">{foundReports.filter((r) => r.status === 'returned' || r.status === 'disposed').length}</div><div className="text-slate-400">Found Returned</div></div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center"><div className="text-lg font-bold text-emerald-300">{claimsList.filter((c) => c.status === 'completed').length + matchesList.filter((m) => m.status === 'resolved').length}</div><div className="text-slate-400">Claims & Matches Done</div></div>
              </div>
            </div>
            {(() => {
              const archivedLost = lostReports.filter((r) => r.status === 'closed');
              const archivedFound = foundReports.filter((r) => r.status === 'returned' || r.status === 'disposed');
              const resolvedClaims = claimsList.filter((c) => c.status === 'completed' || c.status === 'rejected');
              return (
                <>
                  {archivedLost.length > 0 && (
                    <div className="space-y-2"><h4 className="text-xs font-bold text-amber-400">Lost Resolved ({archivedLost.length})</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{archivedLost.map((it) => (<div key={it.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"><div><div className="font-semibold text-sm text-slate-200">{it.title}</div><div className="text-[11px] text-slate-500">{getLostStatusLabel(it.status)} • {new Date(it.date_lost).toLocaleDateString()}</div></div><Link href={`/lost-items/${it.id}`} className="text-xs text-indigo-400 hover:underline">View</Link></div>))}</div></div>
                  )}
                  {archivedFound.length > 0 && (
                    <div className="space-y-2"><h4 className="text-xs font-bold text-blue-400">Found Returned ({archivedFound.length})</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{archivedFound.map((it) => (<div key={it.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"><div><div className="font-semibold text-sm text-slate-200">{it.title}</div><div className="text-[11px] text-slate-500">{getFoundStatusLabel(it.status)} • {new Date(it.date_found).toLocaleDateString()}</div></div><Link href={`/found-items/${it.id}`} className="text-xs text-blue-400 hover:underline">View</Link></div>))}</div></div>
                  )}
                  {resolvedClaims.length > 0 && (
                    <div className="space-y-2"><h4 className="text-xs font-bold text-purple-400">Claims History ({resolvedClaims.length})</h4><div className="space-y-2">{resolvedClaims.slice(0, 6).map((c) => (<div key={c.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"><span className="text-slate-300">{c.found_items?.title}</span><StatusBadge status={c.status} size="sm" /></div>))}</div></div>
                  )}
                  {archivedLost.length === 0 && archivedFound.length === 0 && resolvedClaims.length === 0 && <div className="text-center py-8 text-xs text-slate-500">No resolved history yet. Complete a handover or archive an item to see it here.</div>}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog isOpen={!!confirmArchiveLostId} onClose={() => setConfirmArchiveLostId(null)} onConfirm={() => confirmArchiveLostId && handleArchiveLost(confirmArchiveLostId)} title="Archive (Soft Delete) This Report?" message="This will set status to CLOSED (archived). Hidden from active Lost board, kept in your Resolved History. Prefer archive over hard delete. Confirm?" confirmLabel="Archive" variant="warning" isLoading={actionLoading} />
      <ConfirmDialog isOpen={!!confirmDeleteLostId} onClose={() => setConfirmDeleteLostId(null)} onConfirm={() => confirmDeleteLostId && handleDeleteLost(confirmDeleteLostId)} title="Permanently Delete This Report?" message="HARD DELETE: This will permanently remove the record from Supabase. Only do this if you are sure. Prefer Archive to keep history. Continue?" confirmLabel="Delete Permanently" variant="danger" isLoading={actionLoading} />
      <ConfirmDialog isOpen={!!confirmArchiveFoundId} onClose={() => setConfirmArchiveFoundId(null)} onConfirm={() => confirmArchiveFoundId && handleArchiveFound(confirmArchiveFoundId)} title="Archive This Found Entry?" message="This will set status to DISPOSED (archived). Hidden from active custody board, kept in history." confirmLabel="Archive" variant="warning" isLoading={actionLoading} />
      <ConfirmDialog isOpen={!!confirmDeleteFoundId} onClose={() => setConfirmDeleteFoundId(null)} onConfirm={() => confirmDeleteFoundId && handleDeleteFound(confirmDeleteFoundId)} title="Permanently Delete This Entry?" message="HARD DELETE: Record will be permanently removed. Prefer archive. Continue?" confirmLabel="Delete" variant="danger" isLoading={actionLoading} />
      <ConfirmDialog isOpen={!!confirmReceivedClaimId} onClose={() => setConfirmReceivedClaimId(null)} onConfirm={() => confirmReceivedClaimId && handleConfirmReceived(confirmReceivedClaimId)} title="Confirm You Received Your Item?" message="This will mark the claim as COMPLETED, set your lost report to CLOSED (resolved) and the found item to RETURNED, and mark related matches as RESOLVED. The items will be removed from active boards and appear in your Resolved History. This persists in Supabase. Confirm?" confirmLabel="Yes, Confirm Received" variant="info" isLoading={actionLoading} />
    </div>
  );
}
