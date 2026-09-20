'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Tag,
  FileText,
  AlertCircle,
  Loader2,
  Building2,
} from 'lucide-react';
import { createLostItem } from '@/lib/api/lostItems';
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

export default function ReportLostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electronics',
    description: '',
    distinctive_features: '',
    location_lost: '',
    building: CAMPUS_BUILDINGS[0],
    room_or_area: '',
    date_lost: new Date().toISOString().split('T')[0],
    time_lost_range: 'Afternoon (12:00 PM - 5:00 PM)',
    reward_amount: 0,
    contact_email: user?.email || '',
    contact_phone: user?.phone || '',
  });
  const [images, setImages] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('Authentication required', {
        type: 'error',
        message: 'Please sign in or choose a demo persona to report a lost item.',
      });
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.location_lost.trim()) {
      showToast('Missing required fields', {
        type: 'error',
        message: 'Please fill in the item title, description, and location lost.',
      });
      return;
    }

    setLoading(true);
    try {
      const newItem = await createLostItem({
        user_id: user.id,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        distinctive_features: formData.distinctive_features.trim() || null,
        location_lost: formData.location_lost.trim(),
        building: formData.building,
        room_or_area: formData.room_or_area.trim() || null,
        date_lost: formData.date_lost,
        time_lost_range: formData.time_lost_range || null,
        image_urls: images,
        reward_amount: Number(formData.reward_amount) || 0,
        contact_email: formData.contact_email.trim() || user.email,
        contact_phone: formData.contact_phone.trim() || null,
        status: 'lost',
      });

      // Automatically trigger Gemini matching against found custody logs
      try {
        const matchRes = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: newItem.id, itemType: 'lost' }),
        });
        const matchJson = await matchRes.json();
        if (matchJson.matchesFound > 0) {
          showToast(`AI Match Alert: Found ${matchJson.matchesFound} candidate(s)!`, {
            message: 'Gemini detected potential matches in campus custody.',
          });
        } else {
          showToast('Lost item report filed!', {
            message: 'Your report is active. Gemini will alert you when a match is turned in.',
          });
        }
      } catch (matchErr) {
        console.warn('Background match trigger completed with notice:', matchErr);
        showToast('Lost item report filed!', {
          message: 'Your report is active on the campus lost board.',
        });
      }

      router.push(`/lost-items/${newItem.id}`);
    } catch (err: any) {
      console.error('Error reporting lost item:', err);
      showToast('Failed to file report', {
        type: 'error',
        message: err.message || 'Please check your connection and try again.',
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
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Step 1 of 1: Item Details
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg">
            🔍
          </span>
          Report a Lost Item
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Provide detailed information to help campus security, staff, and fellow students identify and return your missing possession.
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-8"
      >
        {/* Section 1: Item Identity */}
        <div className="space-y-5">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Tag className="w-4 h-4 text-indigo-400" />
            Item Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Item Title / Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Midnight Blue Hydro Flask with Stickers or Space Gray MacBook Pro 14&quot;"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                Optional Reward Offering (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={formData.reward_amount || ''}
                  onChange={(e) => setFormData({ ...formData, reward_amount: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Amount in Indian Rupees. Optional thank-you amount.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Full Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe color, brand, model, case, contents, and condition..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Distinctive Features / Secret Proof Clues
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Scratch near charging port, NASA sticker on upper right, lock screen wallpaper of a golden retriever..."
                value={formData.distinctive_features}
                onChange={(e) => setFormData({ ...formData, distinctive_features: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                These features help the AI match algorithm correlate your report with found items.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Location & Timeline */}
        <div className="space-y-5">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <MapPin className="w-4 h-4 text-indigo-400" />
            Where & When Was It Lost?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Campus Building / Zone <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                Specific Room / Area
              </label>
              <input
                type="text"
                placeholder="e.g. Room 204, Quiet Study Area, 2nd Floor Restroom"
                value={formData.room_or_area}
                onChange={(e) => setFormData({ ...formData, room_or_area: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                General Location Description <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Left on the wooden table in the Library 2nd floor silent reading room"
                value={formData.location_lost}
                onChange={(e) => setFormData({ ...formData, location_lost: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Date Lost <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date_lost}
                onChange={(e) => setFormData({ ...formData, date_lost: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Estimated Time Window
              </label>
              <select
                value={formData.time_lost_range}
                onChange={(e) => setFormData({ ...formData, time_lost_range: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                <option value="Afternoon (12:00 PM - 5:00 PM)">Afternoon (12:00 PM - 5:00 PM)</option>
                <option value="Evening (5:00 PM - 9:00 PM)">Evening (5:00 PM - 9:00 PM)</option>
                <option value="Night (9:00 PM - 8:00 AM)">Night (9:00 PM - 8:00 AM)</option>
                <option value="Unsure / Full Day">Unsure / Full Day</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Item Photographs */}
        <div className="space-y-3">
          <ImageUploader
            images={images}
            onChange={setImages}
            maxImages={4}
            label="Reference Photos of Your Item"
            helperText="Upload reference photos (from your camera roll or online model images) showing what your item looks like."
          />
        </div>

        {/* Section 4: Owner Contact Info */}
        <div className="space-y-5">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Mail className="w-4 h-4 text-indigo-400" />
            Contact Preference
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Contact Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI will automatically analyze and cross-reference new found entries.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                Submitting Report...
              </>
            ) : (
              'Submit Lost Item Report'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
