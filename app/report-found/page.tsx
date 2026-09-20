'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PackageSearch,
  MapPin,
  Calendar,
  Shield,
  Phone,
  Tag,
  Loader2,
  Building2,
  HelpCircle,
} from 'lucide-react';
import { createFoundItem } from '@/lib/api/foundItems';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import ImageUploader from '@/components/ImageUploader';

const CATEGORIES = [
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

const CAMPUS_BUILDINGS = [
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
  'Other Campus Location',
];

const STORAGE_LOCATIONS = [
  'Central Security Office - Student Union Rm 104',
  'Main Library Front Circulation Desk',
  'Engineering Building Department Office (Rm 120)',
  'Athletic Center Front Reception',
  'Dining Commons Manager Desk',
  'With Finder (Personal Custody / Direct Handover)',
  'Other Campus Drop-off Location',
];

export default function ReportFoundPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electronics',
    description: '',
    location_found: '',
    building: CAMPUS_BUILDINGS[0],
    room_or_area: '',
    date_found: new Date().toISOString().split('T')[0],
    current_storage_location: STORAGE_LOCATIONS[0],
    finder_contact_info: user?.email || '',
  });
  const [images, setImages] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('Authentication required', {
        type: 'error',
        message: 'Please sign in or select a demo persona to report a found item.',
      });
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.location_found.trim()) {
      showToast('Missing required fields', {
        type: 'error',
        message: 'Please fill in the item title, description, and location found.',
      });
      return;
    }

    setLoading(true);
    try {
      const newItem = await createFoundItem({
        finder_id: user.id,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        location_found: formData.location_found.trim(),
        building: formData.building,
        room_or_area: formData.room_or_area.trim() || null,
        date_found: formData.date_found,
        image_urls: images,
        current_storage_location: formData.current_storage_location,
        finder_contact_info: formData.finder_contact_info.trim() || null,
        status: 'found',
      });

      // Automatically trigger Gemini matching against open lost reports
      try {
        const matchRes = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: newItem.id, itemType: 'found' }),
        });
        const matchJson = await matchRes.json();
        if (matchJson.matchesFound > 0) {
          showToast(`AI Match Alert: Found ${matchJson.matchesFound} possible owner(s)!`, {
            message: 'Gemini detected matching lost item reports.',
          });
        } else {
          showToast('Found item registered!', {
            message: 'Item logged in custody. Gemini is cross-referencing lost reports.',
          });
        }
      } catch (matchErr) {
        console.warn('Background match trigger notice:', matchErr);
        showToast('Found item registered!', {
          message: 'The item has been added to campus custody records.',
        });
      }

      router.push(`/found-items/${newItem.id}`);
    } catch (err: any) {
      console.error('Error reporting found item:', err);
      showToast('Failed to register found item', {
        type: 'error',
        message: err.message || 'Please check your network and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Custody & Log Report
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-lg">
            📦
          </span>
          Report a Found Item
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Log an unattended or found possession into the campus chain of custody so the rightful owner can verify and claim it.
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-8"
      >
        {/* Section 1: Item Details */}
        <div className="space-y-5">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Tag className="w-4 h-4 text-blue-400" />
            Found Item Description
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Item Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Set of 3 Dorm Keys on Red Lanyard, Black Apple AirPods Pro 2"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Date Found <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date_found}
                onChange={(e) => setFormData({ ...formData, date_found: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Detailed Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe color, general condition, physical features (keep some secret details for owner verification)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Discovery Location & Custody */}
        <div className="space-y-5">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <MapPin className="w-4 h-4 text-blue-400" />
            Discovery Location & Current Custody
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Building Where Found <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {CAMPUS_BUILDINGS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Specific Area / Room
              </label>
              <input
                type="text"
                placeholder="e.g. Under desk in Lecture Hall 101, Bench near café"
                value={formData.room_or_area}
                onChange={(e) => setFormData({ ...formData, room_or_area: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Location Found Description <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Found on the 1st floor water fountain counter near the east entrance"
                value={formData.location_found}
                onChange={(e) => setFormData({ ...formData, location_found: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Where is the item currently stored? <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.current_storage_location}
                onChange={(e) => setFormData({ ...formData, current_storage_location: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {STORAGE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                For security, highly valuable items (phones, laptops, credit cards) should be handed to Campus Security.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Item Photos */}
        <div className="space-y-3">
          <ImageUploader
            images={images}
            onChange={setImages}
            maxImages={4}
            label="Photographs of the Found Item"
            helperText="Upload clear photos of the item as you found it."
          />
        </div>

        {/* Section 4: Finder Contact Info */}
        <div className="space-y-5">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Shield className="w-4 h-4 text-blue-400" />
            Finder Contact Info
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Contact Email / Phone (For handover coordination)
            </label>
            <input
              type="text"
              placeholder="finder@campus.edu or +1 (555) 000-0000"
              value={formData.finder_contact_info}
              onChange={(e) => setFormData({ ...formData, finder_contact_info: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            Thank you for keeping our campus community honest and helpful!
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Registering Item...
              </>
            ) : (
              'Log Found Item'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
