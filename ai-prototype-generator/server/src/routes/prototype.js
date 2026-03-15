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
        success: false,
        error: {
          message: 'Prompt is required',
          details: 'validation_error'
        }
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

    // Prepare context for LLM - if different domain, pass null to start fresh
    const contextForLLM = domainInfo.isSameDomain === false ? null : currentContext;

    // Generate prototype with LLM
    const result = await llmService.generate(prompt, mode, contextForLLM);

    // Check for LLM error
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: {
          message: result.message,
          details: 'llm_error'
        }
      });
    }

    // Update session with output
    promptMerger.updateWithOutput(session, result);

    // Build response per API spec — pass through the already-normalized content from llmService
    const content = result.content || {};

    // Ensure workflow is always an array (handle both array and string cases)
    let workflow = content.workflow;
    if (typeof workflow === 'string') {
      workflow = workflow ? [workflow] : [];
    } else if (!Array.isArray(workflow)) {
      workflow = [];
    }

    // Ensure user_flow is always an array
    let userFlow = content.user_flow;
    if (typeof userFlow === 'string') {
      userFlow = userFlow ? [userFlow] : [];
    } else if (!Array.isArray(userFlow)) {
      userFlow = workflow; // fallback to workflow
    }

    // Normalize requirements to object format
    let requirements = content.requirements;
    if (Array.isArray(requirements)) {
      requirements = { functional: requirements, non_functional: [] };
    } else if (typeof requirements === 'string') {
      requirements = { functional: [requirements], non_functional: [] };
    } else if (!requirements || typeof requirements !== 'object') {
      requirements = { functional: [], non_functional: [] };
    }
    // Ensure functional and non_functional are arrays
    if (!Array.isArray(requirements.functional)) {
      requirements.functional = [];
    }
    if (!Array.isArray(requirements.non_functional)) {
      requirements.non_functional = [];
    }

    const response = {
      success: true,
      sessionId: session,
      domainChanged: domainInfo.isSameDomain === false,
      metadata: {
        title: result.metadata?.title || content.title || sessionData.title || 'Untitled Prototype',
        domain: domainInfo.domain || result.metadata?.domain || content.domain || 'general',
        merged_prompt_count: sessionData.mergedPromptCount,
        total_prompt_count: sessionData.totalPromptCount,
        change_log: sessionData.changeLog,
        files: result.metadata?.files || result.files || []
      },
      content: {
        title: content.title || result.metadata?.title || 'Untitled Prototype',
        domain: content.domain || result.metadata?.domain || 'general',
        summary: content.summary || `A ${domainInfo.domain || 'web'} application prototype.`,
        roles: Array.isArray(content.roles) ? content.roles : ['User', 'Admin'],
        user_flow: userFlow.length > 0 ? userFlow : workflow,
        workflow: workflow,
        requirements: requirements,
        layout_plan: content.layout_plan || content.layout || 'Standard web application layout',
        layout: content.layout || content.layout_plan || 'Standard web application layout',
        acceptance_criteria: Array.isArray(content.acceptance_criteria) ? content.acceptance_criteria : [],
        raw: content.raw || content
      },
      files: result.files || result.metadata?.files || []
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
    success: true,
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
      return res.status(400).json({
        success: false,
        error: {
          message: 'Prompt is required',
          details: 'validation_error'
        }
      });
    }

    const validation = await llmService.validatePrompt(prompt);

    res.json({
      success: true,
      ...validation
    });
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
      return res.status(400).json({
        success: false,
        error: {
          message: 'Session ID is required',
          details: 'validation_error'
        }
      });
    }

    const currentContext = promptMerger.getContext(sessionId);

    if (!currentContext.domain) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No active prototype. Please generate a prototype first.',
          details: 'validation_error'
        }
      });
    }

    // Generate code with workflow+code mode
    const prompt = lastPrompt || `Generate code for: ${currentContext.title || currentContext.domain}`;
    const result = await llmService.generate(prompt, 'workflow+code', currentContext);

    // Check for LLM error
    if (result.error) {
      return res.status(500).json({
        success: false,
        error: {
          message: result.message,
          details: 'llm_error'
        }
      });
    }

    // Update session
    promptMerger.updateWithOutput(sessionId, result);
    const sessionData = promptMerger.getSession(sessionId);

    // Build response — pass through already-normalized content from llmService
    const content = result.content || {};

    // Ensure workflow is always an array (handle both array and string cases)
    let workflow = content.workflow;
    if (typeof workflow === 'string') {
      workflow = workflow ? [workflow] : [];
    } else if (!Array.isArray(workflow)) {
      workflow = [];
    }

    // Ensure user_flow is always an array
    let userFlow = content.user_flow;
    if (typeof userFlow === 'string') {
      userFlow = userFlow ? [userFlow] : [];
    } else if (!Array.isArray(userFlow)) {
      userFlow = workflow; // fallback to workflow
    }

    // Normalize requirements to object format
    let requirements = content.requirements;
    if (Array.isArray(requirements)) {
      requirements = { functional: requirements, non_functional: [] };
    } else if (typeof requirements === 'string') {
      requirements = { functional: [requirements], non_functional: [] };
    } else if (!requirements || typeof requirements !== 'object') {
      requirements = { functional: [], non_functional: [] };
    }
    // Ensure functional and non_functional are arrays
    if (!Array.isArray(requirements.functional)) {
      requirements.functional = [];
    }
    if (!Array.isArray(requirements.non_functional)) {
      requirements.non_functional = [];
    }

    // Return standardized response
    res.json({
      success: true,
      sessionId,
      domainChanged: false,
      metadata: {
        title: result.metadata?.title || content.title || sessionData.title || 'Untitled Prototype',
        domain: sessionData.domain || result.metadata?.domain || content.domain || 'general',
        merged_prompt_count: sessionData.mergedPromptCount,
        total_prompt_count: sessionData.totalPromptCount,
        change_log: sessionData.changeLog,
        files: result.metadata?.files || result.files || []
      },
      content: {
        title: content.title || result.metadata?.title || 'Untitled Prototype',
        domain: content.domain || result.metadata?.domain || 'general',
        summary: content.summary || `A ${sessionData.domain || 'web'} application prototype.`,
        roles: Array.isArray(content.roles) ? content.roles : ['User', 'Admin'],
        user_flow: userFlow.length > 0 ? userFlow : workflow,
        workflow: workflow,
        requirements: requirements,
        layout_plan: content.layout_plan || content.layout || 'Standard web application layout',
        layout: content.layout || content.layout_plan || 'Standard web application layout',
        acceptance_criteria: Array.isArray(content.acceptance_criteria) ? content.acceptance_criteria : [],
        raw: content.raw || content
      },
      files: result.files || result.metadata?.files || []
    });
  } catch (error) {
    next(error);
  }
});

export default router;
