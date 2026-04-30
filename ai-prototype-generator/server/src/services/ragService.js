/**
 * RAG Service - Retrieves the most relevant UI/UX knowledge for a given prompt.
 *
 * Pipeline:
 *   1. Detect a likely intent category from the query (optional pre-filter).
 *   2. Load all knowledge chunks from MongoDB (cached for 5 minutes).
 *   3. Pre-filter by category if a strong signal exists – avoids running
 *      cosine similarity over the whole corpus for every request.
 *   4. Score each candidate chunk against the query vector.
 *   5. Return the top-K chunks as a formatted context string for the LLM prompt.
 */

import KnowledgeChunk from '../models/KnowledgeChunk.js';
import { toVector, getSimilarity } from './embeddingService.js';

const TOP_K_DEFAULT   = 3;
const MIN_SCORE       = 0.05;
const CACHE_TTL_MS    = 5 * 60 * 1000; // 5 minutes

// Maps intent keywords to knowledge categories for the pre-filter step.
const INTENT_SIGNALS = {
  dashboard:   ['dashboard', 'analytics', 'admin', 'metrics', 'stats', 'panel'],
  navigation:  ['sidebar', 'navbar', 'menu', 'breadcrumb', 'navigation', 'header'],
  forms:       ['form', 'input', 'login', 'register', 'signup', 'validation', 'field'],
  ecommerce:   ['cart', 'checkout', 'product', 'shop', 'store', 'payment', 'order'],
  layout:      ['layout', 'grid', 'flex', 'responsive', 'card', 'container', 'section'],
  feedback:    ['toast', 'modal', 'alert', 'notification', 'dialog', 'confirmation'],
};

class RAGService {
  constructor() {
    this._cache = null;
    this._cacheExpiry = 0;
  }

  /**
   * Find and return the most relevant knowledge chunks for a query.
   *
   * @param {string} query - User prompt or search string.
   * @param {{ topK?: number, forceCategory?: string }} opts
   * @returns {Promise<string>} Formatted context block ready to inject into the LLM.
   */
  async retrieve(query, opts = {}) {
    const topK = opts.topK || TOP_K_DEFAULT;

    try {
      // Build the query vector, load chunks, pre-filter, score, and rank.
      const queryVec = await toVector(query);
      const allChunks = await this._loadChunks();

      if (!allChunks.length) {
        console.warn('[RAGService] Knowledge base is empty – run: npm run seed');
        return '';
      }

      const category = opts.forceCategory || this._getCategory(query);
      const pool = category ? this._filterChunks(allChunks, category) : allChunks;

      if (category) {
        console.log(`[RAGService] Pre-filtered to "${category}" → ${pool.length} candidates`);
      }

      // If pre-filter removed everything, fall back to the full corpus.
      const searchPool = pool.length > 0 ? pool : allChunks;

      const ranked = searchPool
        .map(chunk => ({ ...chunk, score: getSimilarity(queryVec, chunk.embedding) }))
        .filter(chunk => chunk.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      if (!ranked.length) {
        console.log('[RAGService] No chunks passed relevance threshold for:', query.substring(0, 60));
        return '';
      }

      console.log(
        `[RAGService] ✓ ${ranked.length} chunk(s) | scores: ${ranked.map(c => c.score.toFixed(3)).join(', ')}`
      );

      return this._buildContext(ranked);

    } catch (err) {
      // RAG failures must never crash the generation pipeline.
      console.error('[RAGService] Retrieval error (non-fatal):', err.message);
      return '';
    }
  }

  /**
   * Detect the most likely intent category from a query string.
   * Returns null when no strong signal is found (< 2 keyword matches).
   *
   * @param {string} query
   * @returns {string|null}
   */
  _getCategory(query) {
    const q = query.toLowerCase();
    let best = null, max = 0;

    for (const [cat, signals] of Object.entries(INTENT_SIGNALS)) {
      const hits = signals.filter(s => q.includes(s)).length;
      if (hits > max) { max = hits; best = cat; }
    }

    return max >= 2 ? best : null;
  }

  /**
   * Keep only chunks that belong to the target category (or 'general').
   *
   * @param {Array} chunks
   * @param {string} category
   * @returns {Array}
   */
  _filterChunks(chunks, category) {
    return chunks.filter(c => !c.category || c.category === category || c.category === 'general');
  }

  /**
   * Load all knowledge chunks from MongoDB, using a short-lived in-memory cache
   * to avoid a DB round-trip on every generation request.
   *
   * @returns {Promise<Array>}
   */
  async _loadChunks() {
    if (this._cache && Date.now() < this._cacheExpiry) return this._cache;

    const chunks = await KnowledgeChunk.find({}, 'title text category tags embedding').lean();
    this._cache = chunks;
    this._cacheExpiry = Date.now() + CACHE_TTL_MS;
    console.log(`[RAGService] Loaded ${chunks.length} chunks from MongoDB`);
    return chunks;
  }

  /**
   * Invalidate the cache so the next retrieve() re-fetches from the DB.
   * Call this after seeding new knowledge chunks.
   */
  clearCache() {
    this._cache = null;
    this._cacheExpiry = 0;
    console.log('[RAGService] Cache cleared.');
  }

  /**
   * Format ranked chunks into a text block the LLM can read directly.
   *
   * @param {Array} chunks - Array of scored chunk objects.
   * @returns {string}
   */
  _buildContext(chunks) {
    if (!chunks || !chunks.length) return '';

    const entries = chunks.map((c, i) => {
      const cat  = (c.category || 'general').toUpperCase();
      const tags = (c.tags || []).join(', ');
      return `[Knowledge ${i + 1} — ${cat}: ${c.title}]\n${c.text}\n[Tags: ${tags}]`;
    });

    return [
      '\n\n--- RETRIEVED KNOWLEDGE (RAG Context) ---',
      'Use these retrieved UI patterns to improve the accuracy of the generated prototype:',
      '',
      entries.join('\n\n'),
      '--- END OF RETRIEVED KNOWLEDGE ---\n',
    ].join('\n');
  }
}

export default new RAGService();
