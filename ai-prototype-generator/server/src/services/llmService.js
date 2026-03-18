import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, CODE_SYSTEM_PROMPT, formatUserPrompt } from '../utils/promptTemplates.js';
import featureExtractor from './featureExtractor.js';
import { validatePrototype } from './prototypeValidator.js';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export class LLMService {
  constructor() {
    const rawModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const cleanModel = rawModel.trim().toLowerCase();
    
    // Fallbacks for unavailable models on the v1beta API tier
    if (cleanModel.includes('1.5-flash')) {
      this.model = 'gemini-2.5-flash';
    } else if (cleanModel.includes('-8b')) {
      this.model = 'gemini-2.0-flash'; // 8b doesn't exist here, fallback to 2.0
    } else {
      this.model = cleanModel;
    }
    
    this.workflowMaxTokens = 4096;    // Lean for workflow-only
    this.codeMaxTokens = 20000;       // Rich budget for code generation (Gemini Flash supports up to 65k)
    this.workflowTemperature = 0.25;   // Deterministic for architecture
    this.codeTemperature = 0.4;      // Slightly creative for code
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

      // ── Step 2: Select system prompt and parameters based on mode ──
      const isCodeMode = mode === 'workflow+code';
      const systemPrompt = isCodeMode ? CODE_SYSTEM_PROMPT : SYSTEM_PROMPT;
      const maxTokens = isCodeMode ? this.codeMaxTokens : this.workflowMaxTokens;
      const temperature = isCodeMode ? this.codeTemperature : this.workflowTemperature;

      const userContent = formatUserPrompt(prompt, sessionState, mode, extractedFeatures);

      // ── Step 3: LLM Generation ──
      const response = await ai.models.generateContent({
        model: this.model,
        contents: userContent,
        config: {
          systemInstruction: systemPrompt,
          temperature: temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        }
      });

      const responseContent = response.text;
      const parsed = this.parseResponse(responseContent);

      // ── Step 4: Validation (post-LLM) ──
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
      }

      // Attach pipeline step info for the frontend
      validated.pipelineSteps = [
        { step: 'Domain Detection', result: extractedFeatures.domain, status: 'complete' },
        { step: 'Feature Extraction', result: `${extractedFeatures.features.length} features identified`, status: 'complete' },
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

    let jsonStr = llmResponse;

    try {
      // 1. Basic extraction: grab everything from first { to last }
      const start = llmResponse.indexOf('{');
      const end = llmResponse.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        jsonStr = llmResponse.substring(start, end + 1);
        return JSON.parse(jsonStr);
      }
      return JSON.parse(llmResponse);
    } catch (e) {
      // 2. Repair Truncated JSON
      // If the string was cut off mid-way, attempt to close open brackets/braces.
      console.warn('Initial JSON parse failed, attempting to repair truncated JSON...');
      let repairedStr = jsonStr;
      
      // Auto-append missing double quotes if the string ended inside one
      const quoteCount = (repairedStr.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repairedStr += '"';
      }

      // Brute force close arrays and objects. 
      // Very basic heuristic: just stack closing braces until it parses.
      const maxAttempts = 15;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          return JSON.parse(repairedStr);
        } catch (repairError) {
          const msg = repairError.message;
          if (msg.includes('Expected') || msg.includes('Unexpected end of JSON input') || msg.includes('Unterminated')) {
             if (repairedStr.lastIndexOf('[') > repairedStr.lastIndexOf(']')) {
               repairedStr += ']';
             } else {
               repairedStr += '}';
             }
          } else {
             // If it's a completely invalid token mid-word, chop off the last character and try again 
             // (e.g. cutting off mid-word "const app = new Vue...")
             repairedStr = repairedStr.slice(0, -1);
          }
        }
      }

      console.error('Failed to parse or repair LLM response as JSON. Excerpt:', llmResponse.substring(0, 200));
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
    const systemPrompt = 'You are a validation assistant. Check if the user prompt is specific enough to generate a prototype. Respond with JSON: { "isValid": true/false, "suggestion": "string or null" }';

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: `Validate this prompt: "${userPrompt}"`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
          maxOutputTokens: 200,
          responseMimeType: "application/json",
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Validation error:', error);
      return { isValid: true, suggestion: null };
    }
  }
}

export default new LLMService();
