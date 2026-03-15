/**
 * ============================================================
 * SECTION 1 — Purpose
 * ============================================================
 * Component Registry — the mapping layer between layout JSON
 * node names and real React components.
 *
 * The LayoutRenderer does NOT hard-code which components exist.
 * Instead it calls resolveComponent(key) which consults this
 * registry. This makes the system extensible: to add a new
 * component type, register it here — no LayoutRenderer changes.
 *
 * Two resolution strategies:
 *   1. Exact match     — key "StatsCard" → StatsCard component
 *   2. Heuristic match — key "MyHeader" contains "header" → Header
 * ============================================================
 */

// ============================================================
// SECTION 2 — Imports  (lazy — components are registered below)
// ============================================================
import Header    from '../components/navigation/Header';
import Nav       from '../components/navigation/Nav';
import StatsCard from '../components/ui/StatsCard';
import Button    from '../components/ui/Button';
import Card      from '../components/ui/Card';
import FormField from '../components/ui/FormField';
import ListItem  from '../components/ui/ListItem';

// ============================================================
// SECTION 3 — Registry Data Structure
// ============================================================

/**
 * Exact-name registry.
 * Keys are case-insensitive component type names.
 * Values are { component, category, description }.
 */
const REGISTRY = {
  header:    { component: Header,    category: 'navigation', description: 'Top navigation bar with search and profile' },
  nav:       { component: Nav,       category: 'navigation', description: 'Horizontal navigation tabs with active state' },
  navigation:{ component: Nav,       category: 'navigation', description: 'Alias for Nav' },
  statscard: { component: StatsCard, category: 'ui',         description: 'Metric card with trend indicator' },
  button:    { component: Button,    category: 'ui',         description: 'Interactive action button' },
  card:      { component: Card,      category: 'ui',         description: 'Generic content card' },
  formfield: { component: FormField, category: 'ui',         description: 'Labelled text input with validation' },
  listitem:  { component: ListItem,  category: 'ui',         description: 'Single row in a list' },
};

/**
 * Heuristic rules — checked when exact match fails.
 * Each rule is { terms: string[], component, renderHint }.
 *
 * renderHint tells the LayoutRenderer how to treat the children:
 *   'component'  → pass data as props to the matched component
 *   'arrayCards' → if value is array, render each item as individual cards
 */
const HEURISTICS = [
  { terms: ['header', 'topbar', 'appbar'],       component: Header,    renderHint: 'component' },
  { terms: ['nav', 'menu', 'sidebar', 'tabs'],   component: Nav,       renderHint: 'component' },
  { terms: ['stat', 'card', 'metric', 'kpi'],    component: StatsCard, renderHint: 'arrayCards' },
];

/**
 * Array-type heuristics — used to decide how to render arrays
 * based on the parent key name.
 */
const ARRAY_HEURISTICS = [
  { terms: ['form', 'field', 'input', 'setting'],  type: 'formFields' },
  { terms: ['button', 'action', 'cta'],             type: 'buttons' },
  { terms: ['list', 'activity', 'items', 'recent', 'workout', 'chart'], type: 'listItems' },
];

// ============================================================
// SECTION 4 — Resolution Functions
// ============================================================

/**
 * Resolve a layout key to a registered component.
 * Returns { component, renderHint } or null if no match.
 */
export function resolveComponent(key) {
  const normalised = key.toLowerCase().replace(/[^a-z]/g, '');

  // 1. Exact match
  if (REGISTRY[normalised]) {
    return { component: REGISTRY[normalised].component, renderHint: 'component' };
  }

  // 2. Heuristic match
  for (const rule of HEURISTICS) {
    if (rule.terms.some((t) => normalised.includes(t))) {
      return { component: rule.component, renderHint: rule.renderHint };
    }
  }

  return null;
}

/**
 * Resolve how to render an array based on its parent key.
 * Returns 'formFields' | 'buttons' | 'listItems' | 'pills' (default).
 */
export function resolveArrayType(parentKey) {
  const k = parentKey.toLowerCase();
  for (const rule of ARRAY_HEURISTICS) {
    if (rule.terms.some((t) => k.includes(t))) {
      return rule.type;
    }
  }
  return 'pills';
}

/**
 * Check if a key represents a screen container.
 */
export function isScreenContainer(key) {
  return key.toLowerCase().includes('screen');
}

// ============================================================
// SECTION 5 — Exports & Introspection
// ============================================================

/** Returns the full registry for the Inspector panel */
export function getRegisteredComponents() {
  return Object.entries(REGISTRY).map(([name, entry]) => ({
    name,
    category: entry.category,
    description: entry.description,
  }));
}

export default {
  resolveComponent,
  resolveArrayType,
  isScreenContainer,
  getRegisteredComponents,
};
