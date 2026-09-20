'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, ShieldCheck, MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 text-slate-400 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-100 text-sm tracking-tight">
                CampusFound AI
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Intelligent campus property recovery platform connecting student reports with real-time custody logging and automated AI matching.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">
              Quick Directory
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/lost-items" className="hover:text-slate-200 transition-colors">
                  Lost Items Board
                </Link>
              </li>
              <li>
                <Link href="/found-items" className="hover:text-slate-200 transition-colors">
                  Found Items in Custody
                </Link>
              </li>
              <li>
                <Link href="/matches" className="hover:text-slate-200 transition-colors">
                  Match Intelligence Board
                </Link>
              </li>
              <li>
                <Link href="/claims" className="hover:text-slate-200 transition-colors">
                  Submit & Verify Claims
                </Link>
              </li>
            </ul>
          </div>

          {/* Campus Lost & Found Office */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">
              Central Security Office
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>Student Union Center, Room 104 (Ground Floor)</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Mon – Fri: 8:00 AM – 7:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>+1 (555) CAMPUS-LF (ext. 411)</span>
              </div>
            </div>
          </div>

          {/* Handover & Claim Guidance */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">
              Verification & Safety
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Always request official student ID during item handovers. High-value electronics (laptops, phones) should be deposited at the Central Security Desk for safe custody.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs pt-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Campus Verified Security Protocol</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
          <p>© 2026 CampusFound AI. Campus Property Recovery Intelligence System.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Student Privacy Protected</span>
            <span>•</span>
            <span>Row Level Security Enabled</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
