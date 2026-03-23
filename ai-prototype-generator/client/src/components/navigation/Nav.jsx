/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Horizontal navigation bar with active-state tracking.
 * Styled as a terminal tab bar with neon green active states.
 * ============================================================
 */

import React from 'react';
import { usePreviewState } from '../../state/previewState';

export default function Nav({ title, data, wireframe }) {
  const { state, actions } = usePreviewState();
  const items = Array.isArray(data) ? data : ['Home', 'About', 'Contact'];

  if (wireframe) {
    return (
      <nav className="w-full py-3 border-2 border-dashed border-dark-700 bg-dark-900 flex gap-4 px-4 rounded-lg overflow-x-auto">
        {items.map((_, i) => (
          <div key={i} className="h-6 w-20 bg-dark-800 rounded animate-pulse" />
        ))}
      </nav>
    );
  }

  return (
    <nav className="w-full bg-dark-900/80 backdrop-blur-xl border-b border-dark-800 px-4 flex gap-2 overflow-x-auto shadow-sm">
      {items.map((item, i) => {
        const itemText = typeof item === 'string' ? item : Object.keys(item)[0];
        const isActive = state.currentScreen === itemText;

        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              actions.navigate(itemText);
              actions.showToast(`> cd ${itemText}`);
            }}
            className={`
              relative py-3 px-4 text-sm font-mono whitespace-nowrap
              transition-all duration-300 ease-in-out border-b-2
              ${isActive
                ? 'text-neon-green border-neon-green bg-neon-green/5'
                : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-dark-600 hover:bg-dark-800/50'}
            `}
          >
            <span className="opacity-50 mr-1">{'>'}</span> {itemText}
            {isActive && (
              <span className="absolute bottom-0 right-2 w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_rgba(57,255,20,0.8)]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
