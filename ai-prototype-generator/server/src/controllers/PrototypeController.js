/**
 * PrototypeController - Bridges HTTP routes and backend services.
 *
 * Responsibility boundary:
 *   Routes  → declare HTTP verb + path, apply middleware, call controller.
 *   Controller → extract/validate request data, call services, shape response.
 *   Services   → pure domain logic with no awareness of HTTP.
 *
 * Keeping this layer thin and the services pure means the pipeline is
 * testable without spinning up an Express server.
 */

import { randomUUID } from 'crypto';
import llmService     from '../services/llmService.js';
import domainDetector from '../services/domainDetector.js';
import sessionManager from '../services/promptMerger.js';
import promptExpander from '../services/promptEnhancer.js';
import ragService     from '../services/ragService.js';
import Session        from '../models/Session.js';
import KnowledgeChunk from '../models/KnowledgeChunk.js';
import { AppError }   from '../errors/AppError.js';

// ── Shared response builder ───────────────────────────────────────────────────
// Both /generate and /code return the same shape so the frontend only
// needs one response-handling path.
function buildResponse({ sessionId, domainInfo, sessionData, result, rawPrompt, expandedPrompt }) {
  const content  = result.content  || {};
  const metadata = result.metadata || {};

  return {
    success: true,
    sessionId,
    domainChanged: domainInfo.isSameDomain === false,
    originalPrompt: rawPrompt,
    // Only surface the expanded prompt when it adds visible value.
    enhancedPrompt: expandedPrompt && expandedPrompt !== rawPrompt ? expandedPrompt : null,
    metadata: {
      title:             metadata.title || content.title || sessionData.title || 'Untitled Prototype',
      domain:            domainInfo.domain || metadata.domain || content.domain || 'general',
      merged_prompt_count: sessionData.mergedPromptCount,
      total_prompt_count:  sessionData.totalPromptCount,
      change_log:        sessionData.changeLog,
      files:             metadata.files || result.files || [],
    },
    content: {
      title:             content.title    || metadata.title || 'Untitled Prototype',
      domain:            content.domain   || metadata.domain || 'general',
      summary:           content.summary  || `A ${domainInfo.domain || 'web'} application prototype.`,
      workflow:          content.workflow || [],
      roles:             content.roles    || ['User'],
      requirements:      content.requirements || [],
      layout:            content.layout   || {},
      acceptance_criteria: content.acceptance_criteria || [],
      pipeline:          content.pipeline || {},
    },
    features:      result.extractedFeatures?.features || [],
    pipelineSteps: result.pipelineSteps || [],
    files:         result.files || metadata.files || [],
  };
}

// ── POST /api/prototype/generate ─────────────────────────────────────────────
export async function generate(req, res, next) {
  try {
    const { prompt, mode = 'workflow', sessionId: incomingId } = req.body;

    if (!prompt || !prompt.trim()) {
      throw AppError.invalid('A non-empty prompt is required to generate a prototype.');
    }

    // 1. Resolve or create a session.
    let activeId = incomingId || (await sessionManager.createSession()).sessionId;
    const prevContext = await sessionManager.getContext(activeId);

    console.log('\n=== GENERATION START ===');
    console.log('Prompt preview:', prompt.substring(0, 80));

    // 2. Domain detection runs on the RAW prompt (before expansion) to avoid
    //    the expander's rich vocabulary biasing the domain signal.
    const domain = await domainDetector.detect(prompt, prevContext.domain);
    const shifted = domain.isSameDomain === false;

    console.log('Domain shifted:', shifted, '| Domain:', domain.domain);

    // 3. On a domain shift, spawn a fresh session so the old prototype is preserved.
    if (incomingId && shifted) {
      activeId = (await sessionManager.createSession()).sessionId;
    }

    // 4. Expand the prompt (only pass context when staying in the same domain).
    const contextForExpansion = shifted ? null : prevContext;
    const expandedPrompt = await promptExpander.enhance(prompt, contextForExpansion);

    // 5. Record this prompt turn in the session.
    const sessionData = await sessionManager.addPrompt(activeId, expandedPrompt, domain);

    // 6. Build LLM context (reset on domain shift so old data doesn't bleed in).
    const llmContext = shifted
      ? null
      : { ...prevContext, features: prevContext.features || [] };

    // 7. Run the full LLM pipeline.
    const result = await llmService.generate(expandedPrompt, mode, llmContext);

    if (result.error) throw AppError.aiFailed(result.message);

    // 8. Persist the output for future continuation prompts.
    await sessionManager.saveResult(activeId, result);

    // 9. Optionally link session to the authenticated user for history.
    if (req.user) {
      await Session.findOneAndUpdate({ sessionId: activeId }, { userId: req.user._id }, { new: true });
    }

    res.json(buildResponse({ sessionId: activeId, domainInfo: domain, sessionData, result, rawPrompt: prompt, expandedPrompt }));

  } catch (err) { next(err); }
}

// ── POST /api/prototype/clear ────────────────────────────────────────────────
export async function clearSession(req, res, next) {
  try {
    const { sessionId } = req.body;
    if (sessionId) await sessionManager.clearSession(sessionId);
    res.json({ success: true, message: 'Session cleared.', newSessionId: randomUUID() });
  } catch (err) { next(err); }
}

// ── GET /api/prototype/session/:sessionId ────────────────────────────────────
export async function getSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const record = await sessionManager.getSession(sessionId);
    res.json({ success: true, sessionId, ...(record.toObject ? record.toObject() : record) });
  } catch (err) { next(err); }
}

// ── POST /api/prototype/validate ─────────────────────────────────────────────
export async function validatePrompt(req, res, next) {
  try {
    const { prompt } = req.body;
    if (!prompt) throw AppError.invalid('A prompt string is required for validation.');
    const outcome = await llmService.checkPrompt(prompt);
    res.json({ success: true, ...outcome });
  } catch (err) { next(err); }
}

// ── POST /api/prototype/code ─────────────────────────────────────────────────
export async function generateCode(req, res, next) {
  try {
    const { sessionId, lastPrompt } = req.body;

    if (!sessionId) throw AppError.invalid('A sessionId is required for code generation.');

    const context = await sessionManager.getContext(sessionId);

    if (!context.domain) {
      throw AppError.invalid(
        `No active prototype found for session "${sessionId}". Generate a workflow prototype first.`,
        'no_active_prototype'
      );
    }

    const prompt = lastPrompt || `Generate full code for: ${context.title || context.domain}`;
    const result = await llmService.generate(prompt, 'workflow+code', context);

    if (result.error) throw AppError.aiFailed(result.message);

    await sessionManager.saveResult(sessionId, result);
    const updated = await sessionManager.getSession(sessionId);

    const content  = result.content  || {};
    const metadata = result.metadata || {};

    res.json({
      success: true,
      sessionId,
      domainChanged: false,
      metadata: {
        title:             metadata.title || content.title || updated.title || 'Untitled Prototype',
        domain:            updated.domain || metadata.domain || content.domain || 'general',
        merged_prompt_count: updated.mergedPromptCount,
        total_prompt_count:  updated.totalPromptCount,
        change_log:        updated.changeLog,
        files:             metadata.files || result.files || [],
      },
      content: {
        title:              content.title   || metadata.title || 'Untitled Prototype',
        domain:             content.domain  || metadata.domain || 'general',
        summary:            content.summary || `A ${updated.domain || 'web'} application prototype.`,
        workflow:           content.workflow || [],
        roles:              content.roles   || ['User'],
        requirements:       content.requirements || [],
        layout:             content.layout  || {},
        acceptance_criteria: content.acceptance_criteria || [],
        pipeline:           content.pipeline || {},
      },
      features:      result.extractedFeatures?.features || [],
      pipelineSteps: result.pipelineSteps || [],
      files:         result.files || metadata.files || [],
    });
  } catch (err) { next(err); }
}

// ── GET /api/prototype/history ───────────────────────────────────────────────
export async function getHistory(req, res, next) {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .select('sessionId title domain lastOutput createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      history: sessions.map(s => ({
        sessionId:      s.sessionId,
        title:          s.title || 'Untitled Prototype',
        domain:         s.domain || 'general',
        createdAt:      s.createdAt,
        updatedAt:      s.updatedAt,
        previewSummary: s.lastOutput?.content?.summary || null,
        hasCode:        !!(s.lastOutput?.files?.length > 0 || s.lastOutput?.metadata?.files?.length > 0),
      })),
    });
  } catch (err) { next(err); }
}

// ── DELETE /api/prototype/session/:sessionId ─────────────────────────────────
export async function deleteSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const owned = await Session.findOne({ sessionId, userId: req.user._id });
    if (!owned) throw AppError.notFound('Prototype session');
    await Session.deleteOne({ sessionId });
    res.json({ success: true, message: 'Session deleted.' });
  } catch (err) { next(err); }
}

// ── POST /api/prototype/rag-search ───────────────────────────────────────────
export async function ragSearch(req, res, next) {
  try {
    const { prompt, topK = 3 } = req.body;
    if (!prompt) throw AppError.invalid('A prompt is required for RAG search.');

    const context = await ragService.retrieve(prompt, { topK: Math.min(topK, 10) });
    const count   = (context.match(/\[Knowledge \d+/g) || []).length;

    res.json({
      success: true,
      prompt,
      chunksRetrieved: count,
      ragContext: context || '(no matching knowledge – run: npm run seed)',
    });
  } catch (err) { next(err); }
}

// ── GET /api/prototype/rag-stats ─────────────────────────────────────────────
export async function ragStats(req, res, next) {
  try {
    const total    = await KnowledgeChunk.countDocuments();
    const byCategory = await KnowledgeChunk.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const chunks = await KnowledgeChunk.find({}, 'title category tags').lean();

    res.json({
      success: true,
      totalChunks: total,
      byCategory:  byCategory.map(c => ({ category: c._id, count: c.count })),
      chunks:      chunks.map(c => ({ title: c.title, category: c.category, tags: c.tags })),
    });
  } catch (err) { next(err); }
}
