'use client';

import React from 'react';
import { 
  LostItemStatus, 
  FoundItemStatus, 
  MatchStatus, 
  ClaimStatus 
} from '@/lib/database.types';

type AnyStatus = LostItemStatus | FoundItemStatus | MatchStatus | ClaimStatus | string;

interface StatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getBadgeStyle = (st: string) => {
    switch (st.toLowerCase()) {
      case 'lost':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'found':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'matched':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'claimed':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'returned':
      case 'completed':
      case 'approved':
      case 'verified':
      case 'resolved':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'pending':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'rejected':
      case 'cancelled':
      case 'disposed':
      case 'closed':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  const formatText = (st: string) => {
    return st.charAt(0).toUpperCase() + st.slice(1);
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm tracking-wide capitalize ${getBadgeStyle(
        status
      )} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />
      {formatText(status)}
    </span>
  );
}
