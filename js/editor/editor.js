/**
 * Markdown editor controller and UI orchestration module for Obelisk.
 * Manages edit/preview tab lifecycle, buffer dirty state, and unsaved changes safety guards.
 */

import { handleTextareaTab, registerEditorShortcuts } from './shortcuts.js';
import { triggerSaveWithFeedback } from './saver.js';
import { showConfirmModal } from '../ui/modal.js';
import {
  EDIT_ICON_SVG,
  PREVIEW_ICON_SVG,
  CLOSE_ICON_SVG,
  SAVE_DISK_SVG
} from '../icons.js';
import {
  showLoadingVeil,
  hideLoadingVeil,
  waitForNextPaint
} from '../ui/veil.js';

//=============================================
// STATE VARIABLES
//=============================================

let activeDocPath = null;
let originalContent = '';
let isEditorActive = false;
let activeTab = 'edit';
let unregisterShortcuts = null;
let renderPipelineFn = null;
let saveSuccessFn = null;

let lastRenderedPreviewText = null;

//=============================================
// DIRTY STATE MANAGEMENT
//=============================================

/**
 * Checks whether the editor currently contains unsaved modifications.
 * @returns {boolean} True if editor is open and buffer differs from disk content.
 */
export function isEditorDirty() {
  if (!isEditorActive) return false;
  const textarea = document.getElementById('editor-textarea');
  if (!textarea) return false;
  const normalizedValue = textarea.value.replace(/\r\n/g, '\n');
  return normalizedValue !== originalContent;
}

/**
 * Updates the dirty state indicator, save button availability, and window unload safety guard.
 * @returns {void}
 */
function updateDirtyState() {
  const dirtyBadge = document.getElementById('editor-dirty-badge');
  const saveBtn = document.getElementById('btn-save-edit');
  const dirty = isEditorDirty();

  if (dirtyBadge) {
    if (dirty) {
      dirtyBadge.removeAttribute('hidden');
      dirtyBadge.setAttribute('aria-hidden', 'false');
    } else {
      dirtyBadge.setAttribute('hidden', '');
      dirtyBadge.setAttribute('aria-hidden', 'true');
    }
  }

  if (saveBtn) {
    saveBtn.disabled = !dirty;
  }
}

/**
 * Window beforeunload safety handler preventing accidental data loss.
 * @param {BeforeUnloadEvent} event - Browser beforeunload event.
 * @returns {void}
 */
function handleBeforeUnload(event) {
  if (isEditorDirty()) {
    event.preventDefault();
    event.returnValue = '';
  }
}

/**
 * Prompts user for confirmation with custom dark modal dialog if unsaved changes exist.
 * @param {string} [customMessage] - Optional custom confirmation message.
 * @returns {Promise<boolean>} True if safe to proceed, false if user cancelled.
 */
export async function confirmDiscardChanges(customMessage) {
  if (!isEditorDirty()) return true;
  return await showConfirmModal({
    title: 'Discard Unsaved Changes?',
    message: customMessage || 'You have unsaved changes. Discard them and continue?',
    confirmLabel: 'Discard Changes',
    cancelLabel: 'Keep Editing',
    type: 'danger'
  });
}

//=============================================
// TAB SWITCHING & PREVIEW
//=============================================

/**
 * Activates either the edit or preview tab.
 * Displays a full-viewport loading veil during preview rendering to suppress layout shifts and tile flashing.
 * @param {'edit' | 'preview'} targetTab - Desired active tab identifier.
 * @returns {Promise<void>}
 */
async function switchEditorTab(targetTab) {
  const tabEdit = document.getElementById('tab-edit');
  const tabPreview = document.getElementById('tab-preview');
  const editPane = document.getElementById('editor-edit-pane');
  const previewPane = document.getElementById('editor-preview-pane');
  const previewContent = document.getElementById('editor-preview-content');
  const textarea = document.getElementById('editor-textarea');

  if (!tabEdit || !tabPreview || !editPane || !previewPane) return;

  activeTab = targetTab;

  if (targetTab === 'edit') {
    tabEdit.classList.add('is-active');
    tabEdit.setAttribute('aria-selected', 'true');
    tabPreview.classList.remove('is-active');
    tabPreview.setAttribute('aria-selected', 'false');

    previewPane.setAttribute('hidden', '');
    editPane.removeAttribute('hidden');

    if (textarea) {
      textarea.focus({ preventScroll: true });
    }
  } else {
    tabPreview.classList.add('is-active');
    tabPreview.setAttribute('aria-selected', 'true');
    tabEdit.classList.remove('is-active');
    tabEdit.setAttribute('aria-selected', 'false');

    editPane.setAttribute('hidden', '');
    previewPane.removeAttribute('hidden');

    const currentText = textarea ? textarea.value : '';

    if (currentText === lastRenderedPreviewText && previewContent && previewContent.firstElementChild) {
      return;
    }

    showLoadingVeil('Rendering preview...');

    if (typeof renderPipelineFn === 'function' && previewContent && textarea) {
      try {
        await renderPipelineFn(currentText, previewContent);
        if (activeTab === 'preview') {
          lastRenderedPreviewText = currentText;
          previewPane.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          await waitForNextPaint();
        }
      } catch (err) {
        console.error('[Editor] Preview render failed:', err);
        if (activeTab === 'preview') {
          previewContent.innerHTML = `
            <div class="error-state">
              <h2 class="state-title">Preview Error</h2>
              <p class="state-description">${err.message || 'Failed to render markdown'}</p>
            </div>
          `;
        }
      } finally {
        if (activeTab === 'preview') {
          await hideLoadingVeil();
        }
      }
    }
  }
}

//=============================================
// SAVE DISPATCHER
//=============================================

/**
 * Executes persistence for the currently loaded document buffer.
 * @returns {Promise<boolean>} True if save succeeded.
 */
async function performSave() {
  if (!isEditorDirty()) return false;

  const textarea = document.getElementById('editor-textarea');
  const saveBtn = document.getElementById('btn-save-edit');
  if (!textarea || !activeDocPath || !saveBtn) return false;

  const currentText = textarea.value.replace(/\r\n/g, '\n');

  return await triggerSaveWithFeedback(
    saveBtn,
    activeDocPath,
    currentText,
    () => {
      originalContent = currentText;
      updateDirtyState();

      if (typeof saveSuccessFn === 'function') {
        saveSuccessFn(activeDocPath, currentText);
      }
    },
    () => {
      updateDirtyState();
    }
  );
}

//=============================================
// EDITOR LIFECYCLE
//=============================================

/**
 * Initializes DOM elements and event bindings for editor controls.
 * @param {object} options - Initialization options.
 * @param {Function} options.renderPipeline - Callback rendering raw markdown into preview DOM.
 * @param {Function} options.onSaveSuccess - Callback invoked after successful persistence.
 * @param {Function} options.onClose - Callback invoked when editor mode exits.
 * @returns {void}
 */
export function initEditor({ renderPipeline, onSaveSuccess, onClose }) {
  renderPipelineFn = renderPipeline;
  saveSuccessFn = onSaveSuccess;

  const tabEdit = document.getElementById('tab-edit');
  const tabPreview = document.getElementById('tab-preview');
  const textarea = document.getElementById('editor-textarea');
  const btnClose = document.getElementById('btn-close-edit') || document.getElementById('btn-cancel-edit');
  const btnSave = document.getElementById('btn-save-edit');

  const btnEditDoc = document.getElementById('btn-edit-doc');
  if (btnEditDoc) {
    const editIconSpan = btnEditDoc.querySelector('.btn-icon');
    if (editIconSpan) editIconSpan.innerHTML = EDIT_ICON_SVG;
  }

  if (tabEdit) {
    const tabEditIcon = tabEdit.querySelector('.btn-icon');
    if (tabEditIcon) tabEditIcon.innerHTML = EDIT_ICON_SVG;
    tabEdit.addEventListener('click', () => switchEditorTab('edit'));
  }

  if (tabPreview) {
    const tabPreviewIcon = tabPreview.querySelector('.btn-icon');
    if (tabPreviewIcon) tabPreviewIcon.innerHTML = PREVIEW_ICON_SVG;
    tabPreview.addEventListener('click', () => switchEditorTab('preview'));
  }

  if (textarea) {
    textarea.addEventListener('keydown', (e) => handleTextareaTab(e, textarea));
    textarea.addEventListener('input', () => updateDirtyState());
  }

  if (btnClose) {
    const iconSpan = btnClose.querySelector('.btn-icon');
    if (iconSpan) {
      iconSpan.innerHTML = CLOSE_ICON_SVG;
    }
    btnClose.addEventListener('click', async () => {
      const proceed = await confirmDiscardChanges('You have unsaved changes. Discard them and close the editor?');
      if (proceed) {
        showLoadingVeil('Loading document...');
        closeEditor();
        if (typeof onClose === 'function') {
          await onClose();
        }
      }
    });
  }

  if (btnSave) {
    const saveIconSpan = btnSave.querySelector('.btn-icon');
    if (saveIconSpan) {
      saveIconSpan.innerHTML = SAVE_DISK_SVG;
    }
    btnSave.addEventListener('click', performSave);
  }

  window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * Opens the editor workspace loaded with target document raw content.
 * @param {string} docPath - Path of the target markdown document.
 * @param {string} rawMarkdown - Document raw text contents.
 * @returns {void}
 */
export function openEditor(docPath, rawMarkdown) {
  const normalizedText = (rawMarkdown || '').replace(/\r\n/g, '\n');
  activeDocPath = docPath;
  originalContent = normalizedText;
  isEditorActive = true;
  lastRenderedPreviewText = null;

  const previewContent = document.getElementById('editor-preview-content');
  if (previewContent) {
    previewContent.replaceChildren();
  }

  const appWorkspace = document.querySelector('.app-workspace');
  if (appWorkspace) {
    appWorkspace.classList.add('is-editing');
  }

  const headerActions = document.getElementById('header-actions');
  const btnEditHeader = document.getElementById('btn-edit-doc');
  const editorWorkspace = document.getElementById('editor-workspace');
  const segmentedTabs = document.getElementById('editor-segmented-tabs');
  const editorActions = document.getElementById('editor-actions');
  const docViewArticle = document.getElementById('document-content');
  const textarea = document.getElementById('editor-textarea');

  if (headerActions) headerActions.setAttribute('hidden', '');
  if (btnEditHeader) btnEditHeader.setAttribute('hidden', '');
  if (docViewArticle) docViewArticle.setAttribute('hidden', '');
  if (segmentedTabs) segmentedTabs.removeAttribute('hidden');
  if (editorActions) editorActions.removeAttribute('hidden');
  if (editorWorkspace) editorWorkspace.removeAttribute('hidden');

  if (textarea) {
    textarea.value = normalizedText;
    textarea.selectionStart = 0;
    textarea.selectionEnd = 0;
    textarea.scrollTop = 0;
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  const docViewport = document.getElementById('viewport-container');
  if (docViewport) docViewport.scrollTop = 0;

  updateDirtyState();
  switchEditorTab('edit');

  if (unregisterShortcuts) {
    unregisterShortcuts();
  }
  unregisterShortcuts = registerEditorShortcuts(performSave);
}

/**
 * Closes the editor workspace and restores normal document viewer state.
 * @returns {void}
 */
export function closeEditor() {
  isEditorActive = false;
  activeDocPath = null;
  originalContent = '';
  lastRenderedPreviewText = null;

  const previewContent = document.getElementById('editor-preview-content');
  if (previewContent) {
    previewContent.replaceChildren();
  }

  const appWorkspace = document.querySelector('.app-workspace');
  if (appWorkspace) {
    appWorkspace.classList.remove('is-editing');
  }

  const headerActions = document.getElementById('header-actions');
  const btnEditHeader = document.getElementById('btn-edit-doc');
  const editorWorkspace = document.getElementById('editor-workspace');
  const segmentedTabs = document.getElementById('editor-segmented-tabs');
  const editorActions = document.getElementById('editor-actions');
  const dirtyBadge = document.getElementById('editor-dirty-badge');
  const docViewArticle = document.getElementById('document-content');

  if (editorWorkspace) editorWorkspace.setAttribute('hidden', '');
  if (segmentedTabs) segmentedTabs.setAttribute('hidden', '');
  if (editorActions) editorActions.setAttribute('hidden', '');
  if (dirtyBadge) dirtyBadge.setAttribute('hidden', '');
  if (headerActions) headerActions.removeAttribute('hidden');
  if (btnEditHeader) btnEditHeader.removeAttribute('hidden');
  if (docViewArticle) docViewArticle.removeAttribute('hidden');

  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  if (unregisterShortcuts) {
    unregisterShortcuts();
    unregisterShortcuts = null;
  }
}

/**
 * Indicates whether the editor workspace is currently active.
 * @returns {boolean} True if editor is open.
 */
export function isEditorOpen() {
  return isEditorActive;
}
