/**
 * Code block enhancement module.
 * Provides syntax highlighting via Highlight.js, language header bars,
 * icon-only copy buttons, word wrap toggles, and line numbers.
 */

import {
  LINES_ICON_SVG,
  WRAP_ICON_SVG,
  COPY_ICON_SVG,
  CHECK_ICON_SVG
} from '../icons.js';

//=============================================
// LINE SPLITTER HELPER
//=============================================

/**
 * Splits highlighted HTML into individual lines wrapped in span.code-line,
 * safely handling open Highlight.js spans across newlines.
 * @param {string} html - Highlighted HTML markup.
 * @returns {{ html: string, lineCount: number }} Processed HTML and line count.
 */
function splitHighlightedHtmlIntoLines(html) {
  const tokenRegex = /(<span\b[^>]*>)|(<\/span>)|(\r?\n)|([^<>\r\n]+)|(<[^>]+>)/g;
  const lines = [];
  let currentLine = '';
  const tagStack = [];

  let match;
  while ((match = tokenRegex.exec(html)) !== null) {
    const [, openSpan, closeSpan, newline] = match;

    if (newline) {
      for (let i = tagStack.length - 1; i >= 0; i--) {
        currentLine += '</span>';
      }
      lines.push(currentLine);
      currentLine = '';
      for (let i = 0; i < tagStack.length; i++) {
        currentLine += tagStack[i];
      }
    } else if (openSpan) {
      tagStack.push(openSpan);
      currentLine += openSpan;
    } else if (closeSpan) {
      if (tagStack.length > 0) tagStack.pop();
      currentLine += closeSpan;
    } else {
      currentLine += match[0];
    }
  }

  for (let i = tagStack.length - 1; i >= 0; i--) {
    currentLine += '</span>';
  }
  lines.push(currentLine);

  const formattedHtml = lines.map((line) => `<span class="code-line">${line || '\n'}</span>`).join('');
  return { html: formattedHtml, lineCount: lines.length };
}

//=============================================
// HIGHLIGHT & DECORATION
//=============================================

/**
 * Enhances all pre/code blocks in the document container with syntax highlighting,
 * header bars, line numbers toggles, word wrap toggles, and icon-only copy buttons.
 * Ignores Mermaid blocks which are processed by their dedicated renderer.
 * @param {HTMLElement} rootElement - The parent document container.
 * @returns {void}
 */
export function enhanceCodeBlocks(rootElement) {
  const codeBlocks = rootElement.querySelectorAll('pre code');

  codeBlocks.forEach((codeEl) => {
    // Skip mermaid diagrams
    if (codeEl.classList.contains('language-mermaid') || codeEl.classList.contains('mermaid')) {
      return;
    }

    const preEl = codeEl.parentElement;
    if (!preEl || preEl.tagName !== 'PRE') return;

    // Detect language class
    let lang = 'text';
    codeEl.classList.forEach((cls) => {
      if (cls.startsWith('language-')) {
        lang = cls.replace('language-', '').toLowerCase();
      }
    });

    const rawCode = codeEl.textContent || '';
    const codeToHighlight = rawCode.replace(/\r?\n$/, '');

    // Apply Highlight.js if available
    let highlightedHtml = codeToHighlight;
    if (window.hljs) {
      try {
        if (lang !== 'text' && window.hljs.getLanguage(lang)) {
          const result = window.hljs.highlight(codeToHighlight, { language: lang, ignoreIllegals: true });
          highlightedHtml = result.value;
        } else {
          const autoResult = window.hljs.highlightAuto(codeToHighlight);
          highlightedHtml = autoResult.value;
          if (autoResult.language) {
            lang = autoResult.language;
          }
        }
      } catch (err) {
        console.warn(`[Highlight.js] Could not highlight ${lang}:`, err);
      }
    }

    // Split lines safely with open tag tracking
    const { html: splitHtml, lineCount } = splitHighlightedHtmlIntoLines(highlightedHtml);
    codeEl.innerHTML = splitHtml;

    // Calculate exact digits count for adaptive line gutter
    const digits = Math.max(1, String(lineCount).length);

    // Build container structure (word wrap active by default)
    const container = document.createElement('div');
    container.className = 'code-block-container has-word-wrap';
    container.style.setProperty('--line-digits', digits);

    const header = document.createElement('div');
    header.className = 'code-block-header';

    const langLabel = document.createElement('span');
    langLabel.className = 'code-lang-label';
    langLabel.textContent = lang;

    const controlsGroup = document.createElement('div');
    controlsGroup.className = 'code-controls-group';

    // 1. Line numbers toggle button
    const linesBtn = document.createElement('button');
    linesBtn.type = 'button';
    linesBtn.className = 'code-control-btn code-lines-btn';
    linesBtn.title = 'Toggle line numbers';
    linesBtn.setAttribute('aria-label', 'Toggle line numbers');
    linesBtn.setAttribute('aria-pressed', 'false');
    linesBtn.innerHTML = LINES_ICON_SVG;

    linesBtn.addEventListener('click', () => {
      const isEnabled = container.classList.toggle('has-line-numbers');
      linesBtn.classList.toggle('is-active', isEnabled);
      linesBtn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
    });

    // 2. Word wrap toggle button (active by default)
    const wrapBtn = document.createElement('button');
    wrapBtn.type = 'button';
    wrapBtn.className = 'code-control-btn code-wrap-btn is-active';
    wrapBtn.title = 'Toggle word wrap';
    wrapBtn.setAttribute('aria-label', 'Toggle word wrap');
    wrapBtn.setAttribute('aria-pressed', 'true');
    wrapBtn.innerHTML = WRAP_ICON_SVG;

    wrapBtn.addEventListener('click', () => {
      const isWrapped = container.classList.toggle('has-word-wrap');
      wrapBtn.classList.toggle('is-active', isWrapped);
      wrapBtn.setAttribute('aria-pressed', isWrapped ? 'true' : 'false');
    });

    // 3. Copy button (icon-only)
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'code-control-btn code-copy-btn';
    copyBtn.title = 'Copy code';
    copyBtn.setAttribute('aria-label', 'Copy code');
    copyBtn.innerHTML = COPY_ICON_SVG;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rawCode);
        copyBtn.innerHTML = CHECK_ICON_SVG;
        copyBtn.classList.add('is-copied');
        copyBtn.title = 'Copied!';
        copyBtn.setAttribute('aria-label', 'Copied!');

        setTimeout(() => {
          copyBtn.innerHTML = COPY_ICON_SVG;
          copyBtn.classList.remove('is-copied');
          copyBtn.title = 'Copy code';
          copyBtn.setAttribute('aria-label', 'Copy code');
        }, 1500);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    });

    controlsGroup.appendChild(linesBtn);
    controlsGroup.appendChild(wrapBtn);
    controlsGroup.appendChild(copyBtn);

    header.appendChild(langLabel);
    header.appendChild(controlsGroup);

    // Replace original pre in DOM
    preEl.parentNode.insertBefore(container, preEl);
    container.appendChild(header);
    container.appendChild(preEl);
  });
}
