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
  const defaults = [primary, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  return [...new Set(defaults)]; // deduplicate
}

// Status codes worth retrying with the next model.
const RETRY_CODES = new Set([429, 503, 500, 404]);

// Token budgets per mode.
const WORKFLOW_TOKENS  = 16384; // generous budget for rich structured specs
const CODE_TOKENS      = 24000; // large budget for complete, high-fidelity code
const WORKFLOW_TEMP    = 0.7;   // higher creativity → richer, more detailed specs
const CODE_TEMP        = 0.7;   // higher creativity → more polished UI code

// Thinking budget for Gemini 2.5 Flash/Pro — enables deep multi-step reasoning.
// -1 = dynamic (model decides). Use a high fixed value for maximum quality.
const THINKING_BUDGET  = 8192;

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
          // Parse the suggested retryDelay from the Gemini error response
          let waitMs = 2000; // default 2s between model switches
          try {
            const errBody = JSON.parse(err.message || '{}');
            const retryInfo = errBody?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
            if (retryInfo?.retryDelay) {
              // retryDelay looks like "24s" or "6.5s"
              const seconds = parseFloat(retryInfo.retryDelay);
              if (!isNaN(seconds)) waitMs = Math.min(seconds * 1000, 15000); // cap at 15s
            }
          } catch (_) { /* use default */ }

          // If daily quota is exhausted (limit: 0 on daily metric), skip immediately
          const isDailyExhausted = msg.includes('per_day') || msg.includes('perday') ||
            (msg.includes('limit') && msg.includes('"limit":0') && msg.includes('per_project'));

          if (isDailyExhausted) {
            console.warn(`[LLMService] ⚠ "${model}" daily quota exhausted. Skipping immediately...`);
          } else {
            console.warn(`[LLMService] ⚠ "${model}" failed (${status}). Waiting ${Math.round(waitMs/1000)}s before next model...`);
            await new Promise(r => setTimeout(r, waitMs));
          }
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

      // Stage 3 – LLM Call with Auto-Healing Retry Loop
      const isCodeMode   = mode === 'workflow+code';
      const sysPrompt    = isCodeMode ? CODE_SYSTEM_PROMPT : SYSTEM_PROMPT;
      const maxTokens    = isCodeMode ? CODE_TOKENS : WORKFLOW_TOKENS;
      const temperature  = isCodeMode ? CODE_TEMP   : WORKFLOW_TEMP;

      const baseContent  = formatUserPrompt(prompt, context, mode, features);
      const finalContent = ragContext ? `${ragContext}\n\n${baseContent}` : baseContent;

      let rawRes;
      let parsed = {};
      let validated = null;
      let fixes = [];
      let retriesLeft = 2;
      let healingPrompt = '';

      while (retriesLeft >= 0) {
        try {
          const contentToSend = healingPrompt 
            ? `${finalContent}\n\n[AUTO_HEAL_ATTEMPT]\n${healingPrompt}`
            : finalContent;

          // If this is a retry, use a slightly colder temperature for stricter structure
          const currentTemp = healingPrompt ? Math.max(0.1, temperature - 0.15) : temperature;

          console.log(`[LLMService] Invoking model (Retries left: ${retriesLeft}, Temp: ${currentTemp.toFixed(2)})`);
          rawRes = await this.callAI(contentToSend, {
            temperature: currentTemp,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json',
            systemInstruction: sysPrompt,
            thinkingConfig: { thinkingBudget: THINKING_BUDGET },
          });

          parsed = this.parseJSON(rawRes.text);

          // Structural sanity verification
          const isEmpty = !parsed || Object.keys(parsed).length === 0;
          const isMissingCrucial = !isEmpty && (!parsed.content || !parsed.content.layout);
          const isMissingFiles = isCodeMode && !isEmpty && (!parsed.files || parsed.files.length === 0);

          if (isEmpty) {
            throw new Error('LLM returned empty or unparseable JSON.');
          }
          if (isMissingCrucial) {
            throw new Error('LLM output lacks "content" or "content.layout" structure.');
          }
          if (isMissingFiles) {
            throw new Error('LLM in "workflow+code" mode failed to output files in the root "files" array.');
          }

          // If we passed all checks, break out of retry loop
          console.log('[LLMService] ✓ AI output passed structural validation.');
          break;

        } catch (attemptErr) {
          console.warn(`[LLMService] ⚠️ Generation attempt failed: ${attemptErr.message}`);
          
          if (retriesLeft === 0) {
            console.error('[LLMService] ✗ All auto-healing retries exhausted.');
            // Let the validator handle basic defaults as fallback rather than crashing the pipeline
            if (Object.keys(parsed).length > 0) {
              break;
            } else {
              throw attemptErr;
            }
          }

          // Construct a targeted auto-healing prompt based on the failure type
          if (attemptErr.message.includes('unparseable')) {
            healingPrompt = `CRITICAL: Your last response was invalid or truncated JSON. Generate ONLY valid, parseable JSON conforming EXACTLY to the requested schema. Ensure all brackets are closed and do NOT truncate.`;
          } else if (attemptErr.message.includes('layout')) {
            healingPrompt = `CRITICAL: Your last response was missing the "content" or "content.layout" fields. You must generate a structured PascalCase component tree in the "content.layout" key.`;
          } else if (attemptErr.message.includes('files')) {
            healingPrompt = `CRITICAL: You are in workflow+code mode. You must populate the "files" array with exactly 2 files: "index.html" (complete layout styled with Tailwind classes) and "app.js" (complete javascript interaction logic). Do NOT return placeholders or empty arrays.`;
          } else {
            healingPrompt = `CRITICAL: The last generation attempt was invalid. Error: ${attemptErr.message}. Please generate the complete structured JSON response complying with the system prompt rules.`;
          }

          retriesLeft--;
        }
      }

      // Stage 4 – Validation (async: formats code files with Prettier)
      const validationResult = await validatePrototype(parsed, {
        domain:   features.domain,
        features: features.features,
        title:    context?.title || null,
      });
      validated = validationResult.validated;
      fixes = validationResult.fixes;

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
