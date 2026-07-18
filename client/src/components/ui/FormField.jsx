/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Labelled text input with live placeholder validation.
 * Reads/writes its value through the global preview state,
 * ensuring form data survives screen transitions.
 * ============================================================
 */

// SECTION 2 — Imports
import React from 'react';
import { usePreviewState } from '../../state/previewState';

// SECTION 3 — Core Logic (none — state from context)

// SECTION 4 — Component Implementation
export default function FormField({ label, path, wireframe }) {
  const { state, actions } = usePreviewState();
  const value = state.inputValues[path] || '';

  if (wireframe) {
    return <div className="h-10 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => actions.setInputValue(path, e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}…`}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
          focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none
          transition-all duration-300 ease-in-out bg-slate-50 focus:bg-white"
      />
      {value.length > 0 && value.length < 3 && (
        <p className="text-xs text-amber-500">Must be at least 3 characters</p>
      )}
    </div>
  );
}

// SECTION 5 — Export (default export above)
