/**
 * DomainClassifier - Identifies the app domain of a user prompt.
 *
 * The classifier answers two questions on every request:
 *   1. What domain does this prompt belong to?
 *   2. Is it a refinement of the current session (same domain) or a
 *      completely new idea (domain shift)?
 *
 * Same domain → merge prompts, feed LLM the accumulated context.
 * Domain shift → preserve old session, open a fresh one.
 *
 * Classification is entirely heuristic (no API call) for first prompts.
 * Subsequent prompts use a three-condition test: keyword overlap, domain
 * topic divergence, and absence of modification-intent verbs.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Domain keyword map ────────────────────────────────────────────────────────
const DOMAINS = {
  food_delivery:  ['food', 'delivery', 'restaurant', 'order', 'meal', 'grocery', 'cooking', 'recipe', 'menu', 'driver'],
  ecommerce:      ['shop', 'store', 'product', 'cart', 'checkout', 'payment', 'inventory', 'order', 'shipping'],
  social_media:   ['social', 'post', 'feed', 'follow', 'like', 'comment', 'share', 'profile', 'messaging', 'chat'],
  finance:        ['bank', 'finance', 'money', 'payment', 'transaction', 'budget', 'investment', 'crypto', 'wallet', 'account'],
  health_fitness: ['health', 'fitness', 'workout', 'exercise', 'gym', 'medical', 'doctor', 'patient', 'wellness', 'tracking'],
  education:      ['learn', 'course', 'student', 'teacher', 'class', 'lesson', 'quiz', 'education', 'school', 'training'],
  productivity:   ['task', 'todo', 'project', 'calendar', 'schedule', 'note', 'collaboration', 'team', 'workflow'],
  entertainment:  ['game', 'video', 'movie', 'music', 'streaming', 'entertainment', 'media', 'player'],
  travel:         ['travel', 'trip', 'booking', 'hotel', 'flight', 'vacation', 'destination', 'tour'],
  real_estate:    ['property', 'real estate', 'apartment', 'house', 'rent', 'lease', 'mortgage', 'agent'],
};

// Verbs that indicate the user wants to CHANGE the existing prototype.
// If these are present, a domain shift is very unlikely.
const MOD_VERBS = /\b(add|change|update|modify|improve|fix|remove|tweak|adjust|set|turn)\b|\bmake\b(?!\s+(?:a|an|new)\b)/i;

const OVERLAP_THRESHOLD    = 0.15;  // below this + no mod-verbs = domain shift
const CONFIDENCE_THRESHOLD = 0.3;   // minimum score to assign a known domain

export class DomainClassifier {
  /**
   * Determine if a new prompt continues the current session or starts a new one.
   *
   * @param {string} prompt         Raw user prompt (before enhancement).
   * @param {string|null} current   Current session domain, or null for first prompts.
   * @returns {Promise<{ isSameDomain: boolean, domain: string, score: number, message: string }>}
   */
  async detect(prompt, current) {
    if (prompt.includes('FORCE_CHANGE')) {
      return { isSameDomain: false, domain: 'forced_domain', oldDomain: current, message: 'Forced via debug token.' };
    }

    console.log('\n=== DOMAIN CLASSIFIER ===');
    console.log('Prompt preview:', prompt.substring(0, 80));
    console.log('Current domain:', current);

    // First prompt – no existing domain to compare against.
    if (!current) {
      const inferred = this._inferDomain(prompt);
      console.log('First prompt → inferred:', inferred.name, '(score:', inferred.score, ')');
      return { isSameDomain: true, domain: inferred.name, score: inferred.score, message: `Session opened in domain: "${inferred.name}"` };
    }

    try {
      const newKeywords = this._getKeywords(prompt);
      const curKeywords = this._getDomainWords(current);
      const overlap     = this._getOverlapScore(newKeywords, curKeywords);
      const newDomain   = this._inferDomain(prompt);
      const isModifying = MOD_VERBS.test(prompt);
      const isDifferent = this._isNewDomain(newDomain.name, current);

      console.log('Overlap score:', overlap.toFixed(3));
      console.log('Inferred domain:', newDomain.name, '| Mod-intent:', isModifying);

      // Three-condition domain shift: topic different + low overlap + no modification verbs.
      if (isDifferent && overlap < OVERLAP_THRESHOLD && !isModifying) {
        console.log('>>> DOMAIN SHIFT');
        return { isSameDomain: false, domain: newDomain.name, oldDomain: current, score: newDomain.score, message: `Shifted from "${current}" to "${newDomain.name}". Starting new session.` };
      }

      console.log('>>> Same domain – merging into current session.');
      return { isSameDomain: true, domain: current, score: overlap, message: `Prompt merged into "${current}" session.` };

    } catch (err) {
      console.error('[DomainClassifier] Error:', err.message);
      // On failure, conservatively stay in the current domain.
      return { isSameDomain: true, domain: current, score: 0.5, message: `Kept domain "${current}" due to error.` };
    }
  }

  /**
   * Score a prompt against all known domains and return the best match.
   *
   * @param {string} prompt
   * @returns {{ name: string, score: number }}
   */
  _inferDomain(prompt) {
    const words = this._getKeywords(prompt);
    let topDomain = 'general', topScore = 0;

    for (const [key, kws] of Object.entries(DOMAINS)) {
      const matches  = words.filter(w => kws.includes(w)).length;
      const coverage = words.length > 0 ? matches / words.length : 0;
      const absolute = matches >= 2 ? 0.4 + matches * 0.1 : 0;
      const score    = Math.max(coverage, absolute);

      if (score > topScore && score >= CONFIDENCE_THRESHOLD) {
        topScore = score;
        topDomain = key;
      }
    }

    const name = topDomain === 'general'
      ? this._makeName(prompt)
      : topDomain.replace(/_/g, ' ');

    return { name, score: topScore };
  }

  /**
   * Check if two domain names represent different application categories.
   *
   * @param {string} a
   * @param {string} b
   * @returns {boolean}
   */
  _isNewDomain(a, b) {
    const norm = d => d.toLowerCase().replace(/[\s_-]+/g, '_');
    return norm(a) !== norm(b);
  }

  /**
   * Compute a Jaccard-weighted similarity score between two keyword sets,
   * boosted by co-occurrence within the same predefined domain vocabulary.
   *
   * @param {string[]} a
   * @param {string[]} b
   * @returns {number} Score in [0, 1].
   */
  _getOverlapScore(a, b) {
    const setA = new Set(a), setB = new Set(b);
    const inter = [...setA].filter(w => setB.has(w)).length;
    const union = new Set([...setA, ...setB]).size;
    const jaccard = union === 0 ? 0 : inter / union;

    let bonus = 0;
    for (const kws of Object.values(DOMAINS)) {
      const ma = a.filter(w => kws.includes(w)).length;
      const mb = b.filter(w => kws.includes(w)).length;
      if (ma > 0 && mb > 0) bonus += Math.min(ma, mb) / Math.max(ma, mb);
    }

    return jaccard * 0.6 + Math.min(bonus, 1) * 0.4;
  }

  /**
   * Expand a domain name into its full keyword set.
   * Used when building the reference keyword set for the current session.
   *
   * @param {string} domain
   * @returns {string[]}
   */
  _getDomainWords(domain) {
    const key = domain.toLowerCase().replace(/\s+/g, '_');
    const predefined = DOMAINS[key] || [];
    return [...new Set([...this._getKeywords(domain), ...predefined])];
  }

  /**
   * Tokenise text into lowercase, de-stopped signal keywords.
   *
   * @param {string} text
   * @returns {string[]}
   */
  _getKeywords(text) {
    const stop = new Set([
      'the','and','for','are','but','not','you','all','can','had','was',
      'one','our','out','get','has','him','how','new','now','see','two',
      'way','who','did','its','let','put','say','too','use','with','have',
      'this','will','your','from','they','know','want','been','good','much',
      'some','time','when','come','just','like','long','make','many','over',
      'take','than','them','well','were','that','also','into','more','here',
      'what','app','build','create','need','system','platform','tool','website',
    ]);
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !stop.has(w));
  }

  /**
   * Build a short domain name from a free-form prompt when no predefined
   * domain reaches the confidence threshold.
   *
   * @param {string} prompt
   * @returns {string}
   */
  _makeName(prompt) {
    const skip = new Set(['app', 'platform', 'system', 'tool', 'dashboard', 'website', 'service', 'application',
                          'build', 'create', 'make', 'want', 'need', 'like', 'that', 'with', 'this', 'from', 'have']);
    const words = prompt.toLowerCase().split(/\s+/)
      .filter(w => w.length > 3 && !skip.has(w))
      .slice(0, 2);
    return words.length > 0 ? words.join(' ') : 'general';
  }

  /**
   * Fallback: use Gemini to classify the domain when heuristics are insufficient.
   * Uses the lightest available model to conserve API quota.
   *
   * @param {string} prompt
   * @returns {Promise<{ domain: string, score: number }>}
   */
  async detectWithAI(prompt) {
    const models = ['gemini-2.0-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash'];
    const sysInstruction = `You are a domain classifier. Given a user prompt, classify it into one of: ${Object.keys(DOMAINS).join(', ')}, or "general". Respond with JSON: { "domain": "domain_name", "confidence": 0.0-1.0 }`;

    for (const model of models) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: `Classify: "${prompt}"`,
          config: { systemInstruction: sysInstruction, temperature: 0.2, maxOutputTokens: 100, responseMimeType: 'application/json' },
        });
        const text  = res.text;
        const start = text.indexOf('{'), end = text.lastIndexOf('}') + 1;
        const data  = JSON.parse(text.substring(start, end) || text);
        return { domain: data.domain || 'general', score: data.confidence || 0.5 };

      } catch (err) {
        const retryable = err.message?.toLowerCase().match(/429|503|resource_exhausted|not_found/);
        if (retryable) { console.warn(`[DomainClassifier] ${model} busy, trying next...`); continue; }
        console.error(`[DomainClassifier] detectWithAI error (${model}):`, err.message);
        break;
      }
    }

    return { domain: 'general', score: 0.5 };
  }

  // Backward-compat alias for code that still calls classifyWithLLM()
  async classifyWithLLM(prompt) { return this.detectWithAI(prompt); }
}

export default new DomainClassifier();
