/**
 * Main application orchestrator for Obelisk.
 * Coordinates document retrieval, rendering pipeline stages, and UI lifecycle.
 */

import { downloadDocument, setDocumentInMemory } from './core/loader.js';
import { DOWNLOAD_ICON_SVG, CLOSE_ICON_SVG } from './icons.js';
import { showConfirmModal, showAlertModal } from './ui/modal.js';
import { initScrollTopButton } from './ui/scroll-top.js';
import {
  initLandingScreen,
  showLandingScreen,
  hideLandingScreen,
  isSupportedMarkdownFile
} from './ui/landing.js';
import {
  safeDecodeURI,
  parseHashRoute,
  updateUrlHash,
  scrollToAnchor
} from './core/router.js';
import { initMathExtension } from './renderer/math.js';
import { compileMarkdown, postProcessMarkdownDOM } from './renderer/markdown.js';
import { enhanceCodeBlocks } from './renderer/code-block.js';
import { renderMermaidDiagrams } from './renderer/mermaid.js';
import {
  initEditor,
  openEditor,
  isEditorOpen,
  isEditorDirty,
  closeEditor,
  confirmDiscardChanges
} from './editor/editor.js';
import {
  showLoadingVeil,
  hideLoadingVeil,
  dismissAppSplash,
  waitForNextPaint
} from './ui/veil.js';

//=============================================
// STATE
//=============================================

let currentDocumentPath = null;
let currentRawMarkdown = null;

//=============================================
// DOCUMENT NAME DISPLAY
//=============================================

/**
 * Updates the document name displayed in the workspace top bar.
 * Displays only the clean document file name.
 * @param {string|null} docName - Document file name or path.
 * @returns {void}
 */
function updateDocumentPath(docName) {
  const container = document.getElementById('doc-path');
  const divider = document.getElementById('header-divider');
  if (!container) return;

  if (!docName) {
    container.textContent = '';
    if (divider) divider.hidden = true;
    return;
  }

  if (divider) divider.hidden = false;

  const decoded = safeDecodeURI(docName);
  const fileName = decoded.split(/[/\\]/).pop();
  container.textContent = fileName;
}

//=============================================
// PIPELINE EXECUTION
//=============================================

/**
 * Processes raw markdown text through the full compilation pipeline and populates the target container.
 * Performs compilation and asynchronous sub-renders off-DOM in a staging buffer, atomically swapping
 * contents once complete to eliminate layout shifts and intermediate repaints.
 * @param {string} rawMarkdown - Document raw text contents.
 * @param {HTMLElement} container - DOM container receiving compiled markup.
 * @returns {Promise<void>}
 */
async function renderMarkdownPipeline(rawMarkdown, container) {
  const stage = document.createElement('div');
  stage.className = container.className;
  stage.innerHTML = compileMarkdown(rawMarkdown);

  postProcessMarkdownDOM(stage);
  enhanceCodeBlocks(stage);
  await renderMermaidDiagrams(stage);

  container.replaceChildren(...stage.childNodes);
  container.classList.remove('fade-in');
  void container.offsetWidth;
  container.classList.add('fade-in');
}

/**
 * Renders raw markdown text with the document name into the container.
 * @param {string} fileName - Clean file name of the document.
 * @param {string} rawMarkdown - Document raw text contents.
 * @returns {Promise<void>}
 */
export async function renderDocument(fileName, rawMarkdown) {
  const container = document.getElementById('document-content');
  if (!container) return;

  currentDocumentPath = fileName;
  currentRawMarkdown = rawMarkdown;

  await renderMarkdownPipeline(rawMarkdown, container);

  const appMain = document.querySelector('.app-main');
  if (appMain) appMain.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  updateDocumentPath(fileName);

  const headerActions = document.getElementById('header-actions');
  if (headerActions) headerActions.removeAttribute('hidden');

  hideLandingScreen();

  await waitForNextPaint();
}

/**
 * Creates and initializes a blank document directly in editor mode.
 * @returns {void}
 */
export function createNewDocument() {
  currentDocumentPath = 'untitled.md';
  currentRawMarkdown = '';
  setDocumentInMemory('untitled.md', '');

  const docContainer = document.getElementById('document-content');
  if (docContainer) {
    docContainer.replaceChildren();
  }

  updateDocumentPath('untitled.md');
  hideLandingScreen();
  openEditor('untitled.md', '');

  const appMain = document.querySelector('.app-main');
  if (appMain) {
    appMain.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
}

/**
 * Prompts user confirmation and unloads the current document if approved.
 * Restores the workspace to the initial document loading state.
 * @returns {Promise<boolean>} True if the document was closed.
 */
export async function requestCloseDocument() {
  if (!currentDocumentPath && currentRawMarkdown === null) {
    return false;
  }

  const confirmed = await showConfirmModal({
    title: 'Close Document?',
    message: 'Are you sure you want to close this document? Any undownloaded modifications will be discarded.',
    confirmLabel: 'Close Document',
    cancelLabel: 'Keep Reading',
    type: 'danger'
  });

  if (!confirmed) {
    return false;
  }

  if (isEditorOpen()) closeEditor();

  currentDocumentPath = null;
  currentRawMarkdown = null;

  const container = document.getElementById('document-content');
  if (container) container.replaceChildren();

  updateDocumentPath(null);

  const headerActions = document.getElementById('header-actions');
  if (headerActions) headerActions.setAttribute('hidden', '');

  if (window.location.hash) {
    history.pushState(null, '', window.location.pathname + window.location.search);
  }

  const appMain = document.querySelector('.app-main');
  if (appMain) {
    appMain.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  showLandingScreen();

  return true;
}

//=============================================
// APPLICATION BOOTSTRAP
//=============================================

/**
 * Intercepts clicks on document links to handle in-document section anchors.
 * @param {MouseEvent} event - User click mouse event.
 * @returns {void}
 */
function handleDocumentClick(event) {
  const link = event.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href) return;

  if (href.startsWith('#')) {
    event.preventDefault();
    const anchorId = href.slice(1);
    if (!anchorId) {
      scrollToAnchor('', true);
      updateUrlHash('');
      return;
    }
    scrollToAnchor(anchorId, true);
    updateUrlHash(anchorId);
    return;
  }

  if (/^[a-z]+:/i.test(href) || href.startsWith('//')) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
}

async function bootstrap() {
  initMathExtension();

  // Clear any legacy file path in hash from previous sessions
  if (window.location.hash && window.location.hash.includes('.md')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const { anchor } = parseHashRoute(window.location.hash);

  initEditor({
    renderPipeline: async (markdownText, targetElement) => {
      await renderMarkdownPipeline(markdownText, targetElement);
    },
    onSaveSuccess: (docPath, savedContent) => {
      currentRawMarkdown = savedContent;
    },
    onClose: async () => {
      const docContainer = document.getElementById('document-content');
      try {
        if (docContainer && currentRawMarkdown !== null) {
          await renderMarkdownPipeline(currentRawMarkdown, docContainer);
        }
        const appMain = document.querySelector('.app-main');
        if (appMain) {
          appMain.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        await waitForNextPaint();
      } finally {
        await hideLoadingVeil();
      }
    }
  });

  initScrollTopButton();

  const btnDownloadDoc = document.getElementById('btn-download-doc');
  if (btnDownloadDoc) {
    const iconSpan = btnDownloadDoc.querySelector('.btn-icon');
    if (iconSpan) iconSpan.innerHTML = DOWNLOAD_ICON_SVG;
    btnDownloadDoc.addEventListener('click', () => {
      if (currentRawMarkdown !== null) {
        const fileName = currentDocumentPath ? currentDocumentPath.split(/[/\\]/).pop() : 'document.md';
        downloadDocument(fileName, currentRawMarkdown);
      }
    });
  }

  const btnEditDoc = document.getElementById('btn-edit-doc');
  if (btnEditDoc) {
    btnEditDoc.addEventListener('click', () => {
      if (currentDocumentPath && currentRawMarkdown !== null) {
        openEditor(currentDocumentPath, currentRawMarkdown);
      }
    });
  }

  const btnCloseDoc = document.getElementById('btn-close-doc');
  if (btnCloseDoc) {
    const iconSpan = btnCloseDoc.querySelector('.btn-icon');
    if (iconSpan) iconSpan.innerHTML = CLOSE_ICON_SVG;
    btnCloseDoc.addEventListener('click', () => {
      requestCloseDocument();
    });
  }

  const brandLink = document.getElementById('brand-link');
  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentDocumentPath || currentRawMarkdown !== null) {
        requestCloseDocument();
      } else if (window.location.hash) {
        history.pushState(null, '', window.location.pathname + window.location.search);
      }
    });
  }

  initLandingScreen({
    onFileSelected: async (file) => {
      if (!file) return;

      if (!isSupportedMarkdownFile(file)) {
        await showAlertModal({
          title: 'Unsupported File Type',
          message: 'Only .md, .markdown, and .txt files are supported.',
          buttonLabel: 'Dismiss'
        });
        return;
      }

      if (isEditorDirty()) {
        const proceed = await confirmDiscardChanges(
          'You have unsaved changes. Discard them and open the selected document?'
        );
        if (!proceed) return;
      }

      if (isEditorOpen()) {
        closeEditor();
      }

      try {
        showLoadingVeil('Opening document...');
        const text = await file.text();
        await renderDocument(file.name, text);
      } catch (error) {
        console.error('[Obelisk] Failed to read local file:', error);
      } finally {
        await hideLoadingVeil();
      }
    },
    onNewDocument: async () => {
      if (isEditorDirty()) {
        const proceed = await confirmDiscardChanges(
          'You have unsaved changes. Discard them and create a new document?'
        );
        if (!proceed) return;
      }

      if (isEditorOpen()) {
        closeEditor();
      }

      createNewDocument();
    }
  });

  const docContainer = document.getElementById('document-content');
  if (docContainer) {
    docContainer.addEventListener('click', handleDocumentClick);
  }

  window.addEventListener('hashchange', () => {
    const { anchor: targetAnchor } = parseHashRoute(window.location.hash);
    if (targetAnchor) {
      scrollToAnchor(targetAnchor, true);
    } else {
      scrollToAnchor('', true);
    }
  });

  updateDocumentPath(null);

  if (anchor) {
    requestAnimationFrame(() => {
      scrollToAnchor(anchor, false);
    });
  }

  await waitForNextPaint();
  await dismissAppSplash();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
