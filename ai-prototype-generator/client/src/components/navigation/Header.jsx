/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Application header with logo, search bar, notification bell,
 * and profile icon. Displays the current screen name as a badge.
 * The search input fires a toast on Enter, and the profile
 * button navigates to the Profile screen.
 * ============================================================
 */

// SECTION 2 — Imports
import React, { useState } from 'react';
import { Search as SearchIcon, User, Bell } from 'lucide-react';
import { usePreviewState } from '../../state/previewState';

// SECTION 3 — Core Logic (none — state comes from context)

// SECTION 4 — Component Implementation
export default function Header({ title, data, wireframe }) {
  const { state, actions } = usePreviewState();
  const [searchValue, setSearchValue] = useState('');

  // ── Wireframe mode ──
  if (wireframe) {
    return (
      <div className="w-full h-16 border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-between px-4 rounded-lg">
        <span className="text-slate-400 font-mono text-sm">{title} (Header)</span>
        <span className="text-slate-300 text-xs">
          Children: {Array.isArray(data) ? data.length : Object.keys(data || {}).length}
        </span>
      </div>
    );
  }

  // ── Real mode ──
  return (
    <header className="w-full bg-white border-b border-slate-200 px-5 h-16 flex items-center justify-between rounded-t-xl shadow-sm">
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
          <span className="text-white font-bold text-lg">P</span>
        </div>
        <span className="font-semibold text-slate-800 text-lg tracking-tight">Prototype</span>
        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full ml-1">
          {state.currentScreen}
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm mx-6 hidden md:block relative">
        <div className="absolute inset-y-0 left-3 flex items-center">
          <SearchIcon className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchValue.trim()) {
              actions.showToast(`Searched: "${searchValue}"`);
              setSearchValue('');
            }
          }}
          placeholder="Search anything…"
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-300 ease-in-out outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); actions.showToast('You have 3 new notifications'); }}
          className="relative w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all duration-200 border border-slate-200"
        >
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); actions.navigate('Profile'); }}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center hover:from-slate-300 hover:to-slate-400 transition-all duration-200"
        >
          <User className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </header>
  );
}

// SECTION 5 — Export (default export above)
