/**
 * Mermaid diagram initialization and asynchronous rendering module.
 */

//=============================================
// INITIALIZATION
//=============================================

let isMermaidInitialized = false;

/**
 * Initializes the global Mermaid library with dark mode settings.
 * @returns {void}
 */
function initMermaid() {
  if (!window.mermaid || isMermaidInitialized) return;

  try {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      themeVariables: {
        darkMode: true,
        background: '#141517',
        primaryColor: '#1e2023',
        primaryBorderColor: 'rgba(255, 255, 255, 0.15)',
        primaryTextColor: '#f4f4f5',
        lineColor: '#a1a1aa',
        secondaryColor: '#1a1b1e',
        tertiaryColor: '#141517'
      }
    });
    isMermaidInitialized = true;
  } catch (err) {
    console.error('[Mermaid] Initialization failed:', err);
  }
}

//=============================================
// DIAGRAM RENDERER
//=============================================

/**
 * Finds all mermaid code blocks in rootElement and renders them into responsive SVGs.
 * @param {HTMLElement} rootElement - The parent document container.
 * @returns {Promise<void>}
 */
export async function renderMermaidDiagrams(rootElement) {
  if (!window.mermaid) {
    console.warn('[Mermaid] Global mermaid library not available.');
    return;
  }

  initMermaid();

  const mermaidBlocks = rootElement.querySelectorAll('pre code.language-mermaid, pre code.mermaid');
  let diagramCount = 0;

  for (const codeEl of mermaidBlocks) {
    const preEl = codeEl.parentElement;
    if (!preEl) continue;

    const graphDefinition = codeEl.textContent.trim();
    const diagramId = `obelisk_mermaid_${Date.now()}_${diagramCount++}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-wrapper';

    try {
      const { svg } = await window.mermaid.render(diagramId, graphDefinition);
      wrapper.innerHTML = svg;
      preEl.replaceWith(wrapper);
    } catch (err) {
      console.warn('[Mermaid] Diagram render failed:', err);
      wrapper.className = 'mermaid-error-container';
      wrapper.textContent = `Mermaid Render Error: ${err.message || 'Invalid diagram definition'}`;
      preEl.replaceWith(wrapper);
    }
  }
}
