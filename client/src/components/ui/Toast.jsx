/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Toast notification queue. Stacks up to 3 toasts at
 * bottom-right. Auto-dismisses after 3 seconds. Manual
 * dismiss via X button.
 * ============================================================
 */

// SECTION 2 — Imports
import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { usePreviewState } from '../../state/previewState';

// SECTION 3 — Core Logic (auto-dismiss timer)

// SECTION 4 — Component Implementation
export default function Toast() {
  const { state, actions } = usePreviewState();

  useEffect(() => {
    if (state.toasts.length === 0) return;
    const latest = state.toasts[state.toasts.length - 1];
    const timer = setTimeout(() => actions.dismissToast(latest.id), 3000);
    return () => clearTimeout(timer);
  }, [state.toasts, actions]);

  if (state.toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {state.toasts.slice(-3).map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-[slideUp_300ms_ease-out]"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button
            onClick={() => actions.dismissToast(toast.id)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// SECTION 5 — Export (default export above)
