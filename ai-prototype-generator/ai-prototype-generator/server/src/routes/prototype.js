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
    const { prompt, mode = 'workflow', sessionId: clientSessionId } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Prompt is required', details: 'validation_error' }
      });
    }

    // Get or create session - if domain changes, we'll use the same sessionId
    const session = clientSessionId || (await promptMerger.createSession()).sessionId;
    const currentContext = await promptMerger.getContext(session);

    console.log('\n=== GENERATE REQUEST ===');
    console.log('Session ID:', session);
    console.log('Current domain:', currentContext.domain);
    console.log('Prompt:', prompt.substring(0, 80) + '...');

    // Detect domain
    const domainInfo = await domainDetector.detect(prompt, currentContext.domain);
    console.log('Domain detection result:', {
      isSameDomain: domainInfo.isSameDomain,
      domain: domainInfo.domain,
      oldDomain: domainInfo.oldDomain
    });

    // Update session with new prompt (this resets session if domain changed)
    const sessionData = await promptMerger.addPrompt(session, prompt, domainInfo);
    console.log('Session updated. Total prompts:', sessionData.totalPromptCount);

    // Prepare context for LLM — if different domain, start fresh
    // When domain changes, we DON'T use previous context
    const contextForLLM = domainInfo.isSameDomain === false ? null : {
      ...currentContext,
      features: currentContext.features || []
    };

    console.log('Context for LLM:', contextForLLM ? 'Using previous context' : 'Starting fresh (new domain)');

    // Generate prototype via multi-step pipeline
    const result = await llmService.generate(prompt, mode, contextForLLM);

    // Check if the LLM generation failed
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.message || 'LLM Generation failed mid-process.'
      });
    }

    // Update session with output
    await promptMerger.updateWithOutput(session, result);
    console.log('Session updated with output');

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

    console.log('Response domainChanged:', response.domainChanged);
    console.log('Response domain:', response.metadata.domain);
    console.log('=== GENERATE COMPLETE ===\n');

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
 * Generate code for an existing workflow
 */
router.post('/code', async (req, res, next) => {
  try {
    const { sessionId } = req.body;

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

    // Get the last output to use as context
    const session = await promptMerger.getSession(sessionId);
    const lastOutput = session.lastOutput;

    // Build prompt from existing workflow
    const prompt = `Generate production code for: ${currentContext.title || currentContext.domain}

Requirements:
${currentContext.canonicalRequirements?.join('\n') || 'Build a functional prototype'}

Domain: ${currentContext.domain}

Generate complete, runnable HTML and JavaScript code.`;

    // Generate code using workflow+code mode
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
