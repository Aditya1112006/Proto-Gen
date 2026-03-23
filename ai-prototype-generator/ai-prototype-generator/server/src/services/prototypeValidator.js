/**
 * Prototype Validator — Post-LLM validation layer
 * Inspired by Guardrails: ensures all required fields exist with correct types,
 * fills in intelligent defaults for missing data, and guarantees layout is structured.
 */

/**
 * Validate and fix a prototype response from the LLM.
 * Guarantees the output has all required fields with correct types.
 *
 * @param {object} data - Raw parsed LLM response
 * @param {object} context - Pipeline context (domain, features)
 * @returns {{ validated: object, fixes: string[] }} - Validated prototype + list of fixes applied
 */
export function validatePrototype(data, context = {}) {
  const fixes = [];

  if (!data || typeof data !== 'object') {
    fixes.push('Response was not an object — used complete fallback');
    data = {};
  }

  // Normalize: LLM might return flat or nested structure
  let content = data.content || {};
  let metadata = data.metadata || {};
  
  // Rescue the files array no matter where it ended up in the truncated parse
  let files = data.files || metadata.files || content.files || [];

  // --- Title ---
  if (!content.title || typeof content.title !== 'string') {
    content.title = metadata.title || context.title || 'Untitled Prototype';
    fixes.push('Added missing title');
  }

  // --- Domain ---
  if (!content.domain || typeof content.domain !== 'string') {
    content.domain = metadata.domain || context.domain || 'general';
    fixes.push('Added missing domain');
  }

  // --- Summary ---
  if (!content.summary || typeof content.summary !== 'string') {
    content.summary = `A ${content.domain} application prototype.`;
    fixes.push('Generated default summary');
  }

  // --- Roles ---
  if (!Array.isArray(content.roles) || content.roles.length === 0) {
    content.roles = ['User'];
    fixes.push('Added default role (User)');
  }
  // Ensure all roles are strings
  content.roles = content.roles.map(r => typeof r === 'string' ? r : String(r));

  // --- Workflow ---
  if (!Array.isArray(content.workflow) || content.workflow.length === 0) {
    content.workflow = [
      'User opens the application',
      'User interacts with core feature',
      'System processes the request',
      'Dashboard displays results'
    ];
    fixes.push('Added default workflow steps');
  }
  // Ensure all steps are strings
  content.workflow = content.workflow.map(s => typeof s === 'string' ? s : String(s));

  // --- Requirements ---
  if (!Array.isArray(content.requirements) || content.requirements.length === 0) {
    // Try to extract from features
    if (context.features?.length > 0) {
      content.requirements = context.features.map(f => `Support for ${f.toLowerCase()}`);
    } else {
      content.requirements = [
        'User authentication',
        'Core feature functionality',
        'Data storage',
        'Responsive design'
      ];
    }
    fixes.push('Added default requirements');
  }
  // Ensure all requirements are strings
  content.requirements = content.requirements.map(r => typeof r === 'string' ? r : String(r));

  // --- Layout (MUST be a nested object, never a string) ---
  if (!content.layout || typeof content.layout !== 'object' || Array.isArray(content.layout)) {
    content.layout = buildDefaultLayout(content.title);
    fixes.push('Built structured layout hierarchy (was missing or not an object)');
  } else {
    // Validate that it's actually hierarchical (at least one nested key)
    const values = Object.values(content.layout);
    const hasStructure = values.some(v => typeof v === 'object' && v !== null);
    if (!hasStructure) {
      content.layout = buildDefaultLayout(content.title);
      fixes.push('Rebuilt layout hierarchy (was flat)');
    }
  }

  // --- Acceptance Criteria ---
  if (!Array.isArray(content.acceptance_criteria)) {
    content.acceptance_criteria = [];
  }

  // --- Pipeline reasoning (ensure it exists) ---
  if (!content.pipeline || typeof content.pipeline !== 'object') {
    content.pipeline = {
      detected_domain: content.domain,
      extracted_features: context.features || [],
      generation_notes: 'Pipeline reasoning was not provided by the model.'
    };
    fixes.push('Added pipeline reasoning fallback');
  }

  // Sync metadata
  metadata.title = content.title;
  metadata.domain = content.domain;

  const validated = {
    metadata,
    content,
    files: files,
    message: data.message || `Generated ${content.title} prototype.`
  };

  return { validated, fixes };
}

/**
 * Build a sensible default layout hierarchy based on the title/domain
 */
function buildDefaultLayout(title) {
  const appName = title || 'App';
  return {
    [appName]: {
      Header: ['Logo', 'Navigation', 'UserMenu'],
      MainContent: {
        Dashboard: ['StatsCards', 'ActivityFeed'],
        ContentArea: ['PrimaryView', 'DetailPanel']
      },
      Sidebar: ['NavLinks', 'QuickActions'],
      Footer: ['Copyright', 'Links']
    }
  };
}

export default { validatePrototype };
