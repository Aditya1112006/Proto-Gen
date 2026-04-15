/**
 * Feature Extractor — Pre-LLM pipeline step
 * Extracts domain + features from the user prompt using keyword matching.
 * Results feed into the LLM prompt so the model can reference concrete features.
 */
export class FeatureExtractor {
  constructor() {
    // Domain → feature templates
    this.domainFeatures = {
      food_delivery: {
        keywords: ['food', 'delivery', 'restaurant', 'order', 'meal', 'grocery', 'cooking', 'recipe', 'menu', 'driver', 'eat', 'cuisine', 'takeout', 'dine'],
        features: ['Menu browsing', 'Cart & ordering', 'Live order tracking', 'Payment processing', 'Delivery management', 'Ratings & reviews', 'Restaurant profiles', 'Order history']
      },
      ecommerce: {
        keywords: ['shop', 'store', 'product', 'cart', 'checkout', 'payment', 'inventory', 'shipping', 'buy', 'sell', 'marketplace', 'catalog'],
        features: ['Product catalog', 'Search & filtering', 'Shopping cart', 'Checkout flow', 'Payment integration', 'Order management', 'Inventory tracking', 'User reviews']
      },
      social_media: {
        keywords: ['social', 'post', 'feed', 'follow', 'like', 'comment', 'share', 'profile', 'messaging', 'chat', 'community', 'friends', 'network'],
        features: ['User profiles', 'News feed', 'Post creation', 'Commenting system', 'Like/react system', 'Follow/friend system', 'Direct messaging', 'Notifications']
      },
      finance: {
        keywords: ['bank', 'finance', 'money', 'payment', 'transaction', 'budget', 'investment', 'crypto', 'wallet', 'account', 'loan', 'stock', 'trading'],
        features: ['Account management', 'Transaction history', 'Budget tracking', 'Bill payments', 'Fund transfers', 'Investment dashboard', 'Financial reports', 'Alerts & notifications']
      },
      health_fitness: {
        keywords: ['health', 'fitness', 'workout', 'exercise', 'gym', 'medical', 'doctor', 'patient', 'wellness', 'tracking', 'diet', 'nutrition', 'calorie', 'weight', 'steps'],
        features: ['Workout logging', 'Progress analytics', 'Goal tracking', 'Calorie tracking', 'Exercise library', 'Health dashboard', 'Activity feed', 'Personalized plans']
      },
      education: {
        keywords: ['learn', 'course', 'student', 'teacher', 'class', 'lesson', 'quiz', 'education', 'school', 'training', 'tutorial', 'exam', 'grade'],
        features: ['Course catalog', 'Lesson viewer', 'Quiz system', 'Progress tracking', 'Grade management', 'Discussion forums', 'Assignment submission', 'Certificates']
      },
      productivity: {
        keywords: ['task', 'todo', 'project', 'calendar', 'schedule', 'note', 'collaboration', 'team', 'workflow', 'kanban', 'board', 'sprint'],
        features: ['Task management', 'Project boards', 'Calendar view', 'Team collaboration', 'File sharing', 'Time tracking', 'Notifications', 'Reporting']
      },
      entertainment: {
        keywords: ['game', 'video', 'movie', 'music', 'streaming', 'entertainment', 'media', 'player', 'playlist', 'watch', 'listen'],
        features: ['Content library', 'Media player', 'Playlists', 'Recommendations', 'Search & discovery', 'User profiles', 'Favorites', 'Offline mode']
      },
      travel: {
        keywords: ['travel', 'trip', 'booking', 'hotel', 'flight', 'vacation', 'destination', 'tour', 'itinerary', 'reservation'],
        features: ['Search & booking', 'Itinerary builder', 'Map integration', 'Reviews & ratings', 'Price comparison', 'Reservation management', 'Travel guides', 'Notifications']
      },
      real_estate: {
        keywords: ['property', 'real estate', 'apartment', 'house', 'rent', 'lease', 'mortgage', 'agent', 'listing', 'home'],
        features: ['Property listings', 'Search & filters', 'Map view', 'Virtual tours', 'Agent profiles', 'Mortgage calculator', 'Saved properties', 'Contact forms']
      }
    };

    // Generic feature keywords that appear across domains
    this.genericFeatureKeywords = {
      'authentication': ['login', 'signup', 'auth', 'register', 'password', 'account'],
      'dashboard': ['dashboard', 'analytics', 'stats', 'overview', 'metrics', 'insights'],
      'notifications': ['notification', 'alert', 'push', 'remind', 'update'],
      'search': ['search', 'filter', 'find', 'browse', 'discover'],
      'user profiles': ['profile', 'settings', 'preferences', 'avatar'],
      'admin panel': ['admin', 'manage', 'moderate', 'control panel'],
      'reporting': ['report', 'export', 'analytics', 'chart', 'graph'],
      'real-time updates': ['realtime', 'real-time', 'live', 'instant', 'websocket']
    };
  }

  /**
   * Extract features from a user prompt.
   * @param {string} prompt - The user's text prompt
   * @param {object|null} sessionContext - Existing session context (domain, features)
   * @returns {{ domain: string, features: string[], confidence: number }}
   */
  extract(prompt, sessionContext = null) {
    const words = this.tokenize(prompt);

    // 1. Determine domain
    let bestDomain = 'general';
    let hasKnownDomain = false;
    
    // We already reliably detected the domain in the previous pipeline step via domainDetector.js
    // Re-use it instead of naively recalculating!
    if (sessionContext && sessionContext.domain) {
      // Normalize format just in case (e.g. "Food Delivery" -> "food_delivery")
      const normalized = sessionContext.domain.toLowerCase().replace(/\s+/g, '_');
      if (this.domainFeatures[normalized]) {
        bestDomain = normalized;
        hasKnownDomain = true;
      }
    }

    // Only fallback to heuristic if the route didn't provide a context
    let bestScore = hasKnownDomain ? 1 : 0; // If known domain, pretend perfect score to extract features
    
    if (!hasKnownDomain) {
      const CONFIDENCE_THRESHOLD = 0.25;

      for (const [domain, config] of Object.entries(this.domainFeatures)) {
        const matches = words.filter(w => config.keywords.some(kw => w.includes(kw) || kw.includes(w)));
        
        const userMatchPct = words.length > 0 ? (matches.length / words.length) : 0;
        const absoluteScore = matches.length >= 2 ? 0.4 + (matches.length * 0.1) : 0;
        
        const score = Math.max(userMatchPct, absoluteScore);

        if (score > bestScore && score >= CONFIDENCE_THRESHOLD) {
          bestScore = score;
          bestDomain = domain;
        }
      }
    }

    // 2. Extract domain-specific features
    let features = [];
    if (bestDomain !== 'general') {
      const domainConfig = this.domainFeatures[bestDomain];
      // Add features that match keywords found in the prompt
      features = domainConfig.features.filter((feature, index) => {
        const featureWords = feature.toLowerCase().split(/\s+/);
        return featureWords.some(fw => words.some(w => w.includes(fw) || fw.includes(w)));
      });

      // If we matched the domain but no specific features, add the top 4
      if (features.length === 0) {
        features = domainConfig.features.slice(0, 4);
      }
    }

    // 3. Extract generic features from prompt
    for (const [featureName, keywords] of Object.entries(this.genericFeatureKeywords)) {
      if (keywords.some(kw => words.some(w => w.includes(kw)))) {
        if (!features.includes(featureName)) {
          features.push(featureName);
        }
      }
    }

    // 4. Extract explicit features mentioned in the prompt (e.g. "with workout logging and progress tracking")
    const explicitFeatures = this.extractExplicitFeatures(prompt);
    for (const ef of explicitFeatures) {
      if (!features.some(f => f.toLowerCase() === ef.toLowerCase())) {
        features.push(ef);
      }
    }

    // 5. Merge with session context if same domain
    if (sessionContext?.features?.length > 0) {
      for (const existingFeature of sessionContext.features) {
        if (!features.some(f => f.toLowerCase() === existingFeature.toLowerCase())) {
          features.push(existingFeature);
        }
      }
    }

    // Cap at 10 features
    features = features.slice(0, 10);

    const readableDomain = bestDomain === 'general'
      ? this.inferDomainName(prompt)
      : bestDomain.replace(/_/g, ' ');

    return {
      domain: readableDomain,
      features,
      confidence: Math.min(bestScore * 3, 1) // Normalize to 0-1
    };
  }

  /**
   * Tokenize text into lowercase words
   */
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  /**
   * Extract features explicitly stated in the prompt
   * Looks for patterns like "with X, Y, and Z" or "features: X, Y"
   */
  extractExplicitFeatures(prompt) {
    const features = [];

    // Pattern: "with [feature1], [feature2], and [feature3]"
    const withPattern = /with\s+(.+?)(?:\.|$)/gi;
    let match;
    while ((match = withPattern.exec(prompt)) !== null) {
      const parts = match[1].split(/,\s*|\s+and\s+/).map(p => p.trim()).filter(p => p.length > 2 && p.length < 50);
      features.push(...parts);
    }

    // Pattern: "features: [list]" or "including [list]"
    const includePattern = /(?:features?|including|supports?)\s*:?\s+(.+?)(?:\.|$)/gi;
    while ((match = includePattern.exec(prompt)) !== null) {
      const parts = match[1].split(/,\s*|\s+and\s+/).map(p => p.trim()).filter(p => p.length > 2 && p.length < 50);
      features.push(...parts);
    }

    return [...new Set(features)];
  }

  /**
   * Infer a readable domain name when no predefined domain matches
   */
  inferDomainName(text) {
    const words = text.toLowerCase().split(/\s+/);
    const appWords = ['app', 'platform', 'system', 'tool', 'dashboard', 'website', 'service', 'application'];
    const significant = words
      .filter(w => w.length > 3 && !appWords.includes(w))
      .filter(w => !['build', 'create', 'make', 'want', 'need', 'like', 'that', 'with', 'this', 'from', 'have'].includes(w))
      .slice(0, 2);

    return significant.length > 0 ? significant.join(' ') : 'general';
  }
}

export default new FeatureExtractor();
