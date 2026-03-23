/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Single list row with numbered badge, text, and chevron.
 * Clicking opens a detail modal with mock data.
 * ============================================================
 */

// SECTION 2 — Imports
import React from 'react';
import { usePreviewState, getMockValue } from '../../state/previewState';

// SECTION 3 — Core Logic (none)

// SECTION 4 — Component Implementation
export default function ListItem({ text, index, wireframe }) {
  const { actions } = usePreviewState();

  if (wireframe) {
    return <div className="h-12 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg" />;
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        actions.openModal({
          title: text,
          value: String(getMockValue(text)),
          description: `Details for "${text}".`,
        });
      }}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl
        hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer
        transition-all duration-200 ease-in-out group"
    >
      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-blue-200 transition-colors">
        {(index ?? 0) + 1}
      </span>
      <span className="text-sm font-medium text-slate-700 flex-1">{text}</span>
      <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// SECTION 5 — Export (default export above)
