/**
 * Service for merging prompts and managing prototype state
 */
export class PromptMerger {
  constructor() {
    this.state = new Map(); // sessionId -> prototype data
  }

  /**
   * Get or initialize session state
   */
  getSession(sessionId) {
    if (!this.state.has(sessionId)) {
      this.state.set(sessionId, {
        domain: null,
        title: null,
        prompts: [],
        mergedRequirements: [],
        changeLog: [],
        totalPromptCount: 0,
        mergedPromptCount: 0,
        lastOutput: null
      });
    }
    return this.state.get(sessionId);
  }

  /**
   * Add a new prompt to the session
   */
  addPrompt(sessionId, prompt, domainInfo) {
    const session = this.getSession(sessionId);

    session.prompts.push({
      text: prompt,
      timestamp: new Date().toISOString(),
      domain: domainInfo.domain
    });

    session.totalPromptCount++;

    // domainInfo.isSameDomain === false means different domain → clear context
    if (domainInfo.isSameDomain === false) {
      // Reset for new domain
      session.mergedPromptCount = 1;
      session.mergedRequirements = [];
      session.canonicalRequirements = [];
      session.changeLog = [`Prompt ${session.totalPromptCount}: New prototype started - ${this.summarizeChange(prompt)}`];
    } else {
      session.mergedPromptCount++;
      session.changeLog.push(`Prompt ${session.totalPromptCount}: ${this.summarizeChange(prompt)}`);
    }

    session.domain = domainInfo.domain;

    return session;
  }

  /**
   * Create a brief summary of what a prompt adds
   */
  summarizeChange(prompt) {
    // Simple extraction - get first 50 chars or until first sentence
    const summary = prompt.split(/[.!?]/)[0].trim();
    return summary.length > 60 ? summary.substring(0, 60) + '...' : summary;
  }

  /**
   * Merge requirements from LLM response
   */
  mergeRequirements(sessionId, newRequirements) {
    const session = this.getSession(sessionId);

    if (!session.mergedRequirements.length) {
      session.mergedRequirements = newRequirements;
      return session.mergedRequirements;
    }

    // Merge functional requirements
    if (newRequirements.functional) {
      const existing = new Set(session.mergedRequirements.functional || []);
      newRequirements.functional.forEach(req => {
        // Check for conflicts
        const conflict = this.findConflict(req, [...existing]);
        if (conflict) {
          // Prefer newer, note conflict
          session.changeLog.push(`Updated: "${conflict}" → "${req}"`);
          existing.delete(conflict);
          existing.add(req);
        } else if (!this.isDuplicate(req, [...existing])) {
          existing.add(req);
        }
      });
      session.mergedRequirements.functional = [...existing];
    }

    // Merge non-functional requirements
    if (newRequirements.non_functional) {
      const existing = new Set(session.mergedRequirements.non_functional || []);
      newRequirements.non_functional.forEach(req => {
        if (!this.isDuplicate(req, [...existing])) {
          existing.add(req);
        }
      });
      session.mergedRequirements.non_functional = [...existing];
    }

    // Limit to 8 functional requirements
    if (session.mergedRequirements.functional?.length > 8) {
      session.mergedRequirements.functional = session.mergedRequirements.functional.slice(0, 8);
      session.changeLog.push('Note: Limited to top 8 functional requirements');
    }

    return session.mergedRequirements;
  }

  /**
   * Check if two requirements conflict
   */
  findConflict(newReq, existingReqs) {
    const newKeywords = this.extractRequirementKeywords(newReq);

    for (const existing of existingReqs) {
      const existingKeywords = this.extractRequirementKeywords(existing);
      const overlap = newKeywords.filter(k => existingKeywords.includes(k));

      // If significant overlap, consider it a conflict
      if (overlap.length >= Math.min(newKeywords.length, existingKeywords.length) * 0.5) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Check if requirement is duplicate
   */
  isDuplicate(newReq, existingReqs) {
    const normalized = newReq.toLowerCase().replace(/[^\w]/g, '');
    return existingReqs.some(req => {
      const existingNorm = req.toLowerCase().replace(/[^\w]/g, '');
      return normalized === existingNorm ||
             normalized.includes(existingNorm) ||
             existingNorm.includes(normalized);
    });
  }

  /**
   * Extract key terms from requirement
   */
  extractRequirementKeywords(req) {
    return req.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['should', 'must', 'will', 'that', 'with', 'from', 'have', 'this'].includes(w));
  }

  /**
   * Clear session state
   */
  clearSession(sessionId) {
    this.state.delete(sessionId);
  }

  /**
   * Get current context for LLM
   */
  getContext(sessionId) {
    const session = this.getSession(sessionId);
    return {
      domain: session.domain,
      title: session.title,
      requirements: session.mergedRequirements,
      total_prompt_count: session.totalPromptCount,
      merged_prompt_count: session.mergedPromptCount,
      change_log: session.changeLog
    };
  }

  /**
   * Update session with LLM output
   */
  updateWithOutput(sessionId, output) {
    const session = this.getSession(sessionId);

    if (output.metadata?.title) {
      session.title = output.metadata.title;
    }

    if (output.content?.requirements) {
      this.mergeRequirements(sessionId, output.content.requirements);
    }

    session.lastOutput = output;

    return session;
  }
}

export default new PromptMerger();
