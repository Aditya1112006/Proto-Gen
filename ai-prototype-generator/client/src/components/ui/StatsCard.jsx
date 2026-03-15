/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Statistics card showing a metric title, value, and trend
 * indicator. Uses deterministic mock data so values stay
 * consistent across re-renders. Clicking opens a detail modal.
 * ============================================================
 */

// SECTION 2 — Imports
import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { usePreviewState, getMockValue, getMockDelta } from '../../state/previewState';

// SECTION 3 — Core Logic
function useCardData(title) {
  const value = useMemo(() => getMockValue(title), [title]);
  const delta = useMemo(() => getMockDelta(title), [title]);
  const isPositive = delta.startsWith('+');
  return { value, delta, isPositive };
}

// SECTION 4 — Component Implementation
export default function StatsCard({ title, data, wireframe }) {
  const { actions } = usePreviewState();
  const [hovered, setHovered] = useState(false);
  const { value, delta, isPositive } = useCardData(title);

  if (wireframe) {
    return (
      <div className="flex-1 min-w-[180px] h-32 border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl p-4 flex flex-col justify-between">
        <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
        <div className="h-8 w-1/3 bg-slate-200 rounded animate-pulse mt-4" />
      </div>
    );
  }

  return (
    <div
      className={`
        flex-1 min-w-[180px] bg-white border rounded-xl p-5 shadow-sm cursor-pointer
        transition-all duration-300 ease-in-out
        ${hovered ? 'scale-[1.04] shadow-lg border-blue-400 -translate-y-1' : 'border-slate-200 hover:shadow-md'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        actions.openModal({
          title,
          value: String(value),
          description: `Detailed breakdown for ${title}. This metric shows a ${delta} change. Click "Take Action" to simulate a workflow step.`,
        });
      }}
    >
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className={`text-3xl font-bold transition-colors duration-300 ${hovered ? 'text-blue-600' : 'text-slate-800'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className={`text-xs font-medium mt-2 flex items-center gap-1 transition-all duration-300 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {delta} vs last week
      </div>
    </div>
  );
}

// SECTION 5 — Export (default export above)
