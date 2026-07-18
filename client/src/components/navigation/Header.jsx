/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Application header with logo, search bar, notification bell,
 * and profile icon. Styled for the Dark Developer theme (glassmorphism,
 * neon green accents).
 * ============================================================
 */

import React, { useState } from 'react';
import { Search as SearchIcon, User, Bell } from 'lucide-react';
import { usePreviewState } from '../../state/previewState';

export default function Header({ title, data, wireframe }) {
  const { state, actions } = usePreviewState();
  const [searchValue, setSearchValue] = useState('');

  // ── Wireframe mode ──
  if (wireframe) {
    return (
      <div className="w-full h-16 border-2 border-dashed border-dark-700 bg-dark-900 flex items-center justify-between px-4 rounded-lg">
        <span className="text-gray-500 font-mono text-sm">{title} (Header)</span>
        <span className="text-gray-600 text-xs">
          Children: {Array.isArray(data) ? data.length : Object.keys(data || {}).length}
        </span>
      </div>
    );
  }

  // ── Real mode ──
  return (
    <header className="w-full bg-dark-900/80 backdrop-blur-xl border-b border-neon-green/20 px-5 h-16 flex items-center justify-between shadow-sm z-40 sticky top-0">
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Proto-Gen Logo" className="w-12 h-12 object-contain" />
        <span className="font-bold text-gray-200 text-lg tracking-tight font-mono">
          Proto<span className="text-neon-green">-Gen</span>
        </span>
        <span className="text-xs text-neon-green/80 font-mono bg-neon-green/10 border border-neon-green/20 px-2 py-0.5 rounded ml-2">
          {state.currentScreen || 'dashboard'}
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm mx-6 hidden md:block relative group">
        <div className="absolute inset-y-0 left-3 flex items-center">
          <span className="text-neon-purple font-mono text-sm group-focus-within:text-neon-green transition-colors">$</span>
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchValue.trim()) {
              actions.showToast(`> Executed grep: "${searchValue}"`);
              setSearchValue('');
            }
          }}
          placeholder="grep -r 'search anything...' ./"
          className="w-full pl-8 pr-4 py-1.5 bg-dark-800/50 border border-dark-700 rounded text-sm text-gray-300 placeholder-gray-600 focus:bg-dark-900 focus:border-neon-green/50 focus:shadow-[0_0_15px_rgba(57,255,20,0.15)] transition-all duration-300 ease-in-out outline-none font-mono"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); actions.showToast('> SYSLOG: 3 new alerts'); }}
          className="relative w-8 h-8 rounded bg-dark-800 flex items-center justify-center hover:bg-dark-700 hover:border-neon-purple/50 transition-all duration-200 border border-dark-700 group"
        >
          <Bell className="w-4 h-4 text-gray-400 group-hover:text-neon-purple transition-colors" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neon-purple rounded-full animate-pulse shadow-[0_0_8px_rgba(191,90,242,0.8)]" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); actions.navigate('Profile'); }}
          className="w-8 h-8 rounded bg-dark-800 flex items-center justify-center hover:bg-neon-green/10 hover:border-neon-green/50 border border-dark-700 transition-all duration-200 group"
        >
          <User className="w-4 h-4 text-gray-400 group-hover:text-neon-green transition-colors" />
        </button>
      </div>
    </header>
  );
}
