/**
 * Core Markdown parser configuration and post-processing module.
 * Extends Marked.js with GFM Alert callouts, footnotes, table wrappers, and GitHub-compliant heading slugs.
 */

import { ALERT_ICONS } from '../icons.js';

//=============================================
// GFM ALERT DEFINITIONS
//=============================================

const ALERT_TYPES = {
  NOTE: {
    className: 'markdown-alert-note',
    title: 'Note',
    icon: ALERT_ICONS.NOTE
  },
  TIP: {
    className: 'markdown-alert-tip',
    title: 'Tip',
    icon: ALERT_ICONS.TIP
  },
  IMPORTANT: {
    className: 'markdown-alert-important',
    title: 'Important',
    icon: ALERT_ICONS.IMPORTANT
  },
  WARNING: {
    className: 'markdown-alert-warning',
    title: 'Warning',
    icon: ALERT_ICONS.WARNING
  },
  CAUTION: {
    className: 'markdown-alert-caution',
    title: 'Caution',
    icon: ALERT_ICONS.CAUTION
  }
};

//=============================================
// GITHUB SLUG GENERATOR
//=============================================

/**
 * Generates URL anchor slugs identical to GitHub's markdown specification.
 * Strips punctuation characters and transforms every whitespace character to a hyphen.
 * @param {string} text - Heading text content.
 * @returns {string} Normalized GitHub-compatible slug.
 */
function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\s-]/gu, '')
    .replace(/\s/g, '-');
}

//=============================================
// FOOTNOTE PROCESSOR
//=============================================

/**
 * Preprocesses markdown text to extract footnote definitions and link references.
 * @param {string} text - Raw Markdown text.
 * @returns {{ processedText: string, footnoteDefs: Map<string, string> }}
 */
function processFootnotes(text) {
  const footnoteDefs = new Map();

  // Extract footnote definitions: [^id]: Definition text...
  const defRegex = /^\[\^([a-zA-Z0-9_-]+)\]:[ \t]+([^\n]+(?:\n+(?: {2,}|\t)[^\n]+)*)/gm;
  let processedText = text.replace(defRegex, (_, id, content) => {
    footnoteDefs.set(id, content.trim());
    return '';
  });

  // Convert footnote references: [^id]
  const refRegex = /\[\^([a-zA-Z0-9_-]+)\]/g;
  processedText = processedText.replace(refRegex, (_, id) => {
    if (footnoteDefs.has(id)) {
      return `<sup class="footnote-ref" id="fnref-${id}"><a href="#fn-${id}">[${id}]</a></sup>`;
    }
    return `[^${id}]`;
  });

  return { processedText, footnoteDefs };
}

//=============================================
// PARSER & POST-PROCESSORS
//=============================================

/**
 * Strips YAML Frontmatter from the top of the markdown document if present.
 * @param {string} text - The raw Markdown text.
 * @returns {string} Text without YAML frontmatter header.
 */
function stripYamlFrontmatter(text) {
  if (text.startsWith('---')) {
    const endIdx = text.indexOf('\n---', 3);
    if (endIdx !== -1) {
      return text.substring(endIdx + 4).trimStart();
    }
  }
  return text;
}

/**
 * Parses markdown into an HTML string using Marked.js.
 * Configures GitHub heading slugs, footnotes, and GFM features.
 * @param {string} markdownText - The Markdown text to compile.
 * @returns {string} The compiled HTML string.
 */
export function compileMarkdown(markdownText) {
  if (!window.marked) {
    throw new Error('Marked.js library is not available.');
  }

  window.marked.use({
    gfm: true,
    breaks: false,
    pedantic: false,
    renderer: {
      heading({ tokens, depth, text }) {
        const id = slugify(text);
        const parsedText = this.parser.parseInline(tokens);
        return `<h${depth} id="${id}">${parsedText}</h${depth}>\n`;
      }
    }
  });

  const cleanedText = stripYamlFrontmatter(markdownText);
  const { processedText, footnoteDefs } = processFootnotes(cleanedText);

  let compiledHtml = window.marked.parse(processedText);

  // Append formatted footnotes section if definitions exist
  if (footnoteDefs.size > 0) {
    let footnotesSection = '<section class="footnotes"><ol>';
    for (const [id, rawContent] of footnoteDefs.entries()) {
      const parsedContent = window.marked.parseInline(rawContent);
      footnotesSection += `<li id="fn-${id}">${parsedContent} <a href="#fnref-${id}" class="footnote-backref" aria-label="Back to citation">↩</a></li>`;
    }
    footnotesSection += '</ol></section>';
    compiledHtml += footnotesSection;
  }

  return compiledHtml;
}

/**
 * Post-processes rendered DOM to decorate GFM alert callouts and wrap tables.
 * @param {HTMLElement} rootElement - The parent container with compiled HTML.
 * @returns {void}
 */
export function postProcessMarkdownDOM(rootElement) {
  // 1. Wrap all tables for responsive horizontal scrolling
  const tables = rootElement.querySelectorAll('table');
  tables.forEach((table) => {
    if (table.parentElement && !table.parentElement.classList.contains('table-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });

  // 2. Transform GFM Alert blockquotes
  const blockquotes = rootElement.querySelectorAll('blockquote');
  blockquotes.forEach((bq) => {
    const firstP = bq.querySelector('p');
    if (!firstP) return;

    const match = firstP.innerHTML.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br>|\n)?/i);
    if (!match) return;

    const alertKey = match[1].toUpperCase();
    const config = ALERT_TYPES[alertKey];
    if (!config) return;

    // Remove the [!ALERT] token from paragraph text
    firstP.innerHTML = firstP.innerHTML.replace(match[0], '');

    const alertCard = document.createElement('div');
    alertCard.className = `markdown-alert ${config.className}`;

    const titleEl = document.createElement('div');
    titleEl.className = 'markdown-alert-title';
    titleEl.innerHTML = `${config.icon}<span>${config.title}</span>`;

    const contentEl = document.createElement('div');
    contentEl.className = 'markdown-alert-content';
    while (bq.firstChild) {
      contentEl.appendChild(bq.firstChild);
    }

    alertCard.appendChild(titleEl);
    alertCard.appendChild(contentEl);
    bq.replaceWith(alertCard);
  });

  const externalLinks = rootElement.querySelectorAll('a[href^="http://"], a[href^="https://"]');
  externalLinks.forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
}
