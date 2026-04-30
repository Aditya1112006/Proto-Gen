/**
 * LLMService - Core AI generation engine for Proto-Gen.
 *
 * Handles three things:
 *   1. A prioritised model fallback queue so quota exhaustion on one model
 *      never blocks generation.
 *   2. The full generation pipeline: Feature Extraction → RAG → LLM → Validation.
 *   3. A JSON parser with automatic truncation repair for Gemini's quirks.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, CODE_SYSTEM_PROMPT, formatUserPrompt } from '../utils/promptTemplates.js';
import featureExtractor from './featureExtractor.js';
import { validatePrototype } from './prototypeValidator.js';
import ragService from './ragService.js';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Model fallback chain ──────────────────────────────────────────────────────
// Try each model left-to-right; skip to the next on 429/503/404.
function buildModelQueue() {
  const primary = process.env.GEMINI_MODEL?.trim().toLowerCase() || 'gemini-2.5-flash';
  const defaults = [primary, 'gemini-2.5-flash', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash'];
  return [...new Set(defaults)]; // deduplicate
}

// Status codes worth retrying with the next model.
const RETRY_CODES = new Set([429, 503, 500, 404]);

// Token budgets per mode.
const WORKFLOW_TOKENS  = 4096;
const CODE_TOKENS      = 20000;
const WORKFLOW_TEMP    = 0.25; // low variance for structured specs
const CODE_TEMP        = 0.4;  // slightly more creative for UI decisions

export class LLMService {
  constructor() {
    this.models = buildModelQueue();
    console.log(`[LLMService] Model queue: ${this.models.join(' → ')}`);
  }

  /**
   * Call Gemini with automatic model fallback.
   * Retries with the next model in the queue on retryable HTTP errors.
   *
   * @param {string} content         The assembled user message.
   * @param {object} config          Gemini generation config.
   * @param {string[]|null} queue    Override the model queue (e.g. for validation).
   * @returns {Promise<object>}      Raw Gemini SDK response.
   */
  async callAI(content, config, queue = null) {
    const tryModels = queue || this.models;
    let lastErr = null;

    for (let i = 0; i < tryModels.length; i++) {
      const model = tryModels[i];
      const isFallback = i > 0;

      try {
        console.log(`[LLMService] Trying: ${model}${isFallback ? ' (fallback)' : ''}`);

        let body = content;
        let cfg  = { ...config };

        // Gemma models don't support responseMimeType and need the system
        // instruction folded into the user message.
        if (model.includes('gemma')) {
          delete cfg.responseMimeType;
          if (cfg.systemInstruction) {
            body = `[SYSTEM]\n${cfg.systemInstruction}\n\nOutput ONLY raw JSON.\n\n[USER]\n${content}`;
            delete cfg.systemInstruction;
          }
        }

        const res = await ai.models.generateContent({ model, contents: body, config: cfg });

        if (isFallback) console.log(`[LLMService] ✓ Fallback "${model}" worked.`);
        return res;

      } catch (err) {
        lastErr = err;
        const status = err?.status || err?.httpStatusCode || err?.code;
        const msg    = (err?.message || '').toLowerCase();

        const shouldRetry =
          RETRY_CODES.has(status) ||
          msg.includes('429') || msg.includes('503') ||
          msg.includes('overloaded') || msg.includes('resource_exhausted') ||
          msg.includes('not found') || msg.includes('404');

        if (shouldRetry && i < tryModels.length - 1) {
          console.warn(`[LLMService] ⚠ "${model}" failed (${status || msg}). Trying next...`);
          continue;
        }
        throw err;
      }
    }

    throw lastErr;
  }

  /**
   * Run the full prototype generation pipeline.
   *
   * Stages:
   *   1. Feature Extraction  – keyword analysis of the prompt
   *   2. RAG Retrieval       – inject UI/UX knowledge (workflow mode only)
   *   3. LLM Call            – generate structured JSON output
   *   4. Validation          – fill schema gaps and ensure compliance
   *
   * @param {string} prompt          Enhanced user prompt.
   * @param {string} mode            'workflow' or 'workflow+code'.
   * @param {object|null} context    Accumulated session state.
   * @returns {Promise<object>}
   */
  async generate(prompt, mode = 'workflow', context = null) {
    try {
      // Stage 1 – Feature Extraction
      const features = featureExtractor.extract(prompt, context);

      // Stage 2 – RAG (skipped for code mode to preserve the context window)
      let ragContext = '';
      let ragChunks  = 0;

      if (mode === 'workflow') {
        try {
          ragContext = await ragService.retrieve(prompt, { topK: 3 });
          ragChunks  = (ragContext.match(/\[Knowledge \d+/g) || []).length;
          if (ragContext) console.log(`[LLMService] RAG: ${ragChunks} chunk(s) injected`);
        } catch (ragErr) {
          console.warn('[LLMService] RAG failed (non-fatal):', ragErr.message);
        }
      }

      // Stage 3 – LLM Call
      const isCodeMode   = mode === 'workflow+code';
      const sysPrompt    = isCodeMode ? CODE_SYSTEM_PROMPT : SYSTEM_PROMPT;
      const maxTokens    = isCodeMode ? CODE_TOKENS : WORKFLOW_TOKENS;
      const temperature  = isCodeMode ? CODE_TEMP   : WORKFLOW_TEMP;

      const baseContent  = formatUserPrompt(prompt, context, mode, features);
      const finalContent = ragContext ? `${ragContext}\n\n${baseContent}` : baseContent;

      const rawRes = await this.callAI(finalContent, {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        systemInstruction: sysPrompt,
      });

      const parsed = this.parseJSON(rawRes.text);

      // Stage 4 – Validation
      const { validated, fixes } = validatePrototype(parsed, {
        domain:   features.domain,
        features: features.features,
        title:    context?.title || null,
      });

      // Enrich pipeline metadata for the frontend status display.
      if (validated.content?.pipeline) {
        Object.assign(validated.content.pipeline, {
          extracted_features: features.features,
          detected_domain:    features.domain,
          validation_fixes:   fixes,
          feature_confidence: features.confidence,
          rag_chunks_used:    ragChunks,
        });
      }

      validated.pipelineSteps = [
        { step: 'Domain Detection',   result: features.domain,                                                                                    status: 'complete' },
        { step: 'Feature Extraction', result: `${features.features.length} features identified`,                                                   status: 'complete' },
        { step: 'RAG Retrieval',      result: ragChunks > 0 ? `${ragChunks} chunk(s) retrieved` : 'No matching chunks – run npm run seed',        status: 'complete' },
        { step: 'LLM Generation',     result: 'Structured spec generated by Gemini',                                                              status: 'complete' },
        { step: 'Validation',         result: fixes.length > 0 ? `${fixes.length} fix(es) applied` : 'All fields valid',                         status: 'complete' },
      ];

      validated.extractedFeatures = features;
      return validated;

    } catch (err) {
      console.error('[LLMService] Pipeline error:', err.message);
      return { error: true, message: `Generation failed: ${err.message}` };
    }
  }

  /**
   * Parse a raw LLM response string into a JS object.
   *
   * Handles three common Gemini quirks:
   *   1. Markdown code fences (```json ... ```)
   *   2. Preamble text before the opening brace
   *   3. Truncated JSON from hitting the token limit – repaired iteratively
   *
   * @param {string} raw
   * @returns {object}
   */
  parseJSON(raw) {
    if (!raw || typeof raw !== 'string') return {};

    let text = raw.trim();

    // Strip markdown fences
    if (text.startsWith('```json')) text = text.slice(7);
    else if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    text = text.trim();

    // Attempt 1: extract between first { and last }
    try {
      const start = text.indexOf('{');
      const end   = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && start < end) {
        try { return JSON.parse(text.substring(start, end + 1)); } catch {}
      }
      return JSON.parse(text);
    } catch (firstErr) {
      console.warn('[LLMService] JSON parse failed, attempting repair:', firstErr.message);
    }

    // Attempt 2: iteratively close open brackets / braces (truncation repair)
    let repaired = text;

    // Close an unclosed string literal first if needed
    const noEscapes = repaired.replace(/\\"/g, '');
    if ((noEscapes.match(/"/g) || []).length % 2 !== 0) repaired += '"';

    for (let round = 0; round < 15; round++) {
      try {
        return JSON.parse(repaired);
      } catch (e) {
        const msg = e.message;
        if (msg.includes('Expected') || msg.includes('Unexpected end') || msg.includes('Unterminated')) {
          // Choose the closing token based on whichever bracket was opened last
          const lastArr = repaired.lastIndexOf('[');
          const lastObj = repaired.lastIndexOf('{');
          repaired += lastArr > lastObj ? ']' : '}';
        } else {
          repaired = repaired.slice(0, -1); // drop the last bad char
        }
      }
    }

    console.error('[LLMService] JSON repair failed. Snippet:', raw.substring(0, 120));
    return {};
  }

  /**
   * Quickly check whether a prompt is specific enough for generation.
   * Uses the lightest available model to save quota.
   *
   * @param {string} prompt
   * @returns {Promise<{ isValid: boolean, suggestion: string|null }>}
   */
  async checkPrompt(prompt) {
    const lightModels = ['gemini-2.0-flash-lite', 'gemini-flash-lite-latest', ...this.models];

    try {
      const res = await this.callAI(
        `Validate this prompt: "${prompt}"`,
        {
          temperature: 0.3,
          maxOutputTokens: 200,
          responseMimeType: 'application/json',
          systemInstruction:
            'You are a validation assistant. Determine if the prompt is specific enough to generate a useful software prototype. Respond ONLY with JSON: { "isValid": true/false, "suggestion": "string or null" }',
        },
        [...new Set(lightModels)]
      );
      return JSON.parse(res.text);
    } catch (err) {
      console.error('[LLMService] checkPrompt error:', err.message);
      return { isValid: true, suggestion: null }; // default to valid so we never silently block
    }
  }

  /** @deprecated Use generate() */
  async generatePrototype(prompt, context, mode = 'workflow') {
    return this.generate(prompt, mode, context);
  }

  /** @deprecated Use checkPrompt() */
  async validatePrompt(prompt) {
    return this.checkPrompt(prompt);
  }
}

export default new LLMService();
