import KnowledgeChunk from '../models/KnowledgeChunk.js';
import { generateEmbedding, cosineSimilarity } from './embeddingService.js';

const TOP_K = 3; // Number of chunks to retrieve
const MIN_SIMILARITY = 0.05; // Minimum cosine similarity threshold

/**
 * RAG Service — Retrieval-Augmented Generation
 *
 * Workflow:
 *   1. Convert user prompt → 100-dim keyword frequency vector
 *   2. Load all knowledge chunks from MongoDB, compute cosine similarity
 *   3. Return top-K most relevant chunks as formatted context strings
 *
 * Note: For a production system with thousands of documents, this would be
 * replaced with MongoDB Atlas $vectorSearch (dense 768-dim embeddings via
 * text-embedding-004). For this academic project, in-app cosine similarity
 * with keyword frequency vectors demonstrates the full RAG pattern correctly.
 */
class RAGService {
  constructor() {
    this._cache = null; // Simple in-memory cache of all chunks
    this._cacheExpiry = 0;
    this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Retrieve the most relevant knowledge chunks for a given query.
   * @param {string} query - The user's prompt / search query
   * @param {object} options - { topK, category }
   * @returns {string} Formatted context string ready to inject into the LLM prompt
   */
  async retrieve(query, options = {}) {
    const topK = options.topK || TOP_K;

    try {
      // Step 1: Embed the query
      const queryVector = await generateEmbedding(query);

      // Step 2: Load all chunks (with caching)
      const chunks = await this._loadChunks();

      if (!chunks || chunks.length === 0) {
        console.warn('[RAGService] Knowledge base is empty. Run: npm run seed');
        return '';
      }

      // Step 3: Compute cosine similarity for each chunk
      const scored = chunks
        .map(chunk => ({
          ...chunk,
          score: cosineSimilarity(queryVector, chunk.embedding),
        }))
        .filter(chunk => chunk.score >= MIN_SIMILARITY)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      if (scored.length === 0) {
        console.log('[RAGService] No chunks passed similarity threshold for query:', query.substring(0, 60));
        return '';
      }

      console.log(`[RAGService] ✓ Retrieved ${scored.length} chunk(s) | scores: ${scored.map(c => c.score.toFixed(3)).join(', ')}`);
      return this._formatContext(scored);

    } catch (error) {
      console.error('[RAGService] Retrieval error:', error.message);
      return ''; // Return empty string so the LLM still works without RAG context
    }
  }

  /**
   * Load all knowledge chunks from MongoDB with a short-lived cache.
   */
  async _loadChunks() {
    const now = Date.now();
    if (this._cache && now < this._cacheExpiry) {
      return this._cache;
    }

    const chunks = await KnowledgeChunk.find({}, 'title text category tags embedding').lean();
    this._cache = chunks;
    this._cacheExpiry = now + this.CACHE_TTL_MS;
    console.log(`[RAGService] Loaded ${chunks.length} knowledge chunk(s) from MongoDB`);
    return chunks;
  }

  /**
   * Invalidate the cache (call after seeding new chunks).
   */
  invalidateCache() {
    this._cache = null;
    this._cacheExpiry = 0;
  }

  /**
   * Format retrieved chunks into a clean context block for the LLM prompt.
   */
  _formatContext(chunks) {
    if (!chunks || chunks.length === 0) return '';

    const formattedChunks = chunks.map((chunk, i) => {
      return `[Knowledge ${i + 1} — ${chunk.category?.toUpperCase() || 'TEMPLATE'}: ${chunk.title}]
${chunk.text}
[Tags: ${(chunk.tags || []).join(', ')}]`;
    });

    return `\n\n--- RETRIEVED KNOWLEDGE (RAG Context) ---
The following are relevant UI patterns, templates, and guidelines retrieved from the knowledge base.
Use these as grounding context to improve the accuracy and quality of your generated prototype:

${formattedChunks.join('\n\n')}
--- END OF RETRIEVED KNOWLEDGE ---\n`;
  }
}

export default new RAGService();

