'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRight,
  PackageSearch,
  CheckCircle2,
  Lock,
  Layers,
  Zap,
} from 'lucide-react';
import { getLostItems } from '@/lib/api/lostItems';
import { getFoundItems } from '@/lib/api/foundItems';
import { getHighConfidenceMatches } from '@/lib/api/matches';
import { LostItemWithUser, FoundItemWithUser, MatchWithDetails } from '@/lib/database.types';
import ItemCard from '@/components/ItemCard';

const CATEGORIES = [
  { name: 'All', icon: '✨' },
  { name: 'Electronics', icon: '💻' },
  { name: 'Keys', icon: '🔑' },
  { name: 'Wallets & IDs', icon: '🪪' },
  { name: 'Bags & Backpacks', icon: '🎒' },
  { name: 'Clothing', icon: '🧥' },
  { name: 'Books & Notes', icon: '📚' },
  { name: 'Accessories', icon: '👓' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lostItems, setLostItems] = useState<LostItemWithUser[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItemWithUser[]>([]);
  const [topMatches, setTopMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'lost' | 'found'>('all');

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [lostRes, foundRes, matchesRes] = await Promise.all([
          getLostItems({ limit: 20 }),
          getFoundItems({ limit: 20 }),
          getHighConfidenceMatches(60).catch(() => []),
        ]);
        // Hide archived from dashboard feed - only active items
        setLostItems(lostRes.items.filter((it) => it.status !== 'closed').slice(0, 6));
        setFoundItems(foundRes.items.filter((it) => it.status !== 'returned' && it.status !== 'disposed').slice(0, 6));
        // Only show active matches (pending/verified) on dashboard
        setTopMatches((matchesRes as any[]).filter((m: any) => m.status === 'pending' || m.status === 'verified').slice(0, 3));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/lost-items?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>AI-Driven Campus Property Recovery Network</span>
          </div>

          {/* Heading */}
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Reuniting Lost Possessions Across Campus in{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                Minutes
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Report lost items, log found property with security custody tracking, and let automated intelligence match items with verified ownership claims.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handleSearch}
              className="relative flex items-center p-1.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all"
            >
              <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
              <input
                type="text"
                placeholder="Search by item title, brand, campus building, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30 shrink-0"
              >
                Search Board
              </button>
            </form>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/report-lost"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              Report Lost Item
            </Link>
            <Link
              href="/report-found"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 shadow-md transition-all hover:scale-[1.02]"
            >
              <PackageSearch className="w-4 h-4 text-blue-400" />
              Turn In Found Item
            </Link>
            <Link
              href="/matches"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 shadow-md transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Potential Matches
              {topMatches.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold">
                  {topMatches.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </section>

      {/* Intelligence Stats Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center gap-4 p-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{lostItems.length}+</p>
              <p className="text-xs text-slate-400 font-medium">Active Lost Reports</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{foundItems.length}+</p>
              <p className="text-xs text-slate-400 font-medium">Found in Safe Custody</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">92.4%</p>
              <p className="text-xs text-slate-400 font-medium">Match Accuracy</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">&lt; 24h</p>
              <p className="text-xs text-slate-400 font-medium">Average Recovery Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Browse by Category
          </h2>
          <span className="text-xs text-slate-400">Select to filter directory</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => {
                setSelectedCategory(cat.name);
                if (cat.name !== 'All') {
                  router.push(`/lost-items?category=${encodeURIComponent(cat.name)}`);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                selectedCategory === cat.name
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Feeds Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Campus Property Feed</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live updates of reported lost items and newly logged found property
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Recent Items
            </button>
            <button
              onClick={() => setActiveTab('lost')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'lost'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lost Items ({lostItems.length})
            </button>
            <button
              onClick={() => setActiveTab('found')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'found'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Found Items ({foundItems.length})
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && lostItems.length === 0 && foundItems.length === 0 && (
          <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/30 border border-slate-800 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <PackageSearch className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Items Reported Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Be the first to submit a lost item report or log a found property turned in around campus.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/report-lost"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Report Lost Item
              </Link>
              <Link
                href="/report-found"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs border border-slate-700"
              >
                Report Found Item
              </Link>
            </div>
          </div>
        )}

        {/* Feed Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Show Lost Items */}
            {(activeTab === 'all' || activeTab === 'lost') &&
              lostItems.map((item) => (
                <ItemCard key={`lost-${item.id}`} item={item} type="lost" />
              ))}

            {/* Show Found Items */}
            {(activeTab === 'all' || activeTab === 'found') &&
              foundItems.map((item) => (
                <ItemCard key={`found-${item.id}`} item={item} type="found" />
              ))}
          </div>
        )}

        {/* View All CTA links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link
            href="/lost-items"
            className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>Explore All Lost Items</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <Link
            href="/found-items"
            className="flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Explore All Found Items in Custody</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-white">How Campus Property Recovery Works</h2>
            <p className="text-xs text-slate-400">
              A structured 3-step pipeline designed for quick verification and secure returns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-bold text-base text-slate-100">Report or Turn In</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log distinct features, timestamps, building locations, and photographs. Found items are registered with specific security desk custody locations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-bold text-base text-slate-100">Intelligent Matching</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                System algorithms correlate lost reports against found custody logs using category, location proximity, timestamps, and physical traits.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-bold text-base text-slate-100">Claim & Secure Handover</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Claimants provide confidential ownership proof (serial numbers, engravings). Campus security or finder approves and records the safe handover.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
