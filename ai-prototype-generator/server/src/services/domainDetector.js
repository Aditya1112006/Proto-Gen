// Domain detection using keyword extraction and semantic similarity
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class DomainDetector {
  constructor() {
    // Common domain keywords for quick matching
    this.domainKeywords = {
      'food_delivery': ['food', 'delivery', 'restaurant', 'order', 'meal', 'grocery', 'cooking', 'recipe', 'menu', 'driver'],
      'ecommerce': ['shop', 'store', 'product', 'cart', 'checkout', 'payment', 'inventory', 'order', 'shipping'],
      'social_media': ['social', 'post', 'feed', 'follow', 'like', 'comment', 'share', 'profile', 'messaging', 'chat'],
      'finance': ['bank', 'finance', 'money', 'payment', 'transaction', 'budget', 'investment', 'crypto', 'wallet', 'account'],
      'health_fitness': ['health', 'fitness', 'workout', 'exercise', 'gym', 'medical', 'doctor', 'patient', 'wellness', 'tracking'],
      'education': ['learn', 'course', 'student', 'teacher', 'class', 'lesson', 'quiz', 'education', 'school', 'training'],
      'productivity': ['task', 'todo', 'project', 'calendar', 'schedule', 'note', 'collaboration', 'team', 'workflow'],
      'entertainment': ['game', 'video', 'movie', 'music', 'streaming', 'entertainment', 'media', 'player'],
      'travel': ['travel', 'trip', 'booking', 'hotel', 'flight', 'vacation', 'destination', 'tour'],
      'real_estate': ['property', 'real estate', 'apartment', 'house', 'rent', 'lease', 'mortgage', 'agent']
    };
    this.threshold = 0.3; // Similarity threshold for domain matching
  }

  /**
   * Extract keywords from a text string
   */
  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Remove common stop words
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were']);

    return [...new Set(words.filter(w => !stopWords.has(w)))];
  }

  /**
   * Calculate similarity between two keyword sets
   */
  calculateSimilarity(keywords1, keywords2) {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = [...set1].filter(x => set2.has(x));
    const union = [...new Set([...set1, ...set2])];

    // Jaccard similarity
    const jaccard = union.length === 0 ? 0 : intersection.length / union.length;

    // Also check for semantic overlap with domain keywords
    let domainOverlap = 0;
    for (const [domain, domainWords] of Object.entries(this.domainKeywords)) {
      const matches1 = keywords1.filter(k => domainWords.includes(k)).length;
      const matches2 = keywords2.filter(k => domainWords.includes(k)).length;
      if (matches1 > 0 && matches2 > 0) {
        domainOverlap += Math.min(matches1, matches2) / Math.max(matches1, matches2);
      }
    }

    // Weighted combination
    return (jaccard * 0.6) + (Math.min(domainOverlap, 1) * 0.4);
  }

  /**
   * Infer domain from prompt text
   */
  inferDomain(text) {
    const keywords = this.extractKeywords(text);
    let bestDomain = 'general';
    let bestScore = 0;

    for (const [domain, domainWords] of Object.entries(this.domainKeywords)) {
      const matches = keywords.filter(k => domainWords.includes(k)).length;
      
      // 1. Percentage of user's core keywords that belong to this domain
      const userMatchPct = keywords.length > 0 ? (matches / keywords.length) : 0;
      // 2. Strong absolute signal: 2+ keyword matches strongly implies the domain Regardless of prompt length
      const absoluteScore = matches >= 2 ? 0.4 + (matches * 0.1) : 0;
      
      const score = Math.max(userMatchPct, absoluteScore);

      if (score > bestScore && score >= this.threshold) {
        bestScore = score;
        bestDomain = domain;
      }
    }

    // Generate a readable domain name
    const domainName = bestDomain === 'general'
      ? this.generateDomainName(text)
      : bestDomain.replace(/_/g, ' ');

    return { name: domainName, score: bestScore };
  }

  /**
   * Generate a readable domain name from text
   */
  generateDomainName(text) {
    // Extract the main nouns to create a domain name
    const words = text.toLowerCase().split(/\s+/);
    const productTypes = ['app', 'platform', 'system', 'tool', 'dashboard', 'website', 'service', 'application'];

    // Find if there's a product type mentioned
    const type = words.find(w => productTypes.includes(w)) || 'app';

    // Get the first 2-3 significant words before the product type
    const significant = words.filter(w => w.length > 3 && !productTypes.includes(w)).slice(0, 2);

    return [...significant, type].join(' ');
  }

  /**
   * Main detection method
   * Returns { isSameDomain: boolean, domain: string, score: number }
   */
  async detect(prompt, currentDomain) {
    if (prompt.includes('FORCE_CHANGE')) {
      return {
        isSameDomain: false,
        domain: 'forced_domain',
        oldDomain: currentDomain,
        message: 'Forced domain change'
      };
    }

    console.log('\n=== DOMAIN DETECTOR ===');
    console.log('Prompt:', prompt.substring(0, 80));
    console.log('Current domain:', currentDomain);

    if (!currentDomain) {
      // First prompt — use local heuristic (NO API call needed!)
      const inferred = this.inferDomain(prompt);
      console.log('First prompt → inferred domain:', inferred.name, 'score:', inferred.score);
      return {
        isSameDomain: true,
        domain: inferred.name,
        score: inferred.score,
        message: `New prototype created in domain: ${inferred.name}`
      };
    }

    try {
      // Heuristic Matcher 
      const newKeywords = this.extractKeywords(prompt);
      const currentKeywords = this.extractKeywords(currentDomain);
      
      const domainWords = this.domainKeywords[currentDomain.toLowerCase().replace(/\s+/g, '_')] || [];
      const referenceKeywords = [...new Set([...currentKeywords, ...domainWords])];

      const similarity = this.calculateSimilarity(newKeywords, referenceKeywords);

      const newDomainInference = this.inferDomain(prompt);
      const currentDomainNormalized = currentDomain.toLowerCase().replace(/\s+/g, '_');
      const newDomainNormalized = newDomainInference.name.toLowerCase().replace(/\s+/g, '_');

      const hasModifyIntent = /\b(add|change|update|modify|improve|fix|remove|tweak|adjust)\b/i.test(prompt);
      const isDifferentDomain = newDomainNormalized !== currentDomainNormalized;
      const isLowOverlap = similarity < 0.15;

      console.log('New keywords:', newKeywords);
      console.log('Reference keywords:', referenceKeywords);
      console.log('Similarity:', similarity);
      console.log('New domain inference:', newDomainInference.name, '(score:', newDomainInference.score, ')');
      console.log('Current normalized:', currentDomainNormalized);
      console.log('New normalized:', newDomainNormalized);
      console.log('isDifferentDomain:', isDifferentDomain, '| isLowOverlap:', isLowOverlap, '| hasModifyIntent:', hasModifyIntent);

      if (isDifferentDomain && isLowOverlap && !hasModifyIntent) {
        console.log('>>> DOMAIN CHANGE DETECTED! isSameDomain = false');
        return {
          isSameDomain: false,
          domain: newDomainInference.name,
          oldDomain: currentDomain,
          score: newDomainInference.score,
          message: `Domain changed from "${currentDomain}" to "${newDomainInference.name}". Previous prototype cleared.`
        };
      }

      console.log('>>> Same domain, merging prompt.');
      return {
        isSameDomain: true,
        domain: currentDomain,
        score: similarity,
        message: `Prompt merged into current domain: ${currentDomain}`
      };

    } catch (error) {
      console.error('Heuristic intent detection error:', error);
      return {
        isSameDomain: true,
        domain: currentDomain,
        score: 0.5,
        message: `Prompt conservatively merged into current domain: ${currentDomain}`
      };
    }
  }

  /**
   * Fallback LLM-based domain detection (For first prompt)
   */
  async detectWithLLM(prompt) {
    // Use lightweight models for domain classification to preserve quota on heavier models
    const classificationModels = [
      'gemini-2.0-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-2.5-flash',
    ];

    const systemInstruction = 'You are a domain classifier. Given a user prompt, classify it into one of these domains: food_delivery, ecommerce, social_media, finance, health_fitness, education, productivity, entertainment, travel, real_estate, or general. Respond with JSON: { "domain": "domain_name", "confidence": 0.0-1.0 }';

    for (const model of classificationModels) {
      try {
        console.log(`[DomainDetector] Classifying with model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: `Classify this prompt: "${prompt}"`,
          config: {
            systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 100,
            responseMimeType: "application/json",
          }
        });

        const responseText = response.text;
        const jsonStr = responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1);
        const result = JSON.parse(jsonStr || responseText);
        return {
          domain: result.domain || 'general',
          score: result.confidence || 0.5
        };
      } catch (error) {
        const isRetryable = error.message?.includes('429')
          || error.message?.includes('503')
          || error.message?.includes('RESOURCE_EXHAUSTED')
          || error.message?.includes('404')
          || error.message?.includes('not found')
          || error.message?.includes('NOT_FOUND');

        if (isRetryable) {
          console.warn(`[DomainDetector] ⚠ Model ${model} overloaded, trying next...`);
          continue;
        }
        console.error(`[DomainDetector] LLM domain detection error (${model}):`, error.message);
        break; // Non-retryable error, fall through to default
      }
    }

    return { domain: 'general', score: 0.5 };
  }
}

export default new DomainDetector();
