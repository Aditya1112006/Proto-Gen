import express from 'express';
import { randomUUID } from 'crypto';
import llmService from '../services/llmService.js';
import domainDetector from '../services/domainDetector.js';
import promptMerger from '../services/promptMerger.js';
import promptEnhancer from '../services/promptEnhancer.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import ragService from '../services/ragService.js';
import KnowledgeChunk from '../models/KnowledgeChunk.js';

const router = express.Router();

/**
 * POST /api/prototype/generate
 * Multi-step pipeline: Domain Detection → Feature Extraction → LLM Generation → Validation
 */
router.post('/generate', optionalAuth, async (req, res, next) => {
  try {
    const { prompt, mode = 'workflow', sessionId } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Prompt is required', details: 'validation_error' }
      });
    }

    // ── Step 1: Load session context ──
    let session = sessionId || (await promptMerger.createSession()).sessionId;
    const currentContext = await promptMerger.getContext(session);

    console.log('\n=== PROTOTYPE ROUTE ===');
    console.log('Original prompt:', prompt.substring(0, 80));

    // ── Step 2: Domain Detection on RAW prompt (MUST happen before enhancement) ──
    // We run this on the unmodified user input so the enhancer cannot pollute the
    // domain signal (e.g. "make a tic tac toe game" must NOT inherit food-delivery context).
    const domainInfo = await domainDetector.detect(prompt, currentContext.domain);
    console.log('domainInfo.isSameDomain:', domainInfo.isSameDomain);
    console.log('domainInfo.domain:', domainInfo.domain);
    console.log('Response will have domainChanged:', domainInfo.isSameDomain === false);

    const isDomainChanged = domainInfo.isSameDomain === false;

    // If domain changed, spawn a brand-new session so the old one is preserved
    if (sessionId && isDomainChanged) {
      session = (await promptMerger.createSession()).sessionId;
    }

    // ── Step 3: Prompt Enhancement (context-aware, but ONLY if same domain) ──
    // If the domain changed we pass null so the enhancer treats this as a fresh idea.
    // If same domain we pass context so it understands this is an incremental update.
    const contextForEnhancement = isDomainChanged ? null : currentContext;
    const enhancedPrompt = await promptEnhancer.enhance(prompt, contextForEnhancement);
    console.log('Enhanced prompt (preview):', enhancedPrompt.substring(0, 120) + '...');

    // Update session with the enhanced prompt
    const sessionData = await promptMerger.addPrompt(session, enhancedPrompt, domainInfo);

    // ── Step 4: Build LLM context ──
    // Fresh context if domain changed, carry-over context if same domain
    const contextForLLM = isDomainChanged ? null : {
      ...currentContext,
      features: currentContext.features || []
    };

    // ── Step 5: Generate prototype via multi-step pipeline ──
    const result = await llmService.generate(enhancedPrompt, mode, contextForLLM);
    
    // Check if the LLM generation failed
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: { 
          message: result.message || 'LLM Generation failed mid-process.',
          details: 'llm_generation_error'
        }
      });
    }
    // Update session with output
    await promptMerger.updateWithOutput(session, result);

    // Link session to user (if authenticated)
    if (req.user) {
      await Session.findOneAndUpdate(
        { sessionId: session },
        { userId: req.user._id },
        { new: true }
      );
    }

    // Content and metadata are already validated by the pipeline
    const content = result.content || {};
    const metadata = result.metadata || {};

    const response = {
      success: true,
      sessionId: session,
      domainChanged: domainInfo.isSameDomain === false,
      // Surface both prompts so the frontend can show the "magic" expansion
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt !== prompt ? enhancedPrompt : null,
      metadata: {
        title: metadata.title || content.title || sessionData.title || 'Untitled Prototype',
        domain: domainInfo.domain || metadata.domain || content.domain || 'general',
        merged_prompt_count: sessionData.mergedPromptCount,
        total_prompt_count: sessionData.totalPromptCount,
        change_log: sessionData.changeLog,
        files: metadata.files || result.files || []
      },
      content: {
        title: content.title || metadata.title || 'Untitled Prototype',
        domain: content.domain || metadata.domain || 'general',
        summary: content.summary || `A ${domainInfo.domain || 'web'} application prototype.`,
        workflow: content.workflow || [],
        roles: content.roles || ['User'],
        requirements: content.requirements || [],
        layout: content.layout || {},
        acceptance_criteria: content.acceptance_criteria || [],
        pipeline: content.pipeline || {}
      },
      // Pipeline data for frontend display
      features: result.extractedFeatures?.features || [],
      pipelineSteps: result.pipelineSteps || [],
      files: result.files || metadata.files || []
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prototype/clear
 */
router.post('/clear', async (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    await promptMerger.clearSession(sessionId);
  }
  res.json({
    success: true,
    message: 'Prototype cleared',
    sessionId: randomUUID()
  });
});

/**
 * GET /api/prototype/session/:sessionId
 */
router.get('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = await promptMerger.getSession(sessionId);
  res.json({ success: true, sessionId, ...session.toObject ? session.toObject() : session });
});

/**
 * POST /api/prototype/validate
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: { message: 'Prompt is required', details: 'validation_error' }
      });
    }
    const validation = await llmService.validatePrompt(prompt);
    res.json({ success: true, ...validation });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prototype/code
 */
router.post('/code', async (req, res, next) => {
  try {
    const { sessionId, lastPrompt } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Session ID is required', details: 'validation_error' }
      });
    }

    const currentContext = await promptMerger.getContext(sessionId);
    console.log('\n=== CODE ROUTE DEBUG ===');
    console.log('sessionId received:', sessionId);
    console.log('currentContext.domain:', currentContext.domain);
    console.log('currentContext.title:', currentContext.title);
    
    if (!currentContext.domain) {
      const fullSession = await promptMerger.getSession(sessionId);
      console.log('!!! FULL DB SESSION !!!', fullSession);
      return res.status(400).json({
        success: false,
        error: { message: `No active prototype. Please generate a prototype first. (id=${sessionId})`, details: 'validation_error' }
      });
    }

    const prompt = lastPrompt || `Generate code for: ${currentContext.title || currentContext.domain}`;
    const result = await llmService.generate(prompt, 'workflow+code', currentContext);

    if (result.error) {
      return res.status(500).json({
        success: false,
        error: { message: result.message, details: 'llm_error' }
      });
    }

    await promptMerger.updateWithOutput(sessionId, result);
    const sessionData = await promptMerger.getSession(sessionId);
    const content = result.content || {};
    const metadata = result.metadata || {};

    res.json({
      success: true,
      sessionId,
      domainChanged: false,
      metadata: {
        title: metadata.title || content.title || sessionData.title || 'Untitled Prototype',
        domain: sessionData.domain || metadata.domain || content.domain || 'general',
        merged_prompt_count: sessionData.mergedPromptCount,
        total_prompt_count: sessionData.totalPromptCount,
        change_log: sessionData.changeLog,
        files: metadata.files || result.files || []
      },
      content: {
        title: content.title || metadata.title || 'Untitled Prototype',
        domain: content.domain || metadata.domain || 'general',
        summary: content.summary || `A ${sessionData.domain || 'web'} application prototype.`,
        workflow: content.workflow || [],
        roles: content.roles || ['User'],
        requirements: content.requirements || [],
        layout: content.layout || {},
        acceptance_criteria: content.acceptance_criteria || [],
        pipeline: content.pipeline || {}
      },
      features: result.extractedFeatures?.features || [],
      pipelineSteps: result.pipelineSteps || [],
      files: result.files || metadata.files || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prototype/history — Fetch saved prototypes for the logged-in user
 */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .select('sessionId title domain lastOutput createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    const history = sessions.map(s => ({
      sessionId: s.sessionId,
      title: s.title || 'Untitled Prototype',
      domain: s.domain || 'general',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      preview: s.lastOutput?.content?.summary || null,
      hasCode: !!(s.lastOutput?.files?.length > 0 || s.lastOutput?.metadata?.files?.length > 0),
    }));

    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/prototype/session/:sessionId
 */
router.delete('/session/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId, userId: req.user._id });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { message: 'Prototype not found', details: 'not_found' }
      });
    }

    await Session.deleteOne({ sessionId });
    res.json({ success: true, message: 'Prototype deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prototype/rag-search
 * Expose RAG retrieval for demonstration / transparency.
 * Accepts a prompt and returns the top knowledge chunks that would be injected into the LLM.
 */
router.post('/rag-search', async (req, res, next) => {
  try {
    const { prompt, topK = 3 } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: { message: 'prompt is required' } });
    }

    const rawContext = await ragService.retrieve(prompt, { topK: Math.min(topK, 10) });
    const chunkCount = (rawContext.match(/\[Knowledge \d+/g) || []).length;

    res.json({
      success: true,
      prompt,
      chunksRetrieved: chunkCount,
      ragContext: rawContext || '(no matching knowledge found — seed the DB first)',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prototype/rag-stats
 * Returns stats about the knowledge base (count, categories breakdown).
 */
router.get('/rag-stats', async (req, res, next) => {
  try {
    const total = await KnowledgeChunk.countDocuments();
    const byCategory = await KnowledgeChunk.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const allChunks = await KnowledgeChunk.find({}, 'title category tags').lean();

    res.json({
      success: true,
      totalChunks: total,
      byCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
      chunks: allChunks.map(c => ({ title: c.title, category: c.category, tags: c.tags })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
