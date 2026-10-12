/**
 * Mathematical formula integration module using KaTeX.
 * Registers native Marked.js extensions for display math ($$), inline math ($), and ```math code blocks.
 */

//=============================================
// KATEX MARKED EXTENSION
//=============================================

let isMathExtensionRegistered = false;

/**
 * Initializes and registers the KaTeX mathematical syntax extension in Marked.js.
 * @returns {void}
 */
export function initMathExtension() {
  if (!window.marked || isMathExtensionRegistered) return;

  window.marked.use({
    extensions: [
      // 1. Display math blocks: $$ ... $$
      {
        name: 'mathBlock',
        level: 'block',
        start(src) {
          return src.indexOf('$$');
        },
        tokenizer(src) {
          const match = /^\$\$[\r\n]+([\s\S]+?)[\r\n]+\$\$/.exec(src);
          if (match) {
            return {
              type: 'mathBlock',
              raw: match[0],
              text: match[1].trim()
            };
          }
        },
        renderer(token) {
          if (!window.katex) {
            return `<pre class="math-error-badge">KaTeX not loaded</pre>\n`;
          }
          try {
            const html = window.katex.renderToString(token.text, {
              displayMode: true,
              throwOnError: false,
              strict: false
            });
            return `<div class="math-block-container">${html}</div>\n`;
          } catch (err) {
            return `<div class="math-block-container"><span class="math-error-badge">LaTeX Error: ${err.message}</span></div>\n`;
          }
        }
      },

      // 2. Inline math spans: $ ... $
      {
        name: 'mathInline',
        level: 'inline',
        start(src) {
          return src.indexOf('$');
        },
        tokenizer(src) {
          const match = /^\$([^\$\n]+?)\$/.exec(src);
          if (match) {
            return {
              type: 'mathInline',
              raw: match[0],
              text: match[1].trim()
            };
          }
        },
        renderer(token) {
          if (!window.katex) {
            return `<code class="math-error-badge">KaTeX not loaded</code>`;
          }
          try {
            const html = window.katex.renderToString(token.text, {
              displayMode: false,
              throwOnError: false,
              strict: false
            });
            return `<span class="math-inline">${html}</span>`;
          } catch (err) {
            return `<span class="math-error-badge">LaTeX Error: ${err.message}</span>`;
          }
        }
      }
    ],

    // 3. Fenced math code blocks: ```math ... ```
    renderer: {
      code({ text, lang }) {
        if (lang === 'math') {
          if (!window.katex) {
            return `<pre class="math-error-badge">KaTeX not loaded</pre>\n`;
          }
          try {
            const html = window.katex.renderToString(text.trim(), {
              displayMode: true,
              throwOnError: false,
              strict: false
            });
            return `<div class="math-block-container">${html}</div>\n`;
          } catch (err) {
            return `<div class="math-block-container"><span class="math-error-badge">LaTeX Error: ${err.message}</span></div>\n`;
          }
        }
        return false; // Delegate other languages to default code renderer
      }
    }
  });

  isMathExtensionRegistered = true;
}
