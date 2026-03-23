/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Interactive button that fires a toast notification on click.
 * Automatically styles as primary (filled blue) or secondary
 * (outlined) based on the label text.
 * ============================================================
 */

// SECTION 2 — Imports
import React from 'react';
import { usePreviewState } from '../../state/previewState';

// SECTION 3 — Core Logic
const PRIMARY_KEYWORDS = ['save', 'start', 'create', 'submit', 'confirm', 'add'];

function isPrimaryButton(label) {
  const lower = label.toLowerCase();
  return PRIMARY_KEYWORDS.some((kw) => lower.includes(kw));
}

// SECTION 4 — Component Implementation
export default function Button({ label, wireframe }) {
  const { actions } = usePreviewState();

  if (wireframe) {
    return <div className="h-10 w-28 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg" />;
  }

  const primary = isPrimaryButton(label);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        actions.showToast(`${label} action triggered`);
      }}
      className={`
        px-4 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-300 ease-in-out active:scale-95 shadow-sm
        ${primary
          ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md shadow-blue-200'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}
      `}
    >
      {label}
    </button>
  );
}

// SECTION 5 — Export (default export above)
