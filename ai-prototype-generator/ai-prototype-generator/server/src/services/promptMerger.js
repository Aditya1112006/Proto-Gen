/**
 * Service for merging prompts and managing prototype state via MongoDB
 */
import crypto from 'crypto';
import Session from '../models/Session.js';

export class PromptMerger {
  /**
   * Create a new session
   * @returns {Object} New session object
   */
  async createSession() {
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session = new Session({
      sessionId,
      changeLog: []
    });
    await session.save();
    return session.toObject();
  }

  /**
   * Get or initialize session state
   */
  async getSession(sessionId) {
    let session = await Session.findOne({ sessionId });
    if (!session) {
      session = new Session({
        sessionId,
        changeLog: []
      });
      await session.save();
    }
    return session;
  }

  /**
   * Add a new prompt to the session
   */
  async addPrompt(sessionId, prompt, domainInfo) {
    const session = await this.getSession(sessionId);

    const timestamp = new Date().toISOString();
    session.prompts.push({
      text: prompt,
      timestamp,
      domain: domainInfo.domain
    });

    session.totalPromptCount++;

    // domainInfo.isSameDomain === false means different domain → clear context
    if (domainInfo.isSameDomain === false) {
      // Reset for new domain
      session.mergedPromptCount = 1;
      session.mergedRequirements = { functional: [], non_functional: [] };
      session.canonicalRequirements = [];
      session.changeLog = [{
        when: timestamp,
        note: `New prototype started - ${this.summarizeChange(prompt)}`
      }];
    } else {
      session.mergedPromptCount++;
      session.changeLog.push({
        when: timestamp,
        note: this.summarizeChange(prompt)
      });
    }

    session.domain = domainInfo.domain;

    await session.save();
    return session.toObject();
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
   * @param {string} sessionId
   * @param {Array} newRequirementsArray - Array of requirement strings
   * @returns {Array} Merged requirements array
   */
  async mergeRequirements(sessionId, newRequirementsArray) {
    const session = await this.getSession(sessionId);

    if (!Array.isArray(newRequirementsArray)) {
      return session.canonicalRequirements;
    }

    const timestamp = new Date().toISOString();

    // Deduplicate and merge, keeping max 8 items
    for (const newReq of newRequirementsArray) {
      // Check for conflicts
      const conflict = this.findConflict(newReq, session.canonicalRequirements);
      if (conflict) {
        // Prefer newer, note conflict in changeLog
        session.changeLog.push({
          when: timestamp,
          note: `Updated requirement: "${conflict}" → "${newReq}"`
        });
        // Remove conflict and add new
        session.canonicalRequirements = session.canonicalRequirements.filter(r => r !== conflict);
        session.canonicalRequirements.push(newReq);
      } else if (!this.isDuplicate(newReq, session.canonicalRequirements)) {
        session.canonicalRequirements.push(newReq);
      }
    }

    // Limit to 8 items
    if (session.canonicalRequirements.length > 8) {
      const removed = session.canonicalRequirements.length - 8;
      session.canonicalRequirements = session.canonicalRequirements.slice(-8);
      session.changeLog.push({
        when: timestamp,
        note: `Limited to 8 requirements (removed ${removed} older items)`
      });
    }

    // Also update mergedRequirements for backwards compatibility
    session.mergedRequirements = {
      functional: session.canonicalRequirements,
      non_functional: []
    };

    await session.save();
    return session.canonicalRequirements;
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
  async clearSession(sessionId) {
    await Session.deleteOne({ sessionId });
  }

  /**
   * Get current context for LLM
   */
  async getContext(sessionId) {
    const session = await this.getSession(sessionId);
    return {
      domain: session.domain,
      title: session.title,
      requirements: session.mergedRequirements,
      canonicalRequirements: session.canonicalRequirements,
      total_prompt_count: session.totalPromptCount,
      merged_prompt_count: session.mergedPromptCount,
      change_log: session.changeLog
    };
  }

  /**
   * Update session with LLM output
   */
  async updateWithOutput(sessionId, output) {
    const session = await this.getSession(sessionId);

    if (output.metadata?.title) {
      session.title = output.metadata.title;
    }

    if (output.content?.requirements) {
      // Handle both array and object formats
      const reqs = Array.isArray(output.content.requirements)
        ? output.content.requirements
        : output.content.requirements.functional || [];
      
      // We process the requirements memory update synchronously here, then save below
      const timestamp = new Date().toISOString();
      for (const newReq of reqs) {
        const conflict = this.findConflict(newReq, session.canonicalRequirements);
        if (conflict) {
          session.changeLog.push({ when: timestamp, note: `Updated requirement: "${conflict}" → "${newReq}"` });
          session.canonicalRequirements = session.canonicalRequirements.filter(r => r !== conflict);
          session.canonicalRequirements.push(newReq);
        } else if (!this.isDuplicate(newReq, session.canonicalRequirements)) {
          session.canonicalRequirements.push(newReq);
        }
      }
      if (session.canonicalRequirements.length > 8) {
        session.canonicalRequirements = session.canonicalRequirements.slice(-8);
      }
      session.mergedRequirements = { functional: session.canonicalRequirements, non_functional: [] };
    }

    session.lastOutput = output;

    await session.save();
    return session.toObject();
  }
}

export default new PromptMerger();
