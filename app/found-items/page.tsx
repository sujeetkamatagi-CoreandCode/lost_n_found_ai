'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  PackageSearch,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { getFoundItems } from '@/lib/api/foundItems';
import { FoundItemWithUser, FoundItemStatus } from '@/lib/database.types';
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

function FoundItemsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';
  const initialSearch = searchParams.get('search') || '';

  const [items, setItems] = useState<FoundItemWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(initialCategory);
  const [building, setBuilding] = useState('All Buildings');
  const [status, setStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getFoundItems({
        category: category !== 'All' ? category : undefined,
        building: building !== 'All Buildings' ? building : undefined,
        status: status !== 'all' ? (status as FoundItemStatus) : undefined,
        searchQuery: searchQuery.trim() || undefined,
        limit: 100,
      });
      // Hide archived (returned/disposed) from main custody board unless explicitly filtered
      let filtered = res.items;
      if (status === 'all') {
        filtered = filtered.filter((it) => it.status !== 'returned' && it.status !== 'disposed');
      }
      setItems(filtered);
    } catch (err) {
      console.error('Error fetching found items:', err);
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
            <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm">
              📦
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Found Items in Custody
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Property discovered on campus and logged with security desks or finder custody.
          </p>
        </div>

        <Link
          href="/report-found"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Log Found Property
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
              placeholder="Search by found item name, custody location, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all shrink-0"
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
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
              Building Found
            </label>
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
              Status
            </label>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Active Only (Hide Returned)</option>
                <option value="found">In Custody (Found)</option>
                <option value="matched">Matched to Report</option>
                <option value="claimed">Claim in Review</option>
                <option value="returned">Returned to Owner (Archived)</option>
                <option value="disposed">Disposed / Archived</option>
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
              <p className="text-[10px] text-slate-500 mt-1">Returned/Disposed items hidden; finder history in Profile or select Returned.</p>
            )}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Showing <strong className="text-slate-200">{items.length}</strong> items in custody
        </span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4" />
          Verified Campus Log
        </span>
      </div>

      {/* Loading Skeleton */}
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
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <PackageSearch className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Found Items Registered</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No found items currently match your query criteria.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
            >
              Clear Filters
            </button>
            <Link
              href="/report-found"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
            >
              Report a Found Item
            </Link>
          </div>
        </div>
      )}

      {/* Items Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} type="found" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FoundItemsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
          Loading Found Directory...
        </div>
      }
    >
      <FoundItemsContent />
    </Suspense>
  );
}
