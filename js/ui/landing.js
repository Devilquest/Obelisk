/**
 * Landing screen and viewport drag-and-drop controller for Obelisk.
 * Manages full-window drop events, file validation, and landing view visibility.
 */

import { FILE_UPLOAD_ICON_SVG, PLUS_ICON_SVG } from '../icons.js';

//=============================================
// CONSTANTS & STATE
//=============================================

const SUPPORTED_EXTENSIONS = ['.md', '.markdown', '.txt'];

let dragCounter = 0;
let fileCallback = null;
let errorTimer = null;

//=============================================
// FILE VALIDATION
//=============================================

/**
 * Validates whether a file has a supported markdown extension.
 * @param {File} file - Selected or dropped file object.
 * @returns {boolean} True if supported.
 */
export function isSupportedMarkdownFile(file) {
  if (!file || !file.name) return false;
  const fileName = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

//=============================================
// ERROR STATE MANAGEMENT
//=============================================

/**
 * Displays error state with shake animation and error text on the dropzone.
 * @param {string} [message] - Description of the error.
 * @returns {void}
 */
export function showDropzoneError(message = 'Unsupported file type. Please select a .md, .markdown, or .txt file.') {
  const card = document.getElementById('dropzone-card');
  const errorEl = document.getElementById('landing-error');

  if (card) {
    card.classList.remove('is-error');
    void card.offsetWidth;
    card.classList.add('is-error');
  }

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('is-visible');
  }

  if (errorTimer) {
    clearTimeout(errorTimer);
  }

  errorTimer = setTimeout(() => {
    clearDropzoneError();
  }, 4500);
}

/**
 * Clears error styling and hides error message on the dropzone.
 * @returns {void}
 */
export function clearDropzoneError() {
  if (errorTimer) {
    clearTimeout(errorTimer);
    errorTimer = null;
  }

  const card = document.getElementById('dropzone-card');
  const errorEl = document.getElementById('landing-error');

  if (card) {
    card.classList.remove('is-error');
  }

  if (errorEl) {
    errorEl.classList.remove('is-visible');
  }
}

//=============================================
// VIEW LIFECYCLE
//=============================================

/**
 * Activates the landing screen and conceals workspace document elements.
 * @returns {void}
 */
export function showLandingScreen() {
  clearDropzoneError();
  const landingScreen = document.getElementById('landing-screen');
  const appHeader = document.querySelector('.app-header');
  const docViewport = document.getElementById('viewport-container');

  if (landingScreen) landingScreen.removeAttribute('hidden');
  if (appHeader) appHeader.setAttribute('hidden', '');
  if (docViewport) docViewport.setAttribute('hidden', '');
}

/**
 * Deactivates the landing screen and reveals workspace document elements.
 * @returns {void}
 */
export function hideLandingScreen() {
  clearDropzoneError();
  const landingScreen = document.getElementById('landing-screen');
  const appHeader = document.querySelector('.app-header');
  const docViewport = document.getElementById('viewport-container');

  if (landingScreen) landingScreen.setAttribute('hidden', '');
  if (appHeader) appHeader.removeAttribute('hidden');
  if (docViewport) docViewport.removeAttribute('hidden');
}

/**
 * Checks whether the landing screen is currently visible.
 * @returns {boolean} True if landing screen is active.
 */
export function isLandingActive() {
  const landingScreen = document.getElementById('landing-screen');
  return Boolean(landingScreen && !landingScreen.hasAttribute('hidden'));
}

//=============================================
// DRAG AND DROP HANDLERS
//=============================================

/**
 * Processes a chosen or dropped file, validating format before delegating to handler.
 * @param {File} file - Candidate file object.
 * @returns {void}
 */
function processCandidateFile(file) {
  if (!file) return;

  if (!isSupportedMarkdownFile(file)) {
    if (isLandingActive()) {
      showDropzoneError('Unsupported file type. Please select a .md, .markdown, or .txt file.');
      return;
    }
  }

  clearDropzoneError();
  if (typeof fileCallback === 'function') {
    fileCallback(file);
  }
}

/**
 * Prevents browser default file navigation on dragover.
 * @param {DragEvent} event - Browser drag event.
 * @returns {void}
 */
function handleGlobalDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

/**
 * Increments drag counter and sets active dragging visual state.
 * @param {DragEvent} event - Browser drag event.
 * @returns {void}
 */
function handleGlobalDragEnter(event) {
  event.preventDefault();
  dragCounter += 1;
  clearDropzoneError();
  document.body.classList.add('is-dragging-file');
}

/**
 * Decrements drag counter and removes active dragging visual state when leaving viewport.
 * @param {DragEvent} event - Browser drag event.
 * @returns {void}
 */
function handleGlobalDragLeave(event) {
  event.preventDefault();
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) {
    document.body.classList.remove('is-dragging-file');
  }
}

/**
 * Catches dropped file anywhere on viewport and passes it to the callback.
 * @param {DragEvent} event - Browser drop event.
 * @returns {void}
 */
function handleGlobalDrop(event) {
  event.preventDefault();
  dragCounter = 0;
  document.body.classList.remove('is-dragging-file');

  const files = event.dataTransfer && event.dataTransfer.files;
  if (!files || files.length === 0) return;

  processCandidateFile(files[0]);
}

//=============================================
// INITIALIZATION
//=============================================

/**
 * Initializes landing screen event bindings and full-viewport drag-and-drop protection.
 * @param {object} options - Controller configuration.
 * @param {Function} options.onFileSelected - Callback invoked when a markdown file is selected or dropped.
 * @param {Function} [options.onNewDocument] - Callback invoked when creating a blank document.
 * @returns {void}
 */
export function initLandingScreen({ onFileSelected, onNewDocument }) {
  fileCallback = onFileSelected;

  const dropzoneIcon = document.getElementById('dropzone-icon');
  if (dropzoneIcon) {
    dropzoneIcon.innerHTML = FILE_UPLOAD_ICON_SVG;
  }

  const btnNewDoc = document.getElementById('btn-new-doc');
  if (btnNewDoc) {
    const iconSpan = btnNewDoc.querySelector('.btn-icon');
    if (iconSpan) {
      iconSpan.innerHTML = PLUS_ICON_SVG;
    }
    btnNewDoc.addEventListener('click', () => {
      clearDropzoneError();
      if (typeof onNewDocument === 'function') {
        onNewDocument();
      }
    });
  }

  const dropzoneCard = document.getElementById('dropzone-card');
  const fileInput = document.getElementById('landing-file-input');

  if (dropzoneCard && fileInput) {
    dropzoneCard.addEventListener('click', () => {
      clearDropzoneError();
      fileInput.click();
    });

    dropzoneCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clearDropzoneError();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (event) => {
      const files = event.target.files;
      if (files && files[0]) {
        processCandidateFile(files[0]);
      }
      event.target.value = '';
    });
  }

  window.addEventListener('dragover', handleGlobalDragOver);
  window.addEventListener('dragenter', handleGlobalDragEnter);
  window.addEventListener('dragleave', handleGlobalDragLeave);
  window.addEventListener('drop', handleGlobalDrop);
}
