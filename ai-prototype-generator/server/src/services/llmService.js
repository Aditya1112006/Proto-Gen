import OpenAI from 'openai';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, formatUserPrompt, formatResponse } from '../utils/promptTemplates.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export class LLMService {
  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = 2000;
    this.temperature = 0.2;
  }

  /**
   * Generate prototype from user prompt
   * @param {string} prompt - The user prompt
   * @param {string} mode - 'workflow' or 'workflow+code'
   * @param {object} sessionState - Current session state/context
   * @returns {object} { metadata, content, files } or { error: true, message: "..." }
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
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0].message.content;
      const parsed = this.parseResponse(responseContent);

      // Extract files from response if present
      const files = parsed.metadata?.files || parsed.files || [];

      return {
        metadata: {
          title: parsed.metadata?.title || 'Untitled Prototype',
          domain: parsed.metadata?.domain || 'general',
          merged_prompt_count: parsed.metadata?.merged_prompt_count || 1,
          total_prompt_count: parsed.metadata?.total_prompt_count || 1,
          change_log: parsed.metadata?.change_log || [],
          files: files
        },
        content: {
          workflow: parsed.content?.workflow || parsed.content?.summary || '',
          requirements: parsed.content?.requirements?.functional || parsed.content?.requirements || [],
          layout: parsed.content?.layout_plan || parsed.content?.layout || '',
          raw: parsed.content || {}
        },
        files: files
      };
    } catch (error) {
      console.error('LLM Error:', error);
      return {
        error: true,
        message: `Generation failed: ${error.message}`
      };
    }
  }

  /**
   * Parse LLM response, handling JSON extraction from markdown
   */
  parseResponse(llmResponse) {
    try {
      // Try to parse as JSON directly
      return JSON.parse(llmResponse);
    } catch (e) {
      // Try to extract JSON from triple-backtick fenced code blocks
      const jsonMatch = llmResponse.match(/```(?:json)?\n?([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch (parseError) {
          console.error('Failed to parse JSON from code block:', parseError);
        }
      }

      // Fallback: return raw content wrapped
      return {
        metadata: { title: 'Raw Response', domain: 'general' },
        content: { raw: llmResponse },
        files: []
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
