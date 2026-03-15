/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Global modal dialog driven by preview state.
 * Supports ESC key close, backdrop click, animations.
 * ============================================================
 */

// SECTION 2 — Imports
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { usePreviewState } from '../../state/previewState';

// SECTION 3 — Core Logic (ESC key handler via useEffect)

// SECTION 4 — Component Implementation
export default function Modal() {
  const { state, actions } = usePreviewState();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && state.modal) actions.closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [state.modal, actions]);

  if (!state.modal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]"
      onClick={() => actions.closeModal()}
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{state.modal.title} Details</h2>
          <button
            onClick={() => actions.closeModal()}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">{state.modal.value}</div>
          <p className="text-slate-500 text-sm leading-relaxed">
            {state.modal.description || `Interactive modal for ${state.modal.title}.`}
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => actions.closeModal()}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200"
            >
              Close
            </button>
            <button
              onClick={() => {
                actions.closeModal();
                actions.showToast(`Action completed for ${state.modal.title}`);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 shadow-sm shadow-blue-200"
            >
              Take Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// SECTION 5 — Export (default export above)
