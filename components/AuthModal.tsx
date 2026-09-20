'use client';

import React, { useState } from 'react';
import { X, Sparkles, Mail, Lock, User as UserIcon, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth, DEMO_USERS } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user, isDemoMode, isAuthenticated, switchDemoUser, signIn, signUp, signOut } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'demo' | 'login' | 'signup'>('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      showToast('Welcome back!', { message: 'Successfully signed in. Session persisted.' });
      onClose();
    } catch (err: any) {
      showToast('Sign in failed', { type: 'error', message: err.message || 'Please check your credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, fullName, 'student');
      showToast('Account created!', { message: 'Welcome aboard. You are now signed in.' });
      onClose();
    } catch (err: any) {
      showToast('Sign up failed', { type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 text-slate-100 overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Campus User Account
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Access lost item recovery, submit claims, & match intelligence
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switcher Tabs */}
        <div className="flex gap-2 p-1 bg-slate-950/80 rounded-xl my-5 border border-slate-800/80">
          <button
            type="button"
            onClick={() => setTab('demo')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'demo'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Quick Demo Personas
          </button>
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signup'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Session banner */}
        {isAuthenticated && !isDemoMode && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-emerald-300 font-bold">● Authenticated</span>
              <span className="text-slate-300 ml-2">{user?.email}</span>
            </div>
            <button
              onClick={async () => {
                await signOut();
                showToast('Signed out', { message: 'Session cleared, switched to demo.' });
                onClose();
              }}
              className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold"
            >
              Logout
            </button>
          </div>
        )}

        {/* Demo Personas Tab - POLISHED */}
        {tab === 'demo' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5"/> Demo Mode - Instant Switch, No Password Needed</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Click any persona below to immediately become that user. Your reports, claims, and matches will filter to that persona. Great for testing student vs staff flows in the hackathon demo.</p>
            </div>
            <div className="space-y-2.5">
              {DEMO_USERS.map((demoUser, idx) => {
                const isSelected = user?.id === demoUser.id;
                return (
                  <div
                    key={demoUser.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-500/30'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={demoUser.avatar_url!}
                        alt={demoUser.full_name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-100">
                            {demoUser.full_name}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              demoUser.role === 'staff'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {demoUser.role}
                          </span>
                          {isSelected && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {demoUser.department} • {demoUser.student_id}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{demoUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle className="w-4 h-4"/> Active</span>
                      ) : (
                        <button
                          onClick={() => {
                            switchDemoUser(idx);
                            showToast(`Switched to ${demoUser.full_name}`, {
                              message: `Active role: ${demoUser.role.toUpperCase()} - demo data now filtered`,
                            });
                            // Keep modal open for 1.5s to show feedback, then close
                            setTimeout(() => onClose(), 600);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                <strong className="text-slate-300">Tip:</strong> After switching, visit <span className="text-indigo-400">Profile → My Activity</span> to see that persona's reports. Or use <span className="text-indigo-400 font-semibold">Sign In / Sign Up</span> tabs for real Supabase Auth with session persistence (persists after refresh).
              </p>
            </div>
          </div>
        )}

        {/* Supabase Email/Password Login */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Campus Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="student@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
            >
              {loading ? 'Authenticating...' : 'Sign In with Supabase'}
            </button>
          </form>
        )}

        {/* Supabase Email/Password SignUp */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Taylor Swift"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Campus Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="student@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
            >
              {loading ? 'Creating Account...' : 'Register Student Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
