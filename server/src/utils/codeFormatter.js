/**
 * Code Formatter — Uses Prettier to format generated HTML and JS
 * files with beautiful indentation and line breaks.
 */

import * as prettier from 'prettier';

/**
 * Formats HTML code using Prettier.
 * Falls back to basic regex-based formatting if Prettier fails.
 */
export async function formatHTML(html) {
  if (!html || typeof html !== 'string') return '';

  // Pre-clean: collapse excessive whitespace between tags first
  const cleaned = html
    .replace(/\s{2,}/g, ' ')      // collapse multiple spaces
    .replace(/>\s+</g, '><')       // remove whitespace between tags
    .trim();

  try {
    const formatted = await prettier.format(cleaned, {
      parser: 'html',
      tabWidth: 2,
      useTabs: false,
      printWidth: 120,
      htmlWhitespaceSensitivity: 'css',
    });
    return formatted.trim();
  } catch (err) {
    console.warn('[codeFormatter] Prettier HTML failed, using fallback:', err.message);
    return basicFormatHTML(cleaned);
  }
}

/**
 * Formats JavaScript code using Prettier.
 * Falls back to basic brace-based formatting if Prettier fails.
 */
export async function formatJS(js) {
  if (!js || typeof js !== 'string') return '';

  try {
    const formatted = await prettier.format(js, {
      parser: 'babel',
      tabWidth: 2,
      useTabs: false,
      printWidth: 100,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
    });
    return formatted.trim();
  } catch (err) {
    console.warn('[codeFormatter] Prettier JS failed, using fallback:', err.message);
    return basicFormatJS(js);
  }
}

/**
 * Formats CSS code using Prettier.
 * Falls back gracefully if Prettier fails.
 */
export async function formatCSS(css) {
  if (!css || typeof css !== 'string') return '';

  try {
    const formatted = await prettier.format(css, {
      parser: 'css',
      tabWidth: 2,
      useTabs: false,
      printWidth: 120,
      singleQuote: false,
    });
    return formatted.trim();
  } catch (err) {
    console.warn('[codeFormatter] Prettier CSS failed, returning as-is:', err.message);
    return css.trim(); // CSS is still valid without formatting
  }
}

// ── Fallback formatters (used when Prettier is unavailable) ──────────────────

function basicFormatHTML(html) {
  const tab = '  ';
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  let formatted = '';
  let indent = '';

  // Split on every tag boundary
  const parts = html
    .replace(/(<[^>]+>)/g, '\n$1\n')
    .replace(/\n+/g, '\n')
    .split('\n');

  for (const part of parts) {
    const line = part.trim();
    if (!line) continue;

    const isClosing = line.startsWith('</');
    const tagMatch = line.match(/^<([a-zA-Z0-9]+)/);
    const isVoid = tagMatch ? voidElements.has(tagMatch[1].toLowerCase()) : false;
    const isSelfClosing = line.endsWith('/>');
    const isOpening = line.startsWith('<') && !isClosing && !isSelfClosing && !isVoid && !line.startsWith('<!') && !line.startsWith('<!--');

    if (isClosing) {
      if (indent.length >= tab.length) indent = indent.slice(0, -tab.length);
    }

    formatted += indent + line + '\n';

    if (isOpening) {
      indent += tab;
    }
  }

  return formatted.trim();
}

function basicFormatJS(js) {
  const tab = '  ';
  let formatted = '';
  let indent = '';

  const normalized = js
    .replace(/([{])\s*/g, '$1\n')
    .replace(/\s*([}])/g, '\n$1')
    .replace(/;\s*/g, ';\n')
    .replace(/\n+/g, '\n');

  for (const line of normalized.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isClosing = trimmed.startsWith('}') || trimmed.startsWith(']');
    const isOpening = trimmed.endsWith('{') || trimmed.endsWith('[');

    if (isClosing && indent.length >= tab.length) {
      indent = indent.slice(0, -tab.length);
    }

    formatted += indent + trimmed + '\n';

    if (isOpening) {
      indent += tab;
    }
  }

  return formatted.trim();
}

export default { formatHTML, formatJS, formatCSS };
