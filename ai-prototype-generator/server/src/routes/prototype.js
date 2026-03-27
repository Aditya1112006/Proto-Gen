import express from 'express';
import { randomUUID } from 'crypto';
import llmService from '../services/llmService.js';
import domainDetector from '../services/domainDetector.js';
import promptMerger from '../services/promptMerger.js';

const router = express.Router();

/**
 * POST /api/prototype/generate
 * Multi-step pipeline: Domain Detection → Feature Extraction → LLM Generation → Validation
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { prompt, mode = 'workflow', sessionId } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Prompt is required', details: 'validation_error' }
      });
    }

    // Get or create session
    const session = sessionId || (await promptMerger.createSession()).sessionId;
    const currentContext = await promptMerger.getContext(session);

    // Detect domain
    const domainInfo = await domainDetector.detect(prompt, currentContext.domain);
    console.log('\n=== PROTOTYPE ROUTE ===');
    console.log('domainInfo.isSameDomain:', domainInfo.isSameDomain);
    console.log('domainInfo.domain:', domainInfo.domain);
    console.log('domainInfo.oldDomain:', domainInfo.oldDomain);
    console.log('Response will have domainChanged:', domainInfo.isSameDomain === false);

    // Update session with new prompt
    const sessionData = await promptMerger.addPrompt(session, prompt, domainInfo);

    // Prepare context for LLM — if different domain, start fresh
    const contextForLLM = domainInfo.isSameDomain === false ? null : {
      ...currentContext,
      features: currentContext.features || []
    };

    // Generate prototype via multi-step pipeline (feature extraction + LLM + validation)
    const result = await llmService.generate(prompt, mode, contextForLLM);
    
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

    // Update session features from extraction
    if (result.extractedFeatures?.features) {
      // We can fetch updated context if needed, or pass extracted features back directly
    }

    // Content and metadata are already validated by the pipeline
    const content = result.content || {};
    const metadata = result.metadata || {};

    const response = {
      success: true,
      sessionId: session,
      domainChanged: domainInfo.isSameDomain === false,
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
    if (!currentContext.domain) {
      return res.status(400).json({
        success: false,
        error: { message: 'No active prototype. Please generate a prototype first.', details: 'validation_error' }
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

export default router;
