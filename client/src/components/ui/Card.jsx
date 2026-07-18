/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Generic content card — a simple bordered container with a
 * title and child content. Used as a fallback when no
 * specialised component is matched by the registry.
 * ============================================================
 */

// SECTION 2 — Imports
import React from 'react';

// SECTION 3 — Core Logic (none — pure presentational)

// SECTION 4 — Component Implementation
export default function Card({ title, children, wireframe }) {
  if (wireframe) {
    return (
      <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl p-4 min-h-[80px]">
        <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      {title && (
        <h3 className="text-sm font-semibold text-slate-600 mb-3">{title}</h3>
      )}
      {children}
    </div>
  );
}

// SECTION 5 — Export (default export above)
