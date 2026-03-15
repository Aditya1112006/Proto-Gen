/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Horizontal navigation bar with active-state tracking.
 * Clicking a nav item dispatches a screen navigation action
 * and shows a confirmation toast. The active item gets a
 * blue underline and pulse indicator.
 * ============================================================
 */

// SECTION 2 — Imports
import React from 'react';
import { usePreviewState } from '../../state/previewState';

// SECTION 3 — Core Logic (none — state from context)

// SECTION 4 — Component Implementation
export default function Nav({ title, data, wireframe }) {
  const { state, actions } = usePreviewState();
  const items = Array.isArray(data) ? data : ['Home', 'About', 'Contact'];

  if (wireframe) {
    return (
      <nav className="w-full py-3 border-2 border-dashed border-slate-300 bg-slate-50 flex gap-4 px-4 rounded-lg overflow-x-auto">
        {items.map((_, i) => (
          <div key={i} className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
        ))}
      </nav>
    );
  }

  return (
    <nav className="w-full bg-white border-b border-slate-200 px-4 flex gap-1 overflow-x-auto rounded-b-xl shadow-sm">
      {items.map((item, i) => {
        const itemText = typeof item === 'string' ? item : Object.keys(item)[0];
        const isActive = state.currentScreen === itemText;

        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              actions.navigate(itemText);
              actions.showToast(`Navigated to ${itemText}`);
            }}
            className={`
              relative py-3 px-4 text-sm font-medium whitespace-nowrap
              transition-all duration-300 ease-in-out border-b-2 rounded-t-lg
              ${isActive
                ? 'text-blue-600 border-blue-600 bg-blue-50/60'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50'}
            `}
          >
            {itemText}
            {isActive && (
              <span className="absolute -top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// SECTION 5 — Export (default export above)
