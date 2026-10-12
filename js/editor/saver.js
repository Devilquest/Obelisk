/**
 * Document persistence client module for Obelisk editor.
 * Manages in-memory document persistence and visual action feedback for static hosting environments.
 */

import { SAVE_DISK_SVG, CHECK_ICON_SVG } from '../icons.js';
import { showAlertModal } from '../ui/modal.js';
import { setDocumentInMemory } from '../core/loader.js';

//=============================================
// PERSISTENCE PROTOCOL
//=============================================

/**
 * Persists the document content to in-memory application state.
 * Resolves without triggering client-side file downloads.
 * @param {string} docPath - Relative or display path of the document.
 * @param {string} content - Markdown text content to save.
 * @returns {Promise<{ ok: boolean, error?: string }>} Outcome status.
 */
export async function saveDocument(docPath, content) {
  try {
    if (typeof content !== 'string') {
      throw new Error('Invalid content buffer provided to saveDocument.');
    }
    setDocumentInMemory(docPath, content);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Executes document persistence with animated visual button feedback.
 * Temporarily displays a saved confirmation before restoring default action state.
 * @param {HTMLButtonElement} saveButton - Save trigger button element.
 * @param {string} docPath - Path to target markdown file.
 * @param {string} content - Markdown content to save.
 * @param {Function} [onSuccess] - Callback executed upon successful persistence.
 * @param {Function} [onComplete] - Callback executed after feedback animation completes.
 * @returns {Promise<boolean>} Whether persistence succeeded.
 */
export async function triggerSaveWithFeedback(saveButton, docPath, content, onSuccess, onComplete) {
  if (!saveButton || saveButton.disabled || saveButton.classList.contains('is-saving')) {
    return false;
  }

  const iconSpan = saveButton.querySelector('.btn-icon');

  saveButton.disabled = true;
  saveButton.classList.add('is-saving');
  if (iconSpan) {
    iconSpan.innerHTML = '<span class="save-spinner"></span>';
  }

  const result = await saveDocument(docPath, content);

  saveButton.classList.remove('is-saving');

  if (result.ok) {
    saveButton.classList.add('is-saved');
    if (iconSpan) {
      iconSpan.innerHTML = CHECK_ICON_SVG;
    }

    if (typeof onSuccess === 'function') {
      onSuccess();
    }

    setTimeout(() => {
      saveButton.classList.remove('is-saved');
      if (iconSpan) {
        iconSpan.innerHTML = SAVE_DISK_SVG;
      }
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 1500);

    return true;
  }

  saveButton.disabled = false;
  if (iconSpan) {
    iconSpan.innerHTML = SAVE_DISK_SVG;
  }

  await showAlertModal({
    title: 'Save Failed',
    message: result.error || 'Unable to save document buffer.',
    buttonLabel: 'Dismiss'
  });
  return false;
}
