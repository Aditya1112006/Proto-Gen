/**
 * PromptExpander - Turns a vague user idea into a detailed product spec.
 *
 * Users tend to write short, vague prompts like "make a fitness app".
 * This service acts as a Product Manager step: it sends the raw prompt to
 * Gemini (with a lightweight model) and gets back a rich, detailed brief
 * covering interactions, aesthetics, edge cases, and feature specifics.
 *
 * Graceful degradation: if all models fail, the raw prompt is returned
 * unchanged so the main generation pipeline is never blocked.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Lightweight models tried in order – fast and cheap for this pre-processing step.
const MODELS = [
  process.env.GEMINI_MODEL?.trim().toLowerCase() || 'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash',
  'gemini-2.5-flash',
];

const RETRY_CODES = new Set([429, 503, 500, 404]);
const MIN_LENGTH  = 30; // shorter than this is probably a refusal or empty

const SYSTEM_PROMPT = `You are an elite Product Manager and UX/UI Strategist AI. Your ONE job is to take a brief, rough user idea and transform it into a comprehensive, detailed product specification.

## Rules
1. Output ONLY the enhanced prompt text. No preamble, no JSON, no markdown headers.
2. Output a single flowing product brief – not a bulleted list.
3. Expand every interaction detail with specific UI behaviour (transitions, modals, animations, close behaviour, etc.).
4. Add industry-standard features the user didn't mention but would obviously want.
5. PRESERVE USER INTENT: keep every specific item or name the user mentioned.
6. Specify UI aesthetics: dark/light theme, colour palette mood, typography feel, spacing.
7. Specify interactive states: hover, active, loading, empty, error.
8. CRITICAL – NO BLANK PAGES: every nav link and tab must reveal content that is actually generated.
9. Keep output under 350 words. Dense, specific, and actionable.`;

/**
 * Expand a raw user prompt into a detailed product specification.
 *
 * @param {string} rawPrompt        User's original unmodified input.
 * @param {object|null} context     Current session context (domain, title, summary)
 *                                  for continuation-aware expansion.
 * @returns {Promise<string>}       Expanded spec text, or rawPrompt on failure.
 */
async function expandPrompt(rawPrompt, context = null) {
  const request = context?.domain && context?.title
    ? [
        `CURRENT APP CONTEXT:`,
        `Title: ${context.title}`,
        `Domain: ${context.domain}`,
        `Summary: ${context.summary || ''}`,
        '',
        `USER'S REQUESTED CHANGE:`,
        `"${rawPrompt}"`,
        '',
        `Expand this into a detailed feature update spec. Keep every specific item the user requested. Add UI/UX details that fit the current app.`,
      ].join('\n')
    : [
        `USER IDEA:`,
        `"${rawPrompt}"`,
        '',
        `Expand this into a comprehensive product brief. Keep every specific detail the user mentioned.`,
      ].join('\n');

  let lastErr = null;

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      console.log(`[PromptExpander] Expanding with: ${model}${i > 0 ? ' (fallback)' : ''}`);

      const res  = await ai.models.generateContent({
        model,
        contents: request,
        config: { temperature: 0.7, maxOutputTokens: 600, systemInstruction: SYSTEM_PROMPT },
      });

      const text = res.text?.trim();
      if (!text || text.length < MIN_LENGTH) {
        throw new Error(`Response too short (${text?.length ?? 0} chars) – likely a refusal.`);
      }

      console.log(`[PromptExpander] ✓ Expanded to ${text.length} chars`);
      return text;

    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.httpStatusCode || err?.code;
      const msg    = (err?.message || '').toLowerCase();
      const retry  = RETRY_CODES.has(status) || msg.includes('429') || msg.includes('503')
        || msg.includes('overloaded') || msg.includes('resource_exhausted') || msg.includes('not found');

      if (retry && i < MODELS.length - 1) {
        console.warn(`[PromptExpander] ⚠ "${model}" failed (${status || msg}). Trying next...`);
        continue;
      }

      console.error(`[PromptExpander] ✗ All models failed:`, err.message);
      break;
    }
  }

  console.warn('[PromptExpander] Falling back to raw prompt.');
  return rawPrompt;
}

export default { enhance: expandPrompt };
