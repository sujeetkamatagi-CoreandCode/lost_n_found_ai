'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertCircle, Tag, MapPin, DollarSign } from 'lucide-react';
import { getLostItemById, updateLostItem } from '@/lib/api/lostItems';
import { LostItemWithUser } from '@/lib/database.types';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import ImageUploader from '@/components/ImageUploader';

const CATEGORIES = ['Electronics','Keys','Wallets & IDs','Bags & Backpacks','Clothing','Books & Notes','Jewelry & Accessories','Sports Equipment','Other'];
const BUILDINGS = ['Main Library (William Knox Hall)','Student Union Center','Engineering & Sciences Complex','Humanities & Arts Building','Business & Economics Hall','Campus Recreation & Athletic Center','Dining Commons','North Residence Quad','South Residence Village','Campus Green / Central Lawn','Parking Structure A / B / C','Other Campus Location'];

export default function EditLostItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState<LostItemWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electronics',
    description: '',
    distinctive_features: '',
    location_lost: '',
    building: BUILDINGS[0],
    room_or_area: '',
    date_lost: '',
    time_lost_range: '',
    reward_amount: 0,
    contact_email: '',
    contact_phone: '',
  });
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getLostItemById(id);
      if (!data) {
        setLoading(false);
        return;
      }
      // Ownership check
      const isOwner = user?.id === data.user_id || user?.role === 'staff' || user?.role === 'admin';
      if (!isOwner) {
        showToast('Not authorized', { type: 'error', message: 'Only the owner or staff can edit this report.' });
        router.push(`/lost-items/${id}`);
        return;
      }
      if (data.status === 'closed') {
        showToast('Cannot edit archived item', { type: 'error', message: 'This report is resolved & archived and cannot be edited. Contact security if needed.' });
        router.push(`/lost-items/${id}`);
        return;
      }
      setItem(data);
      setFormData({
        title: data.title,
        category: data.category,
        description: data.description,
        distinctive_features: data.distinctive_features || '',
        location_lost: data.location_lost,
        building: data.building || BUILDINGS[0],
        room_or_area: data.room_or_area || '',
        date_lost: data.date_lost,
        time_lost_range: data.time_lost_range || 'Afternoon (12:00 PM - 5:00 PM)',
        reward_amount: data.reward_amount || 0,
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
      });
      setImages(data.image_urls || []);
      setLoading(false);
    }
    load();
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!formData.title.trim() || !formData.description.trim() || !formData.location_lost.trim()) {
      showToast('Missing fields', { type: 'error', message: 'Title, description, location are required.' });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateLostItem(item.id, {
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
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
      });
      showToast('Report updated!', { message: 'Your lost item report has been saved.' });
      // Re-trigger match scan if needed
      try {
        await fetch('/api/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: updated.id, itemType: 'lost' }) });
      } catch {}
      router.push(`/lost-items/${updated.id}`);
    } catch (err: any) {
      showToast('Update failed', { type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
        <p className="text-sm text-slate-400">Loading report for editing...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-3">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-400" />
        <h2 className="text-xl font-bold text-white">Report not found</h2>
        <Link href="/lost-items" className="inline-block px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs">Back to Directory</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/lost-items/${item.id}`} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Report
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">Editing: {item.status}</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Tag className="w-6 h-6 text-amber-400" /> Edit Lost Item Report
        </h1>
        <p className="text-sm text-slate-400">Update details for your missing item. Active reports can be edited by owner/staff until archived.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Item Title *</label>
            <input type="text" required value={formData.title} onChange={(e)=>setFormData({...formData,title:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Category *</label>
            <select value={formData.category} onChange={(e)=>setFormData({...formData,category:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm">
              {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Reward (₹ INR)</label>
            <div className="relative"><span className="absolute left-3.5 top-3 text-xs font-bold text-slate-500">₹</span><input type="number" min="0" step="10" value={formData.reward_amount} onChange={(e)=>setFormData({...formData,reward_amount:Number(e.target.value)})} className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" /></div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Description *</label>
            <textarea required rows={3} value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Distinctive Features</label>
            <textarea rows={2} value={formData.distinctive_features} onChange={(e)=>setFormData({...formData,distinctive_features:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Building *</label>
            <select value={formData.building} onChange={(e)=>setFormData({...formData,building:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm">
              {BUILDINGS.map(b=> <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Room / Area</label>
            <input type="text" value={formData.room_or_area} onChange={(e)=>setFormData({...formData,room_or_area:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Location Description *</label>
            <input type="text" required value={formData.location_lost} onChange={(e)=>setFormData({...formData,location_lost:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Date Lost *</label>
            <input type="date" required value={formData.date_lost} onChange={(e)=>setFormData({...formData,date_lost:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Time Window</label>
            <select value={formData.time_lost_range} onChange={(e)=>setFormData({...formData,time_lost_range:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm">
              <option>Morning (8:00 AM - 12:00 PM)</option>
              <option>Afternoon (12:00 PM - 5:00 PM)</option>
              <option>Evening (5:00 PM - 9:00 PM)</option>
              <option>Night (9:00 PM - 8:00 AM)</option>
              <option>Unsure / Full Day</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <ImageUploader images={images} onChange={setImages} maxImages={4} label="Reference Photos" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Contact Email</label>
            <input type="email" value={formData.contact_email} onChange={(e)=>setFormData({...formData,contact_email:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Phone (Optional)</label>
            <input type="tel" value={formData.contact_phone} onChange={(e)=>setFormData({...formData,contact_phone:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
        </div>
        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <Link href={`/lost-items/${item.id}`} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancel</Link>
          <button type="submit" disabled={saving} className="px-8 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin"/> Saving...</> : <><Save className="w-4 h-4"/> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
