/**
 * EmbeddingService - Builds keyword-frequency vectors for RAG retrieval.
 *
 * Instead of calling a paid dense-embedding API, we project text onto a
 * curated 100-term UI/UX vocabulary and produce a normalised frequency vector.
 * Cosine similarity between two such vectors gives a meaningful relevance score
 * for the domain vocabulary this project uses.
 *
 * Upgrade path: swap toVector() with text-embedding-004 calls and getSimilarity()
 * with MongoDB Atlas $vectorSearch when moving to production scale.
 */

import dotenv from 'dotenv';
dotenv.config();

// ── 100-dimensional UI/UX vocabulary ─────────────────────────────────────────
const VOCAB = [
  // Layout & Navigation
  'dashboard', 'sidebar', 'navigation', 'header', 'footer', 'layout', 'grid', 'card', 'modal', 'drawer',
  // Auth & Forms
  'login', 'register', 'auth', 'authentication', 'password', 'form', 'input', 'button', 'checkbox', 'toggle',
  // E-commerce
  'ecommerce', 'cart', 'product', 'listing', 'checkout', 'payment', 'order', 'filter', 'search', 'sort',
  // Food & Booking
  'food', 'delivery', 'restaurant', 'menu', 'booking', 'appointment', 'schedule', 'calendar', 'map', 'tracking',
  // SaaS & Marketing
  'saas', 'landing', 'hero', 'cta', 'pricing', 'testimonial', 'feature', 'marketing', 'homepage', 'trial',
  // Data & Tables
  'table', 'pagination', 'data', 'row', 'column', 'export', 'bulk', 'select', 'edit', 'delete',
  // Visual & Themes
  'dark', 'light', 'theme', 'color', 'contrast', 'background', 'shadow', 'gradient', 'glassmorphism', 'blur',
  // Responsive & Mobile
  'mobile', 'responsive', 'tablet', 'desktop', 'hamburger', 'bottombar', 'breadcrumb', 'sticky', 'scroll', 'swipe',
  // Feedback & Accessibility
  'validation', 'error', 'success', 'warning', 'notification', 'toast', 'alert', 'feedback', 'accessibility', 'label',
  // Healthcare & Domain-Specific
  'healthcare', 'medical', 'patient', 'doctor', 'vitals', 'report', 'clinic', 'hospital', 'wellness', 'fitness',
];

// Pre-build the term→index map so lookups are O(1) at runtime.
const TERM_INDEX = Object.fromEntries(VOCAB.map((term, i) => [term, i]));
const DIMS = VOCAB.length; // 100

/**
 * Convert a text string into a normalised 100-dim frequency vector.
 *
 * @param {string} text - Any raw text to vectorise.
 * @returns {Promise<number[]>} Unit-length vector (L2-normalised).
 */
export async function toVector(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('[EmbeddingService] toVector() requires a non-empty string');
  }
  return _vectorize(text.toLowerCase());
}

/**
 * Compute cosine similarity between two equal-length vectors.
 * Returns a value in [0, 1] — higher means more similar.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function getSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Internal: count term occurrences and L2-normalise the result.
 * Word-boundary regex avoids partial matches (e.g. "cart" vs "cartoon").
 *
 * @param {string} text - Already lowercased text.
 * @returns {number[]}
 */
function _vectorize(text) {
  const vec = new Array(DIMS).fill(0);

  for (const [term, idx] of Object.entries(TERM_INDEX)) {
    const hits = text.match(new RegExp(`\\b${term}\\b`, 'gi'));
    if (hits) vec[idx] = hits.length;
  }

  // L2 normalisation makes the vector unit-length so cosine measures angle, not magnitude.
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vec.map(v => v / norm) : vec;
}

// Backward-compat alias for seed scripts that still call generateEmbedding().
export const generateEmbedding = toVector;
