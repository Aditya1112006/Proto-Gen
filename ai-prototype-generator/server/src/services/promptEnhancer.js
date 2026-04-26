// ─────────────────────────────────────────────────────────────────────────────
// promptEnhancer.js
// Uses a fast Gemini call to expand a brief, raw user prompt into a detailed,
// highly specific UI/UX and feature specification before prototype generation.
// This is the "magic" step that makes Proto-Gen feel like it truly understands
// what the user wants at a professional level.
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Use a fast model for enhancement to minimize latency
const ENHANCEMENT_MODELS = [
  process.env.GEMINI_MODEL?.trim().toLowerCase() || 'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash',
  'gemini-2.5-flash',
];

const ENHANCEMENT_SYSTEM_PROMPT = `You are an elite Product Manager and UX/UI Strategist AI. Your ONE job is to take a brief, rough user idea and transform it into a comprehensive, detailed product specification.

## Rules
1. Output ONLY the enhanced prompt text. No preamble, no "Here is your enhanced prompt:", no JSON, no markdown headers.
2. The output must read as a single, flowing, detailed product brief — not a bulleted list.
3. Expand every interaction detail. If the user says "click a project to expand it", specify EXACTLY how: smooth CSS transition, modal overlay vs. inline accordion, what info appears inside, animations, close behavior, etc.
4. Add industry-standard features the user didn't mention but would obviously want.
5. PRESERVE USER INTENT (a + b, not b + c): You MUST explicitly include all specific items, names, or requirements the user asked for. Do not drop their specific requests in favor of generic ones. If they ask for "pizza, burger, noodles", your enhanced prompt MUST contain those exact items, plus the UI/UX polish.
6. Specify UI aesthetics: dark/light theme, color palette mood (professional, vibrant, minimal), typography feel, spacing density (airy vs. compact).
7. Specify all interactive states: hover, active, loading, empty, error states.
8. CRITICAL — NO BLANK PAGES: Explicitly state that every nav link, CTA button, and tab must scroll to or reveal a section that is ACTUALLY generated in the HTML.
9. Keep the output under 350 words. Dense, specific, and actionable.`;

/**
 * Expand a raw user prompt into a detailed UI/UX spec using Gemini.
 * @param {string} rawPrompt - The raw user input
 * @param {Object} currentContext - The current app context (if any)
 * @returns {Promise<string>} The enhanced, detailed prompt
 */
async function enhance(rawPrompt, currentContext = null) {
  let userContent = `ORIGINAL USER IDEA:\n"${rawPrompt}"\n\nExpand this into a comprehensive product brief for a prototype generator. Make sure to keep EVERY specific detail the user mentioned.`;

  // If there's an existing app context, inform the enhancer so it doesn't hallucinate a completely new app
  // unless the user is explicitly pivoting.
  if (currentContext && currentContext.domain && currentContext.title) {
    userContent = `CURRENT APP CONTEXT:\nTitle: ${currentContext.title}\nDomain: ${currentContext.domain}\nSummary: ${currentContext.summary || ''}\n\nUSER'S REQUESTED ADDITIONS/CHANGES:\n"${rawPrompt}"\n\nExpand this request into a detailed feature update specification. 
    IMPORTANT: You must keep the exact items the user requested (do not replace their specific ideas with generic ones). Polish their idea with UI/UX details (animations, layout, interactions) that fit the current app context.`;
  }

  let lastError = null;

  for (let i = 0; i < ENHANCEMENT_MODELS.length; i++) {
    const model = ENHANCEMENT_MODELS[i];
    try {
      console.log(`[PromptEnhancer] Enhancing with model: ${model}${i > 0 ? ' (fallback)' : ''}`);

      const response = await ai.models.generateContent({
        model,
        contents: userContent,
        config: {
          temperature: 0.7, // slightly creative so output feels natural
          maxOutputTokens: 600,
          systemInstruction: ENHANCEMENT_SYSTEM_PROMPT,
        },
      });

      const enhanced = response.text?.trim();

      if (!enhanced || enhanced.length < 30) {
        throw new Error('Enhancement response was too short or empty.');
      }

      console.log(`[PromptEnhancer] ✓ Enhanced prompt (${enhanced.length} chars)`);
      return enhanced;

    } catch (error) {
      lastError = error;
      const status = error?.status || error?.httpStatusCode || error?.code;
      const errMsg = (error?.message || '').toLowerCase();

      const isRetryable =
        [429, 503, 500, 404].includes(status) ||
        errMsg.includes('429') ||
        errMsg.includes('503') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('resource_exhausted') ||
        errMsg.includes('not found');

      if (isRetryable && i < ENHANCEMENT_MODELS.length - 1) {
        console.warn(`[PromptEnhancer] ⚠ Model ${model} failed (${status || errMsg}). Trying fallback...`);
        continue;
      }

      // Last model or non-retryable error — surface
      console.error(`[PromptEnhancer] ✗ All enhancement models failed:`, error.message);
      break;
    }
  }

  // Graceful degradation: if all models fail, return the raw prompt unchanged
  console.warn('[PromptEnhancer] Falling back to raw prompt (enhancement failed).');
  return rawPrompt;
}

export default { enhance };
