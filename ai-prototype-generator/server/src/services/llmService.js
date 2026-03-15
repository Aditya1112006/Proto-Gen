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

      // Ensure content structure with fallbacks
      const content = parsed.content || {};
      const metadata = parsed.metadata || {};

      // Process layout - ensure it's a structured object
      const processedLayout = this.processLayout(content.layout);

      // Build complete response with fallbacks for missing fields
      return {
        metadata: {
          title: metadata.title || content.title || 'Untitled Prototype',
          domain: metadata.domain || content.domain || 'general',
          merged_prompt_count: metadata.merged_prompt_count || 1,
          total_prompt_count: metadata.total_prompt_count || 1,
          change_log: metadata.change_log || [],
          files: files
        },
        content: {
          title: content.title || metadata.title || 'Untitled Prototype',
          domain: content.domain || metadata.domain || 'general',
          summary: content.summary || 'A prototype generated from your description.',
          roles: Array.isArray(content.roles) ? content.roles : ['User', 'Admin'],
          // Frontend reads "user_flow" — map from workflow / user_flow
          user_flow: Array.isArray(content.user_flow)
            ? content.user_flow
            : Array.isArray(content.workflow)
              ? content.workflow
              : [
                  'User signs up or logs in',
                  'User interacts with core feature',
                  'System processes the request',
                  'Dashboard displays results'
                ],
          // Keep workflow too for route-level backward compatibility
          workflow: Array.isArray(content.workflow) ? content.workflow : [],
          // Frontend reads requirements.functional / requirements.non_functional
          requirements: (() => {
            const raw = content.requirements;
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
              return {
                functional: Array.isArray(raw.functional) ? raw.functional : [],
                non_functional: Array.isArray(raw.non_functional) ? raw.non_functional : []
              };
            }
            if (Array.isArray(raw)) {
              return { functional: raw, non_functional: [] };
            }
            return {
              functional: [
                'User authentication',
                'Core feature functionality',
                'Data storage',
                'Analytics dashboard'
              ],
              non_functional: []
            };
          })(),
          // Layout as hierarchical structure
          layout: processedLayout,
          layout_plan: processedLayout, // For backward compatibility
          acceptance_criteria: Array.isArray(content.acceptance_criteria) ? content.acceptance_criteria : [],
          raw: content
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
   * Process layout to ensure it's a hierarchical object
   * Converts text descriptions to structured format if needed
   */
  processLayout(layout) {
    // If layout is already an object (not a string), return it
    if (layout && typeof layout === 'object' && !Array.isArray(layout)) {
      return layout;
    }

    // If layout is a string, try to parse it as JSON
    if (typeof layout === 'string') {
      try {
        const parsed = JSON.parse(layout);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // Not valid JSON, convert text to structure
        return this.convertTextToLayout(layout);
      }
    }

    // Default fallback structure
    return {
      App: {
        Header: ['Logo', 'Navigation', 'UserMenu'],
        MainContent: ['ContentArea'],
        Footer: ['Copyright', 'Links']
      }
    };
  }

  /**
   * Convert text description to hierarchical layout structure
   */
  convertTextToLayout(text) {
    if (!text || typeof text !== 'string') {
      return { App: { Content: ['Main'] } };
    }

    // Try to extract structure from common patterns
    const lines = text.split('\n').filter(line => line.trim());
    const structure = { App: {} };
    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for section headers (e.g., "Header:", "Navigation:")
      if (trimmed.endsWith(':')) {
        currentSection = trimmed.slice(0, -1);
        structure.App[currentSection] = [];
      }
      // Check for bullet points or list items
      else if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
        const item = trimmed.replace(/^[-•\d.\s]+/, '').trim();
        if (currentSection && structure.App[currentSection]) {
          if (Array.isArray(structure.App[currentSection])) {
            structure.App[currentSection].push(item);
          }
        } else {
          // If no current section, add to a generic Components section
          if (!structure.App.Components) {
            structure.App.Components = [];
          }
          structure.App.Components.push(item);
        }
      }
      // Check for "with" or "containing" patterns
      else if (trimmed.toLowerCase().includes(' with ') || trimmed.toLowerCase().includes(' containing ')) {
        const parts = trimmed.split(/\s+(?:with|containing)\s+/i);
        if (parts.length >= 2) {
          const sectionName = parts[0].trim();
          const items = parts[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(s => s);
          structure.App[sectionName] = items;
        }
      }
    }

    // If no structure was extracted, create a generic one from the text
    if (Object.keys(structure.App).length === 0) {
      // Extract key UI terms
      const uiTerms = ['header', 'navigation', 'sidebar', 'footer', 'dashboard', 'menu', 'toolbar'];
      const foundTerms = uiTerms.filter(term => text.toLowerCase().includes(term));

      if (foundTerms.length > 0) {
        for (const term of foundTerms) {
          const capitalized = term.charAt(0).toUpperCase() + term.slice(1);
          structure.App[capitalized] = ['Component'];
        }
      } else {
        // Ultimate fallback
        structure.App = {
          Header: ['Logo', 'Navigation'],
          Main: ['Content'],
          Footer: ['Links']
        };
      }
    }

    return structure;
  }

  /**
   * Parse LLM response, handling JSON extraction from markdown
   */
  parseResponse(llmResponse) {
    if (!llmResponse || typeof llmResponse !== 'string') {
      return this.getFallbackResponse('Empty or invalid response');
    }

    // Clean the response - remove common markdown wrappers and extra whitespace
    let cleanedResponse = llmResponse.trim();

    // Remove markdown code block fences if present
    // Matches ```json, ```, etc. at the start and end
    cleanedResponse = cleanedResponse.replace(/^```[\w]*\n?/i, '');
    cleanedResponse = cleanedResponse.replace(/\n?```$/i, '');
    cleanedResponse = cleanedResponse.trim();

    try {
      // Try to parse as JSON directly
      return JSON.parse(cleanedResponse);
    } catch (e) {
      // Try to extract JSON from within the text using regex
      // Look for content between curly braces, handling nested structures
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Failed to parse extracted JSON:', parseError);
        }
      }

      // Try to find JSON in code blocks with more flexible pattern
      const codeBlockMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        try {
          return JSON.parse(codeBlockMatch[1].trim());
        } catch (parseError) {
          console.error('Failed to parse JSON from code block:', parseError);
        }
      }

      console.error('Failed to parse LLM response as JSON:', llmResponse.substring(0, 200));
      return this.getFallbackResponse(cleanedResponse);
    }
  }

  /**
   * Get a fallback response structure when parsing fails
   */
  getFallbackResponse(rawContent) {
    return {
      metadata: {
        title: 'Generated Prototype',
        domain: 'general',
        merged_prompt_count: 1,
        total_prompt_count: 1,
        change_log: [],
        mode: 'workflow',
        files: []
      },
      content: {
        title: 'Generated Prototype',
        domain: 'general',
        summary: 'A prototype generated from your prompt.',
        roles: ['User', 'Admin'],
        workflow: [
          'User signs up or logs in',
          'User interacts with core feature',
          'System processes the request',
          'Dashboard displays results'
        ],
        requirements: [
          'User authentication',
          'Core feature functionality',
          'Data storage',
          'Analytics dashboard'
        ],
        layout: {
          App: {
            Header: ['Logo', 'Navigation', 'UserMenu'],
            MainContent: ['Dashboard', 'Sidebar'],
            Footer: ['Copyright', 'Links']
          }
        },
        acceptance_criteria: [
          'User can complete primary task flow',
          'System responds within acceptable time limits',
          'Data is persisted correctly'
        ],
        raw: rawContent
      },
      message: 'Prototype generated with default structure.'
    };
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
