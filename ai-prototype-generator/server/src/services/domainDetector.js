// Domain detection using keyword extraction and semantic similarity
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
      const score = matches / domainWords.length;
      if (score > bestScore) {
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
  detect(prompt, currentDomain) {
    const promptKeywords = this.extractKeywords(prompt);
    const inferredDomain = this.inferDomain(prompt);

    if (!currentDomain) {
      return {
        isSameDomain: true, // First prompt always "same" (no previous to conflict with)
        domain: inferredDomain.name,
        score: inferredDomain.score,
        message: `New prototype created in domain: ${inferredDomain.name}`
      };
    }

    const currentKeywords = this.extractKeywords(currentDomain);
    const similarity = this.calculateSimilarity(promptKeywords, currentKeywords);

    // Threshold: 0.3+ similarity = same domain
    if (similarity >= this.threshold) {
      return {
        isSameDomain: true,
        domain: currentDomain,
        score: similarity,
        message: `Prompt merged into current domain: ${currentDomain}`
      };
    } else {
      return {
        isSameDomain: false,
        domain: inferredDomain.name,
        oldDomain: currentDomain,
        score: similarity,
        message: `Domain changed from "${currentDomain}" to "${inferredDomain.name}". Previous prototype cleared.`
      };
    }
  }

  /**
   * Fallback LLM-based domain detection
   * Returns highest confidence result
   */
  async detectWithLLM(prompt, openaiClient) {
    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const completion = await openaiClient.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a domain classifier. Given a user prompt, classify it into one of these domains: food_delivery, ecommerce, social_media, finance, health_fitness, education, productivity, entertainment, travel, real_estate, or general. Respond with JSON: { "domain": "domain_name", "confidence": 0.0-1.0 }'
          },
          {
            role: 'user',
            content: `Classify this prompt: "${prompt}"`
          }
        ],
        temperature: 0.2,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      return {
        domain: result.domain || 'general',
        score: result.confidence || 0.5
      };
    } catch (error) {
      console.error('LLM domain detection error:', error);
      return { domain: 'general', score: 0.5 };
    }
  }
}

export default new DomainDetector();
