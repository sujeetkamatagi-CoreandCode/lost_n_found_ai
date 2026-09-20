'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Search,
  PlusCircle,
  Sparkles,
  FileCheck2,
  User,
  Menu,
  X,
  ShieldAlert,
  ChevronDown,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import AuthModal from './AuthModal';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isDemoMode, isAuthenticated, loading, signOut } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', href: '/' },
    { name: 'Lost Items', href: '/lost-items' },
    { name: 'Found Items', href: '/found-items' },
    {
      name: 'Matches',
      href: '/matches',
      badge: 'AI',
    },
    { name: 'Claims', href: '/claims' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-indigo-400 group-hover:rotate-45 transition-transform duration-500" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                CampusFound
                <span className="text-[10px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  AI
                </span>
              </span>
              <p className="text-[10px] text-slate-400 tracking-wider font-medium hidden sm:block">
                Lost & Found Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-2xl border border-slate-800/60">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {link.name}
                  {link.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-xs">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs & User Menu */}
          <div className="flex items-center gap-2.5">
            {/* Report Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/report-lost"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Report Lost
              </Link>
              <Link
                href="/report-found"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Report Found
              </Link>
            </div>

            {/* User Profile / Switcher - POLISHED */}
            <div className="flex items-center gap-1.5">
              {loading ? (
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 text-slate-200 transition-all text-xs group"
                    title="Click to switch demo persona or sign in"
                  >
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-6 h-6 rounded-full object-cover border border-slate-700 group-hover:border-indigo-500/50"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {user?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="font-semibold leading-none truncate max-w-[90px] flex items-center gap-1">
                        {user?.full_name?.split(' ')[0]}
                        {isDemoMode && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Demo mode" />}
                      </span>
                      <span className="text-[10px] capitalize leading-tight flex items-center gap-1">
                        <span className={isDemoMode ? 'text-amber-400 font-bold' : isAuthenticated ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {isDemoMode ? 'Demo • Click to switch' : isAuthenticated ? '● Auth' : user?.role}
                        </span>
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block group-hover:text-indigo-400" />
                  </button>

                  <Link
                    href="/profile"
                    className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                      isActive('/profile')
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                    title="My Profile & Activity"
                  >
                    <User className="w-4 h-4" />
                  </Link>

                  {/* Auth actions */}
                  {isAuthenticated || !isDemoMode ? (
                    <button
                      onClick={signOut}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                      title="Sign out"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  ) : (
                    <div className="hidden sm:flex items-center gap-1">
                      <Link
                        href="/login"
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <LogIn className="w-3.5 h-3.5" /> Sign In
                      </Link>
                      <Link
                        href="/signup"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-800">
              <Link
                href="/report-lost"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30"
              >
                <PlusCircle className="w-4 h-4" />
                Report Lost
              </Link>
              <Link
                href="/report-found"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30"
              >
                <PlusCircle className="w-4 h-4" />
                Report Found
              </Link>
            </div>

            {/* Mobile demo / auth quick switch */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Current: {user?.full_name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${isDemoMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{isDemoMode ? 'Demo' : 'Auth'}</span>
              </div>
              <button onClick={() => { setIsAuthOpen(true); setIsMobileMenuOpen(false); }} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">Switch Persona / Sign In</button>
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex-1 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold text-center border border-slate-700">Sign In</Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold text-center">Sign Up</Link>
              </div>
            </div>

            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                    isActive(link.href)
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Auth / Persona switcher modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
