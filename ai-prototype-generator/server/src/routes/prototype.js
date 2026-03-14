import express from 'express';
import { randomUUID } from 'crypto';
import llmService from '../services/llmService.js';
import domainDetector from '../services/domainDetector.js';
import promptMerger from '../services/promptMerger.js';

const router = express.Router();

/**
 * POST /api/prototype/generate
 * Generate a new prototype or merge with existing
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { prompt, mode = 'workflow', sessionId } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        error: 'Prompt is required',
        type: 'validation_error'
      });
    }

    // Get or create session
    const session = sessionId || randomUUID();
    const currentSession = promptMerger.getSession(session);
    const currentContext = promptMerger.getContext(session);

    // Detect domain
    const domainInfo = domainDetector.detect(prompt, currentContext.domain);

    // Update session with new prompt
    const sessionData = promptMerger.addPrompt(session, prompt, domainInfo);

    // Prepare context for LLM
    const contextForLLM = domainInfo.isNewDomain ? null : currentContext;

    // Generate prototype with LLM
    const result = await llmService.generate(prompt, mode, contextForLLM);

    if (!result.success) {
      throw new Error('Failed to generate prototype');
    }

    // Update session with output
    promptMerger.updateWithOutput(session, result.data);

    // Format changeLog to match API spec
    const formattedChangeLog = sessionData.changeLog.map((entry, index) => ({
      when: sessionData.prompts[index]?.timestamp || new Date().toISOString(),
      note: typeof entry === 'string' ? entry : entry.note || String(entry)
    }));

    // Build response per API spec
    const response = {
      success: true,
      sessionId: session,
      domainChanged: domainInfo.isNewDomain || false,
      metadata: {
        title: result.data.metadata?.title || sessionData.title || 'Untitled Prototype',
        domain: domainInfo.domain || result.data.metadata?.domain || 'general',
        merged_prompt_count: sessionData.mergedPromptCount,
        total_prompt_count: sessionData.totalPromptCount,
        change_log: formattedChangeLog,
        files: result.data.metadata?.files || []
      },
      content: {
        workflow: result.data.content?.workflow || result.data.content?.summary || '',
        requirements: result.data.content?.requirements?.functional || result.data.content?.requirements || [],
        layout: result.data.content?.layout_plan || result.data.content?.layout || '',
        raw: result.data.content || {}
      },
      files: result.data.metadata?.files || result.data.files || []
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prototype/clear
 * Clear current prototype session
 */
router.post('/clear', (req, res) => {
  const { sessionId } = req.body;

  if (sessionId) {
    promptMerger.clearSession(sessionId);
  }

  res.json({
    success: true,
    message: 'Prototype cleared',
    sessionId: randomUUID() // Return new session ID
  });
});

/**
 * GET /api/prototype/session/:sessionId
 * Get current session state
 */
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = promptMerger.getSession(sessionId);

  res.json({
    sessionId,
    ...session
  });
});

/**
 * POST /api/prototype/validate
 * Validate a prompt before submission
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const validation = await llmService.validatePrompt(prompt);

    res.json(validation);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prototype/code
 * Generate code for current prototype
 */
router.post('/code', async (req, res, next) => {
  try {
    const { sessionId, lastPrompt } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const currentContext = promptMerger.getContext(sessionId);

    if (!currentContext.domain) {
      return res.status(400).json({
        error: 'No active prototype. Please generate a prototype first.'
      });
    }

    // Generate code with workflow+code mode
    const prompt = lastPrompt || `Generate code for: ${currentContext.title || currentContext.domain}`;
    const result = await llmService.generate(prompt, 'workflow+code', currentContext);

    if (!result.success) {
      throw new Error('Failed to generate code');
    }

    // Update session
    promptMerger.updateWithOutput(sessionId, result.data);
    const sessionData = promptMerger.getSession(sessionId);

    // Format changeLog
    const formattedChangeLog = sessionData.changeLog.map((entry, index) => ({
      when: sessionData.prompts[index]?.timestamp || new Date().toISOString(),
      note: typeof entry === 'string' ? entry : entry.note || String(entry)
    }));

    // Return standardized response
    res.json({
      success: true,
      sessionId,
      domainChanged: false,
      metadata: {
        title: result.data.metadata?.title || sessionData.title || 'Untitled Prototype',
        domain: sessionData.domain || 'general',
        merged_prompt_count: sessionData.mergedPromptCount,
        total_prompt_count: sessionData.totalPromptCount,
        change_log: formattedChangeLog,
        files: result.data.metadata?.files || []
      },
      content: {
        workflow: result.data.content?.workflow || result.data.content?.summary || '',
        requirements: result.data.content?.requirements?.functional || result.data.content?.requirements || [],
        layout: result.data.content?.layout_plan || result.data.content?.layout || '',
        raw: result.data.content || {}
      },
      files: result.data.metadata?.files || result.data.files || []
    });
  } catch (error) {
    next(error);
  }
});

export default router;
