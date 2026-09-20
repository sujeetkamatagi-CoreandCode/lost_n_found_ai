'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Tag, Gift, ChevronRight, User as UserIcon } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { LostItemWithUser, FoundItemWithUser } from '@/lib/database.types';

interface ItemCardProps {
  item: LostItemWithUser | FoundItemWithUser;
  type: 'lost' | 'found';
}

export default function ItemCard({ item, type }: ItemCardProps) {
  const isLost = type === 'lost';
  const lostItem = isLost ? (item as LostItemWithUser) : null;
  const foundItem = !isLost ? (item as FoundItemWithUser) : null;

  const date = isLost ? lostItem?.date_lost : foundItem?.date_found;
  const location = isLost ? lostItem?.location_lost : foundItem?.location_found;
  const building = item.building;
  const imageUrl = item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : null;
  const linkHref = isLost ? `/lost-items/${item.id}` : `/found-items/${item.id}`;

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown Date';

  return (
    <Link
      href={linkHref}
      className="group flex flex-col bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1"
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video w-full bg-slate-950/70 overflow-hidden border-b border-slate-800/60">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2 bg-gradient-to-br from-slate-950 to-slate-900">
            <Tag className="w-8 h-8 opacity-40" />
            <span className="text-xs uppercase tracking-wider font-semibold opacity-40">
              No Image Provided
            </span>
          </div>
        )}

        {/* Status Badge overlay */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={item.status} size="sm" />
        </div>

        {/* Type tag */}
        <div className="absolute top-3 right-3">
          <span
            className={`text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full border backdrop-blur-md shadow-sm ${
              isLost
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                : 'bg-blue-950/80 text-blue-300 border-blue-500/30'
            }`}
          >
            {isLost ? 'Lost Item' : 'Found Item'}
          </span>
        </div>

        {/* Reward Tag for lost items */}
        {isLost && lostItem?.reward_amount && lostItem.reward_amount > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/90 text-slate-950 backdrop-blur-md shadow-lg">
            <Gift className="w-3.5 h-3.5" />
            <span>₹{lostItem.reward_amount} Reward</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-5 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          {/* Category */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
              {item.category}
            </span>
            {building && (
              <span className="text-xs text-slate-400 truncate flex items-center gap-1">
                • {building}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Metadata Footer */}
        <div className="pt-3 border-t border-slate-800/60 flex flex-col gap-2 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Custody location for found items */}
          {!isLost && foundItem?.current_storage_location && (
            <div className="text-[11px] text-blue-400/90 bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10 truncate">
              📍 Storage: {foundItem.current_storage_location}
            </div>
          )}

          <div className="flex items-center justify-between text-indigo-400 text-xs font-medium pt-1 group-hover:text-indigo-300">
            <span>View Intelligence Details</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
