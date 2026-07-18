/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Generic container component for layout nodes that don't
 * match any registered component. Renders a titled section
 * with a left border accent and recursively renders children
 * via LayoutRenderer.
 * ============================================================
 */

// SECTION 2 — Imports
import React from 'react';

// SECTION 3 — Core Logic (none — delegates to LayoutRenderer via children)

// SECTION 4 — Component Implementation
export default function Container({
  name,
  isSelected,
  isHighlighted,
  wireframe,
  children,
}) {
  return (
    <div
      className={`
        p-5 rounded-xl border cursor-pointer relative
        transition-all duration-300 ease-in-out
        ${isSelected
          ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/10'
          : wireframe
            ? 'bg-transparent border-dashed border-slate-300'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}
        ${isHighlighted ? 'ring-2 ring-amber-400 bg-amber-50/20' : ''}
      `}
    >
      {/* Section label */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {name}
        </div>
        {isSelected && (
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        )}
      </div>

      {/* Child content injected by LayoutRenderer */}
      <div className="pl-2 border-l-2 border-slate-100">{children}</div>
    </div>
  );
}

// SECTION 5 — Export (default export above)
