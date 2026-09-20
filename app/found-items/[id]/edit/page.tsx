'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertCircle, Tag } from 'lucide-react';
import { getFoundItemById, updateFoundItem } from '@/lib/api/foundItems';
import { FoundItemWithUser } from '@/lib/database.types';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import ImageUploader from '@/components/ImageUploader';

const CATEGORIES = ['Electronics','Keys','Wallets & IDs','Bags & Backpacks','Clothing','Books & Notes','Jewelry & Accessories','Sports Equipment','Other'];
const BUILDINGS = ['Main Library (William Knox Hall)','Student Union Center','Engineering & Sciences Complex','Humanities & Arts Building','Business & Economics Hall','Campus Recreation & Athletic Center','Dining Commons','North Residence Quad','South Residence Village','Campus Green / Central Lawn','Parking Structure A / B / C','Other Campus Location'];
const STORAGE_LOCATIONS = ['Central Security Office - Student Union Rm 104','Main Library Front Circulation Desk','Engineering Building Department Office (Rm 120)','Athletic Center Front Reception','Dining Commons Manager Desk','With Finder (Personal Custody / Direct Handover)','Other Campus Drop-off Location'];

export default function EditFoundItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState<FoundItemWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electronics',
    description: '',
    location_found: '',
    building: BUILDINGS[0],
    room_or_area: '',
    date_found: '',
    current_storage_location: STORAGE_LOCATIONS[0],
    finder_contact_info: '',
  });
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getFoundItemById(id);
      if (!data) { setLoading(false); return; }
      const isOwner = user?.id === data.finder_id || user?.role === 'staff' || user?.role === 'admin';
      if (!isOwner) {
        showToast('Not authorized', { type: 'error', message: 'Only finder or staff can edit this entry.' });
        router.push(`/found-items/${id}`);
        return;
      }
      if (data.status === 'returned' || data.status === 'disposed') {
        showToast('Cannot edit archived item', { type: 'error', message: 'This entry is archived after return and cannot be edited.' });
        router.push(`/found-items/${id}`);
        return;
      }
      setItem(data);
      setFormData({
        title: data.title,
        category: data.category,
        description: data.description,
        location_found: data.location_found,
        building: data.building || BUILDINGS[0],
        room_or_area: data.room_or_area || '',
        date_found: data.date_found,
        current_storage_location: data.current_storage_location,
        finder_contact_info: data.finder_contact_info || '',
      });
      setImages(data.image_urls || []);
      setLoading(false);
    }
    load();
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!formData.title.trim() || !formData.description.trim() || !formData.location_found.trim()) {
      showToast('Missing fields', { type: 'error', message: 'Title, description, location required.' });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateFoundItem(item.id, {
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
      });
      showToast('Custody log updated!');
      try { await fetch('/api/match', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ itemId: updated.id, itemType:'found'}) }); } catch {}
      router.push(`/found-items/${updated.id}`);
    } catch (err: any) {
      showToast('Update failed', { type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400" /><p className="text-sm text-slate-400 mt-2">Loading custody log...</p></div>;
  if (!item) return <div className="max-w-4xl mx-auto px-4 py-20 text-center"><AlertCircle className="w-12 h-12 mx-auto text-rose-400"/><h2 className="text-xl font-bold text-white mt-3">Not found</h2><Link href="/found-items" className="inline-block mt-3 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs">Back to Found Directory</Link></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link href={`/found-items/${item.id}`} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4"/> Back to Entry</Link>
        <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">Editing: {item.status}</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3"><Tag className="w-6 h-6 text-blue-400"/> Edit Found Item Log</h1>
        <p className="text-sm text-slate-400">Update custody details. Only finder/staff can edit active entries before return/archival.</p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Item Title *</label>
            <input type="text" required value={formData.title} onChange={(e)=>setFormData({...formData,title:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Category *</label>
            <select value={formData.category} onChange={(e)=>setFormData({...formData,category:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm">
              {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Date Found *</label>
            <input type="date" required value={formData.date_found} onChange={(e)=>setFormData({...formData,date_found:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Description *</label>
            <textarea required rows={3} value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Building Where Found *</label>
            <select value={formData.building} onChange={(e)=>setFormData({...formData,building:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm">
              {BUILDINGS.map(b=> <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Specific Area / Room</label>
            <input type="text" value={formData.room_or_area} onChange={(e)=>setFormData({...formData,room_or_area:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Location Found Description *</label>
            <input type="text" required value={formData.location_found} onChange={(e)=>setFormData({...formData,location_found:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Current Custody Location *</label>
            <select value={formData.current_storage_location} onChange={(e)=>setFormData({...formData,current_storage_location:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm">
              {STORAGE_LOCATIONS.map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <ImageUploader images={images} onChange={setImages} maxImages={4} label="Photographs" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">Finder Contact Info</label>
            <input type="text" value={formData.finder_contact_info} onChange={(e)=>setFormData({...formData,finder_contact_info:e.target.value})} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm" />
          </div>
        </div>
        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <Link href={`/found-items/${item.id}`} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancel</Link>
          <button type="submit" disabled={saving} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin"/> Saving...</> : <><Save className="w-4 h-4"/> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
