import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, CODE_SYSTEM_PROMPT, formatUserPrompt } from '../utils/promptTemplates.js';
import featureExtractor from './featureExtractor.js';
import { validatePrototype } from './prototypeValidator.js';
import ragService from './ragService.js';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ── Fallback Model Queue ──
// Ordered by priority. If Model 1 fails (429/503), we seamlessly try Model 2, etc.
const FALLBACK_MODELS = [
  process.env.GEMINI_MODEL?.trim().toLowerCase() || 'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

// Errors that should trigger a fallback retry (including 404 to skip non-existent models)
const RETRYABLE_STATUS_CODES = [429, 503, 500, 404];

export class LLMService {
  constructor() {
    this.models = [...new Set(FALLBACK_MODELS)]; // Deduplicate
    this.primaryModel = this.models[0];
    
    this.workflowMaxTokens = 4096;
    this.codeMaxTokens = 20000;  // Gemini free-tier hard cap — prevents JSON truncation
    this.workflowTemperature = 0.25;
    this.codeTemperature = 0.4;

    console.log(`[LLMService] Model fallback chain: ${this.models.join(' → ')}`);
  }

  /**
   * Core fallback wrapper. Tries each model in the queue until one succeeds.
   * @param {string} contents - The prompt contents
   * @param {object} config - Generation config (temperature, maxOutputTokens, etc.)
   * @param {string[]} modelQueue - Optional override of the model queue
   * @returns {object} The generation response
   */
  async callWithFallback(contents, config, modelQueue = null) {
    const models = modelQueue || this.models;
    let lastError = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        console.log(`[LLMService] Attempting generation with model: ${model}${i > 0 ? ' (fallback)' : ''}`);

        // Gemma models need special handling
        let finalContents = contents;
        let finalConfig = { ...config };
        if (model.includes('gemma')) {
          delete finalConfig.responseMimeType;
          if (finalConfig.systemInstruction) {
            finalContents = `[SYSTEM INSTRUCTION]\n${finalConfig.systemInstruction}\n\nIMPORTANT: You must output ONLY RAW VALID JSON.\n\n[USER INPUT]\n${contents}`;
            delete finalConfig.systemInstruction;
          }
        }

        const response = await ai.models.generateContent({
          model,
          contents: finalContents,
          config: finalConfig
        });

        if (i > 0) {
          console.log(`[LLMService] ✓ Fallback to ${model} succeeded.`);
        }
        return response;

      } catch (error) {
        lastError = error;
        
        // Sometimes error objects bury the status code depending on the SDK version
        const status = error?.status || error?.httpStatusCode || error?.code || error?.response?.status;
        const errMsg = (error?.message || '').toLowerCase();
        
        const isRetryable = RETRYABLE_STATUS_CODES.includes(status)
          || errMsg.includes('429')
          || errMsg.includes('503')
          || errMsg.includes('overloaded')
          || errMsg.includes('resource_exhausted')
          || errMsg.includes('404')
          || errMsg.includes('not found');

        if (isRetryable && i < models.length - 1) {
          console.warn(`[LLMService] ⚠ Model ${model} failed (${status || errMsg}). Falling back to ${models[i + 1]}...`);
          continue; // Try next model
        }

        // Non-retryable error or last model in queue — throw
        throw error;
      }
    }

    throw lastError; // Should never reach here, but safety net
  }

  /**
   * Multi-step pipeline: Extract Features → Generate via LLM → Validate Output
   * @param {string} prompt - The user prompt
   * @param {string} mode - 'workflow' or 'workflow+code'
   * @param {object} sessionState - Current session state/context
   * @returns {object} Structured prototype result with pipeline metadata
   */
  async generate(prompt, mode = 'workflow', sessionState = null) {
    try {
      // ── Step 1: Feature Extraction (pre-LLM) ──
      const extractedFeatures = featureExtractor.extract(prompt, sessionState);

      // ── Step 2: RAG — Retrieve relevant knowledge from Vector DB ──
      // Only run RAG for workflow mode (not code gen — different context window budget)
      let ragContext = '';
      let ragChunkCount = 0;
      if (mode === 'workflow') {
        try {
          ragContext = await ragService.retrieve(prompt, {
            topK: 3,
          });
          // Count chunks returned (each chunk block starts with [Knowledge)
          ragChunkCount = (ragContext.match(/\[Knowledge \d+/g) || []).length;
          if (ragContext) {
            console.log(`[LLMService] RAG injected ${ragChunkCount} knowledge chunk(s) into prompt`);
          }
        } catch (ragError) {
          // RAG failure must NEVER block generation
          console.warn('[LLMService] RAG retrieval failed (non-fatal):', ragError.message);
        }
      }

      // ── Step 3: Select system prompt and parameters based on mode ──
      const isCodeMode = mode === 'workflow+code';
      const systemPrompt = isCodeMode ? CODE_SYSTEM_PROMPT : SYSTEM_PROMPT;
      const maxTokens = isCodeMode ? this.codeMaxTokens : this.workflowMaxTokens;
      const temperature = isCodeMode ? this.codeTemperature : this.workflowTemperature;

      // Augment the user content with RAG context if available
      const baseUserContent = formatUserPrompt(prompt, sessionState, mode, extractedFeatures);
      const userContent = ragContext
        ? `${ragContext}\n\n${baseUserContent}`
        : baseUserContent;

      // ── Step 4: LLM Generation (with multi-model fallback) ──
      const genConfig = {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
        systemInstruction: systemPrompt,
      };

      const response = await this.callWithFallback(userContent, genConfig);

      const responseContent = response.text;
      const parsed = this.parseResponse(responseContent);

      // ── Step 5: Validation (post-LLM) ──
      const validationContext = {
        domain: extractedFeatures.domain,
        features: extractedFeatures.features,
        title: sessionState?.title || null
      };

      const { validated, fixes } = validatePrototype(parsed, validationContext);

      // Ensure pipeline info includes our pre-extracted features
      if (validated.content.pipeline) {
        validated.content.pipeline.extracted_features = extractedFeatures.features;
        validated.content.pipeline.detected_domain = extractedFeatures.domain;
        validated.content.pipeline.validation_fixes = fixes;
        validated.content.pipeline.feature_confidence = extractedFeatures.confidence;
        validated.content.pipeline.rag_chunks_used = ragChunkCount;
      }

      // Attach pipeline step info for the frontend
      validated.pipelineSteps = [
        { step: 'Domain Detection', result: extractedFeatures.domain, status: 'complete' },
        { step: 'Feature Extraction', result: `${extractedFeatures.features.length} features identified`, status: 'complete' },
        { step: 'RAG Retrieval', result: ragChunkCount > 0 ? `${ragChunkCount} knowledge chunk(s) retrieved` : 'No matching chunks (knowledge base may be empty)', status: 'complete' },
        { step: 'Prototype Generation', result: 'LLM generated structured spec', status: 'complete' },
        { step: 'Output Validation', result: fixes.length > 0 ? `${fixes.length} fix(es) applied` : 'All fields valid', status: 'complete' }
      ];

      // Attach extracted features at top level for route to use
      validated.extractedFeatures = extractedFeatures;

      return validated;

    } catch (error) {
      console.error('LLM Pipeline Error:', error);
      return {
        error: true,
        message: `Generation failed: ${error.message}`
      };
    }
  }

  /**
   * Parse LLM response, handling JSON extraction from markdown and conversational filler,
   * with a fallback to repair improperly truncated JSON (e.g. from token limits).
   */
  parseResponse(llmResponse) {
    if (!llmResponse || typeof llmResponse !== 'string') {
      return {};
    }

    let jsonStr = llmResponse.trim();

    // Remove markdown codeblock formatting if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.substring(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.substring(0, jsonStr.length - 3);
    }
    
    jsonStr = jsonStr.trim();

    try {
      // 1. Basic extraction: grab everything from first { to last }
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1 && start < end) {
        const potentialJson = jsonStr.substring(start, end + 1);
        try {
          return JSON.parse(potentialJson);
        } catch (e) {
          // If substring parse fails, fallback to full string parse attempt
        }
      }
      return JSON.parse(jsonStr);
    } catch (e) {
      // 2. Repair Truncated JSON
      // If the string was cut off mid-way, attempt to close open brackets/braces.
      console.warn('Initial JSON parse failed, attempting to repair truncated JSON:', e.message);
      let repairedStr = jsonStr;
      
      // Auto-append missing double quotes if the string ended inside one
      // We must ignore escaped quotes (\\") when counting
      const strWithoutEscapes = repairedStr.replace(/\\\\"/g, '');
      const quoteCount = (strWithoutEscapes.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repairedStr += '"';
      }

      // Brute force close arrays and objects. 
      const maxAttempts = 15;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          return JSON.parse(repairedStr);
        } catch (repairError) {
          const msg = repairError.message;
          if (msg.includes('Expected') || msg.includes('Unexpected end of JSON input') || msg.includes('Unterminated')) {
             if (repairedStr.lastIndexOf('[') > repairedStr.lastIndexOf('{')) {
               repairedStr += ']';
             } else {
               repairedStr += '}';
             }
          } else {
             // If it's a completely invalid token mid-word, chop off the last character and try again 
             repairedStr = repairedStr.slice(0, -1);
          }
        }
      }

      console.error('Failed to parse or repair LLM response as JSON. Snippet:', llmResponse.substring(0, 100) + '...', '... End snippet:', llmResponse.substring(Math.max(0, llmResponse.length - 100)));
      return {};
    }
  }

  /**
   * Legacy method - delegates to generate
   */
  async generatePrototype(userPrompt, currentContext, mode = 'workflow') {
    return this.generate(userPrompt, mode, currentContext);
  }

  /**
   * Check if a prompt is too vague
   */
  async validatePrompt(userPrompt) {
    const sysPrompt = 'You are a validation assistant. Check if the user prompt is specific enough to generate a prototype. Respond with JSON: { "isValid": true/false, "suggestion": "string or null" }';

    try {
      // Use the lightest model for validation to conserve quota on the primary model
      const lightModels = ['gemini-2.0-flash-lite', 'gemini-flash-lite-latest', ...this.models];

      const response = await this.callWithFallback(
        `Validate this prompt: "${userPrompt}"`,
        {
          temperature: 0.3,
          maxOutputTokens: 200,
          responseMimeType: "application/json",
          systemInstruction: sysPrompt,
        },
        [...new Set(lightModels)] // deduplicated light-first queue
      );

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Validation error:', error);
      return { isValid: true, suggestion: null };
    }
  }
}

export default new LLMService();
