'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  PlusCircle,
  Tag,
  Building2,
  PackageSearch,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { getLostItems } from '@/lib/api/lostItems';
import { LostItemWithUser, LostItemStatus } from '@/lib/database.types';
import ItemCard from '@/components/ItemCard';

const CATEGORIES = [
  'All',
  'Electronics',
  'Keys',
  'Wallets & IDs',
  'Bags & Backpacks',
  'Clothing',
  'Books & Notes',
  'Jewelry & Accessories',
  'Sports Equipment',
  'Other',
];

const BUILDINGS = [
  'All Buildings',
  'Main Library (William Knox Hall)',
  'Student Union Center',
  'Engineering & Sciences Complex',
  'Humanities & Arts Building',
  'Business & Economics Hall',
  'Campus Recreation & Athletic Center',
  'Dining Commons',
  'North Residence Quad',
  'South Residence Village',
  'Campus Green / Central Lawn',
  'Parking Structure A / B / C',
];

function LostItemsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';
  const initialSearch = searchParams.get('search') || '';

  const [items, setItems] = useState<LostItemWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(initialCategory);
  const [building, setBuilding] = useState('All Buildings');
  const [status, setStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getLostItems({
        category: category !== 'All' ? category : undefined,
        building: building !== 'All Buildings' ? building : undefined,
        status: status !== 'all' ? (status as LostItemStatus) : undefined,
        searchQuery: searchQuery.trim() || undefined,
        limit: 100,
      });
      // Hide archived (closed) from main active board unless explicitly filtered to 'closed'
      // This implements soft-delete / archive visibility: closed items live in Profile history, not main board
      let filtered = res.items;
      if (status === 'all') {
        filtered = filtered.filter((it) => it.status !== 'closed');
      }
      setItems(filtered);
    } catch (err) {
      console.error('Error fetching lost items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category, building, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleReset = () => {
    setCategory('All');
    setBuilding('All Buildings');
    setStatus('all');
    setSearchQuery('');
    setTimeout(fetchItems, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm">
              🔍
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Lost Items Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Browse active lost item reports across campus or submit your own missing property claim.
          </p>
        </div>

        <Link
          href="/report-lost"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Report Lost Item
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title, distinctive brand, color, location details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all shrink-0"
          >
            Search
          </button>
        </form>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Campus Location / Building
            </label>
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {BUILDINGS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Report Status
            </label>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Active Only (Hide Archived)</option>
                <option value="lost">Lost (Unclaimed)</option>
                <option value="matched">Matched by AI</option>
                <option value="claimed">Claimed</option>
                <option value="closed">Closed / Archived</option>
              </select>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            {status === 'all' && (
              <p className="text-[10px] text-slate-500 mt-1">Archived (Closed) reports are hidden here; view in Profile → Resolved History or select &quot;Closed&quot;.</p>
            )}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Showing <strong className="text-slate-200">{items.length}</strong> lost item reports
        </span>
        {category !== 'All' && (
          <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
            Category: {category}
          </span>
        )}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl bg-slate-900/30 border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <PackageSearch className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Matching Lost Items</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search terms or filters, or file a report for your lost property.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
            >
              Clear Filters
            </button>
            <Link
              href="/report-lost"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
            >
              File a Lost Report
            </Link>
          </div>
        </div>
      )}

      {/* Items Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} type="lost" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LostItemsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
          Loading Lost Directory...
        </div>
      }
    >
      <LostItemsContent />
    </Suspense>
  );
}
