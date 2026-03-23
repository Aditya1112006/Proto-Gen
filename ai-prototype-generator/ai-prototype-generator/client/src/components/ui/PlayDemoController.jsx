/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Dynamic demo engine — runs a scripted user-journey through
 * the preview. Each step is an action object dispatched
 * against the preview state. Supports play/stop/skip controls
 * and shows a progress bar.
 * ============================================================
 */

// SECTION 2 — Imports
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, SkipForward } from 'lucide-react';
import { usePreviewState } from '../../state/previewState';

// SECTION 3 — Core Logic (journey script)

const DEFAULT_JOURNEY = [
  { action: 'navigate', target: 'Home', delay: 600 },
  { action: 'highlight', target: 'App.Screens.Home.StatsCards', delay: 800 },
  { action: 'select', target: 'App.Screens.Home.StatsCards', name: 'StatsCards', delay: 600 },
  { action: 'toast', message: 'Exploring dashboard metrics…', delay: 1000 },
  { action: 'openModal', title: 'CaloriesBurned', value: '2,847', description: 'Burned 2,847 calories — 14% more than last week!', delay: 1500 },
  { action: 'closeModal', delay: 800 },
  { action: 'navigate', target: 'Workouts', delay: 1000 },
  { action: 'highlight', target: 'App.Screens.Workouts.WorkoutForm', delay: 800 },
  { action: 'toast', message: 'Fill in the workout form!', delay: 1200 },
  { action: 'navigate', target: 'Progress', delay: 1000 },
  { action: 'highlight', target: 'App.Screens.Progress.StatsCards', delay: 800 },
  { action: 'select', target: 'App.Screens.Progress.StatsCards', name: 'StatsCards', delay: 600 },
  { action: 'navigate', target: 'Profile', delay: 1000 },
  { action: 'highlight', target: 'App.Screens.Profile.SettingsForm', delay: 800 },
  { action: 'toast', message: 'Demo complete! 🎉', delay: 600 },
  { action: 'clearHighlight', delay: 400 },
];

// SECTION 4 — Component Implementation
export default function PlayDemoController() {
  const { actions } = usePreviewState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);

  const totalSteps = DEFAULT_JOURNEY.length;

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelledRef.current = true;
    setIsPlaying(false);
    setStepIndex(-1);
    actions.clearHighlight();
  }, [actions]);

  useEffect(() => () => cleanup(), [cleanup]);

  const executeStep = useCallback((index) => {
    if (cancelledRef.current || index >= DEFAULT_JOURNEY.length) {
      setIsPlaying(false);
      setStepIndex(-1);
      actions.clearHighlight();
      return;
    }

    const step = DEFAULT_JOURNEY[index];
    setStepIndex(index);

    switch (step.action) {
      case 'navigate':     actions.navigate(step.target); break;
      case 'highlight':    actions.highlight(step.target); break;
      case 'clearHighlight': actions.clearHighlight(); break;
      case 'select':       actions.select(step.target, step.name || step.target); break;
      case 'openModal':    actions.openModal({ title: step.title, value: step.value, description: step.description }); break;
      case 'closeModal':   actions.closeModal(); break;
      case 'toast':        actions.showToast(step.message); break;
      default: break;
    }

    timerRef.current = setTimeout(() => executeStep(index + 1), step.delay || 800);
  }, [actions]);

  const startDemo = () => {
    if (isPlaying) return;
    cancelledRef.current = false;
    setIsPlaying(true);
    executeStep(0);
  };

  const progress = isPlaying && stepIndex >= 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={isPlaying ? cleanup : startDemo}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${
            isPlaying ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          }`}
        >
          {isPlaying ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4 fill-emerald-700" /> Play Demo</>}
        </button>
        {isPlaying && (
          <button
            onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); executeStep(stepIndex + 1); }}
            className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all duration-200"
            title="Skip step"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        )}
      </div>

      {isPlaying && (
        <div className="space-y-1">
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Step {stepIndex + 1}/{totalSteps}</span>
            <span>{DEFAULT_JOURNEY[stepIndex]?.action}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// SECTION 5 — Export (default export above)
