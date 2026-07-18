/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Central state manager for the Prototype Interaction Engine.
 * Uses React Context + useReducer to provide a single source of
 * truth for:
 *   • Screen navigation (currentScreen, previousScreen)
 *   • Component selection & highlight tracking
 *   • Modal lifecycle
 *   • Toast notification queue
 *   • Form input values
 *   • Full interaction audit log
 *
 * Every interactive component reads/writes through this state
 * instead of using local state or window events.
 * ============================================================
 */

// ============================================================
// SECTION 2 — Imports
// ============================================================
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from 'react';

// ============================================================
// SECTION 3 — Core Logic (Actions, Reducer, Mock Helpers)
// ============================================================

/** Enum-like action type constants */
const ACTIONS = {
  NAVIGATE:        'NAVIGATE',
  SET_HIGHLIGHT:   'SET_HIGHLIGHT',
  CLEAR_HIGHLIGHT: 'CLEAR_HIGHLIGHT',
  SELECT:          'SELECT',
  DESELECT:        'DESELECT',
  SET_MODAL:       'SET_MODAL',
  CLOSE_MODAL:     'CLOSE_MODAL',
  ADD_TOAST:       'ADD_TOAST',
  DISMISS_TOAST:   'DISMISS_TOAST',
  SET_INPUT_VALUE: 'SET_INPUT_VALUE',
};

/** Shape of the global preview state */
const initialState = {
  currentScreen:  'Home',
  previousScreen: null,
  highlightedPath: null,
  selectedPath:    null,
  selectedName:    null,
  modal:           null,      // { title, value, description } | null
  toasts:          [],        // [{ id, message }]
  inputValues:     {},        // { [fieldPath]: string }
  interactionLog:  [],        // [{ action, target, timestamp }]
};

/**
 * Pure reducer — every state transition flows through here.
 * Each case appends to the interactionLog so the Inspector
 * can display a live activity feed.
 */
function previewReducer(state, action) {
  const log = (act, target) => [
    ...state.interactionLog,
    { action: act, target, timestamp: Date.now() },
  ];

  switch (action.type) {
    case ACTIONS.NAVIGATE:
      return {
        ...state,
        previousScreen: state.currentScreen,
        currentScreen: action.payload,
        interactionLog: log('navigate', action.payload),
      };

    case ACTIONS.SET_HIGHLIGHT:
      return { ...state, highlightedPath: action.payload };

    case ACTIONS.CLEAR_HIGHLIGHT:
      return { ...state, highlightedPath: null };

    case ACTIONS.SELECT:
      return {
        ...state,
        selectedPath: action.payload.path,
        selectedName: action.payload.name,
        interactionLog: log('select', action.payload.name),
      };

    case ACTIONS.DESELECT:
      return { ...state, selectedPath: null, selectedName: null };

    case ACTIONS.SET_MODAL:
      return {
        ...state,
        modal: action.payload,
        interactionLog: log('openModal', action.payload?.title),
      };

    case ACTIONS.CLOSE_MODAL:
      return {
        ...state,
        modal: null,
        interactionLog: log('closeModal', null),
      };

    case ACTIONS.ADD_TOAST: {
      const id = Date.now();
      return {
        ...state,
        toasts: [...state.toasts, { id, message: action.payload }],
        interactionLog: log('toast', action.payload),
      };
    }

    case ACTIONS.DISMISS_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };

    case ACTIONS.SET_INPUT_VALUE:
      return {
        ...state,
        inputValues: {
          ...state.inputValues,
          [action.payload.path]: action.payload.value,
        },
      };

    default:
      return state;
  }
}

// ============================================================
// SECTION 4 — Provider Component
// ============================================================

const PreviewStateContext = createContext(null);

export function PreviewStateProvider({ children }) {
  const [state, dispatch] = useReducer(previewReducer, initialState);

  // Memoised action creators — stable references prevent re-renders
  const navigate      = useCallback((s) => dispatch({ type: ACTIONS.NAVIGATE, payload: s }), []);
  const highlight     = useCallback((p) => dispatch({ type: ACTIONS.SET_HIGHLIGHT, payload: p }), []);
  const clearHighlight= useCallback(()  => dispatch({ type: ACTIONS.CLEAR_HIGHLIGHT }), []);
  const select        = useCallback((path, name) => dispatch({ type: ACTIONS.SELECT, payload: { path, name } }), []);
  const deselect      = useCallback(()  => dispatch({ type: ACTIONS.DESELECT }), []);
  const openModal     = useCallback((d) => dispatch({ type: ACTIONS.SET_MODAL, payload: d }), []);
  const closeModal    = useCallback(()  => dispatch({ type: ACTIONS.CLOSE_MODAL }), []);
  const showToast     = useCallback((m) => dispatch({ type: ACTIONS.ADD_TOAST, payload: m }), []);
  const dismissToast  = useCallback((id)=> dispatch({ type: ACTIONS.DISMISS_TOAST, payload: id }), []);
  const setInputValue = useCallback((path, value) => dispatch({ type: ACTIONS.SET_INPUT_VALUE, payload: { path, value } }), []);

  const actions = useMemo(() => ({
    navigate, highlight, clearHighlight, select, deselect,
    openModal, closeModal, showToast, dismissToast, setInputValue,
  }), [navigate, highlight, clearHighlight, select, deselect, openModal, closeModal, showToast, dismissToast, setInputValue]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <PreviewStateContext.Provider value={value}>
      {children}
    </PreviewStateContext.Provider>
  );
}

// ============================================================
// SECTION 5 — Exports
// ============================================================

/**
 * Hook to access the preview state and actions.
 * Must be called from within a <PreviewStateProvider>.
 */
export function usePreviewState() {
  const ctx = useContext(PreviewStateContext);
  if (!ctx) throw new Error('usePreviewState must be used within <PreviewStateProvider>');
  return ctx;
}

// ─── Deterministic mock data helpers ───────────────────────────────

const MOCK_VALUES = {
  calories: 2847, steps: 12453, active: 87, weekly: '78%',
  total: 156, avg: 425, revenue: 9420, users: 1283, sessions: 342,
  bookings: 230, orders: 487, rating: '4.8', conversion: '3.2%',
};

/**
 * Generate a deterministic fake number/string from a title.
 * Same title always → same value (no flickering on re-render).
 */
export function getMockValue(title) {
  const key = title.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(MOCK_VALUES)) {
    if (key.includes(k)) return v;
  }
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 9000) + 100;
}

/** Deterministic positive/negative delta based on title hash */
export function getMockDelta(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  const val = (Math.abs(hash) % 20) + 1;
  const positive = (Math.abs(hash) % 100) > 25;
  return positive ? `+${val}%` : `-${val}%`;
}
