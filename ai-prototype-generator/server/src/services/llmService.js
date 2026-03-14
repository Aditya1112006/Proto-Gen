import OpenAI from 'openai';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, formatUserPrompt, formatResponse } from '../utils/promptTemplates.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class LLMService {
  constructor() {
    this.model = 'gpt-4o-mini'; // Using mini for cost efficiency
  }

  /**
   * Generate prototype from user prompt
   * @param {string} prompt - The user prompt
   * @param {string} mode - 'workflow' or 'workflow+code'
   * @param {object} sessionState - Current session state/context
   */
  async generate(prompt, mode = 'workflow', sessionState = null) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: formatUserPrompt(prompt, sessionState, mode) }
    ];

    try {
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0].message.content;
      const parsed = formatResponse(responseContent);

      return {
        success: true,
        data: parsed,
        tokens: completion.usage
      };
    } catch (error) {
      console.error('LLM Error:', error);
      return {
        success: false,
        data: {
          metadata: { title: 'Error', domain: 'error' },
          content: { workflow: '', requirements: [], layout: '', raw: { error: error.message } },
          message: `Generation failed: ${error.message}`
        },
        error: error.message
      };
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
    const messages = [
      {
        role: 'system',
        content: 'You are a validation assistant. Check if the user prompt is specific enough to generate a prototype. Respond with JSON: { isValid: boolean, suggestion: string | null }'
      },
      {
        role: 'user',
        content: `Validate this prompt: "${userPrompt}"`
      }
    ];

    try {
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Validation error:', error);
      return { isValid: true, suggestion: null }; // Default to valid on error
    }
  }
}

export default new LLMService();
