/**
 * SessionManager - Tracks prototype session state across multiple prompt turns.
 *
 * A session = one continuous design conversation. Users send multiple prompts
 * that progressively refine the same prototype. This service:
 *   1. Stores each prompt turn in MongoDB.
 *   2. Accumulates requirements across turns, resolving conflicts (newest wins).
 *   3. Supplies the assembled context the LLM needs for incremental updates.
 *   4. Resets accumulated state when the domain classifier detects a new topic.
 */

import crypto from 'crypto';
import Session from '../models/Session.js';

// Maximum requirements kept in the canonical list (oldest evicted when full).
const MAX_REQS = 8;

export class SessionManager {
  // ── Session CRUD ────────────────────────────────────────────────────────────

  /** Create and persist a blank session. */
  async createSession() {
    const id = crypto.randomUUID ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const s = new Session({ sessionId: id, changeLog: [] });
    await s.save();
    return s.toObject();
  }

  /**
   * Load an existing session, or create one if the ID doesn't exist yet.
   * @param {string} id
   * @returns {Promise<Session>}
   */
  async getSession(id) {
    let s = await Session.findOne({ sessionId: id });
    if (!s) {
      s = new Session({ sessionId: id, changeLog: [] });
      await s.save();
    }
    return s;
  }

  /** Delete a session and all its data. */
  async clearSession(id) {
    await Session.deleteOne({ sessionId: id });
  }

  // ── Context Assembly ────────────────────────────────────────────────────────

  /**
   * Build the context object passed to the LLM for continuation prompts.
   * Includes the previous layout and files so the model can make targeted
   * edits rather than regenerating everything from scratch.
   *
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getContext(id) {
    const s = await this.getSession(id);
    return {
      domain:              s.domain,
      title:               s.title,
      requirements:        s.mergedRequirements,
      canonicalRequirements: s.canonicalRequirements,
      total_prompt_count:  s.totalPromptCount,
      merged_prompt_count: s.mergedPromptCount,
      change_log:          s.changeLog,
      previousLayout:      s.lastOutput?.content?.layout || null,
      previousFiles:       s.lastOutput?.files || s.lastOutput?.metadata?.files || null,
    };
  }

  // ── Prompt Recording ────────────────────────────────────────────────────────

  /**
   * Save a new user prompt turn and update session counters.
   * When a domain shift is detected the session resets so the old
   * prototype's requirements don't bleed into the new one.
   *
   * @param {string} id            Session ID.
   * @param {string} promptText    Enhanced prompt text.
   * @param {object} domain        Result from AppDomainClassifier.detect().
   * @returns {Promise<object>}    Updated session as a plain object.
   */
  async addPrompt(id, promptText, domain) {
    const s = await this.getSession(id);
    const now = new Date().toISOString();

    s.prompts.push({ text: promptText, timestamp: now, domain: domain.domain });
    s.totalPromptCount++;

    if (domain.isSameDomain === false) {
      // Domain shift – wipe accumulated state for the old prototype.
      s.mergedPromptCount = 1;
      s.mergedRequirements = { functional: [], non_functional: [] };
      s.canonicalRequirements = [];
      s.changeLog = [{ when: now, note: `New prototype started – ${this._summarize(promptText)}` }];
    } else {
      s.mergedPromptCount++;
      s.changeLog.push({ when: now, note: this._summarize(promptText) });
    }

    s.domain = domain.domain;
    await s.save();
    return s.toObject();
  }

  // ── Output Saving ───────────────────────────────────────────────────────────

  /**
   * Write the LLM's structured output back into the session.
   * Also merges any new requirements into the canonical list.
   *
   * @param {string} id
   * @param {object} output  Validated LLM output.
   * @returns {Promise<object>}
   */
  async saveResult(id, output) {
    const s = await this.getSession(id);

    if (output.metadata?.title) s.title = output.metadata.title;

    if (output.content?.requirements) {
      const incoming = Array.isArray(output.content.requirements)
        ? output.content.requirements
        : output.content.requirements.functional || [];
      this._mergeReqs(s, incoming);
    }

    s.lastOutput = output;
    await s.save();
    return s.toObject();
  }

  // ── Requirement Merging ─────────────────────────────────────────────────────

  /**
   * Merge incoming requirements into the session's canonical list.
   * Mutates the session document in place – caller must save afterwards.
   *
   * Conflict rule: if a new requirement has ≥50% keyword overlap with an
   * existing one, the newer version replaces the older one.
   *
   * @param {Session} s
   * @param {string[]} incoming
   */
  _mergeReqs(s, incoming) {
    const now = new Date().toISOString();

    for (const req of incoming) {
      const conflict = this._findConflict(req, s.canonicalRequirements);

      if (conflict) {
        s.changeLog.push({ when: now, note: `Updated: "${conflict}" → "${req}"` });
        s.canonicalRequirements = s.canonicalRequirements.filter(r => r !== conflict);
        s.canonicalRequirements.push(req);
      } else if (!this._isDuplicate(req, s.canonicalRequirements)) {
        s.canonicalRequirements.push(req);
      }
    }

    // FIFO eviction when list is too long.
    if (s.canonicalRequirements.length > MAX_REQS) {
      const dropped = s.canonicalRequirements.length - MAX_REQS;
      s.canonicalRequirements = s.canonicalRequirements.slice(-MAX_REQS);
      s.changeLog.push({ when: new Date().toISOString(), note: `${dropped} older requirement(s) evicted` });
    }

    s.mergedRequirements = { functional: s.canonicalRequirements, non_functional: [] };
  }

  /**
   * Find an existing requirement that conflicts with the incoming one
   * (≥50% keyword overlap).
   *
   * @param {string} incoming
   * @param {string[]} existing
   * @returns {string|null}
   */
  _findConflict(incoming, existing) {
    const inWords = this._getKeywords(incoming);
    for (const req of existing) {
      const exWords = this._getKeywords(req);
      const shared  = inWords.filter(w => exWords.includes(w)).length;
      if (shared >= Math.min(inWords.length, exWords.length) * 0.5) return req;
    }
    return null;
  }

  /**
   * Check if the incoming requirement is already in the list (exact / near-exact).
   *
   * @param {string} incoming
   * @param {string[]} existing
   * @returns {boolean}
   */
  _isDuplicate(incoming, existing) {
    const norm = s => s.toLowerCase().replace(/\W/g, '');
    const a = norm(incoming);
    return existing.some(r => { const b = norm(r); return a === b || a.includes(b) || b.includes(a); });
  }

  /**
   * Extract content-bearing keywords from a requirement string.
   *
   * @param {string} text
   * @returns {string[]}
   */
  _getKeywords(text) {
    const stop = new Set(['should', 'must', 'will', 'that', 'with', 'from', 'have', 'this', 'able', 'user']);
    return text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stop.has(w));
  }

  /**
   * Produce a short one-liner summary of a prompt for the change log.
   *
   * @param {string} text
   * @returns {string}
   */
  _summarize(text) {
    const first = text.split(/[.!?]/)[0].trim();
    return first.length > 60 ? `${first.substring(0, 60)}...` : first;
  }

  // ── Backward-compat aliases ─────────────────────────────────────────────────
  /** @deprecated Use addPrompt() */
  async recordPromptTurn(id, text, domain) { return this.addPrompt(id, text, domain); }

  /** @deprecated Use saveResult() */
  async updateWithOutput(id, output) { return this.saveResult(id, output); }

  /** @deprecated */
  async mergeRequirements(id, reqs) {
    if (!Array.isArray(reqs)) return [];
    const s = await this.getSession(id);
    this._mergeReqs(s, reqs);
    await s.save();
    return s.canonicalRequirements;
  }
}

export default new SessionManager();
