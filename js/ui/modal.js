/**
 * Reusable modal and confirmation dialog system for Obelisk.
 * Manages modal lifecycle, accessibility, and keyboard event bindings.
 */

//=============================================
// MODAL DIALOGS
//=============================================

/**
 * Prompts user with a custom dark-themed confirmation modal dialog.
 * @param {object} options - Modal options.
 * @param {string} [options.title='Discard unsaved changes?'] - Dialog heading.
 * @param {string} [options.message='You have unsaved changes. Discard them and continue?'] - Descriptive message body.
 * @param {string} [options.confirmLabel='Discard Changes'] - Action button text.
 * @param {string} [options.cancelLabel='Keep Editing'] - Secondary button text.
 * @param {'danger' | 'primary'} [options.type='danger'] - Visual style for action button.
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled.
 */
export function showConfirmModal({
  title = 'Discard unsaved changes?',
  message = 'You have unsaved changes. Discard them and continue?',
  confirmLabel = 'Discard Changes',
  cancelLabel = 'Keep Editing',
  type = 'danger'
} = {}) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('app-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'app-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const confirmClass = type === 'danger' ? 'modal-btn-danger' : 'modal-btn-primary';

    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-message">
        <div class="modal-header">
          <h3 id="modal-title" class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
          <p id="modal-message" class="modal-message">${message}</p>
        </div>
        <div class="modal-actions">
          <button type="button" id="modal-btn-cancel" class="modal-btn modal-btn-cancel">${cancelLabel}</button>
          <button type="button" id="modal-btn-confirm" class="modal-btn ${confirmClass}">${confirmLabel}</button>
        </div>
      </div>
    `;

    const cancelBtn = overlay.querySelector('#modal-btn-cancel');
    const confirmBtn = overlay.querySelector('#modal-btn-confirm');

    const cleanup = (result) => {
      window.removeEventListener('keydown', handleKeydown);
      overlay.classList.remove('is-open');
      setTimeout(() => {
        overlay.innerHTML = '';
        resolve(result);
      }, 150);
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cleanup(false);
      }
    };

    cancelBtn.addEventListener('click', () => cleanup(false));
    confirmBtn.addEventListener('click', () => cleanup(true));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });

    window.addEventListener('keydown', handleKeydown);

    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      cancelBtn.focus();
    });
  });
}

/**
 * Displays a custom dark-themed alert message dialog with a single acknowledgment button.
 * @param {object} options - Alert options.
 * @param {string} [options.title='Notice'] - Dialog heading.
 * @param {string} options.message - Descriptive message body.
 * @param {string} [options.buttonLabel='OK'] - Acknowledgment button text.
 * @returns {Promise<void>} Resolves when the dialog is dismissed.
 */
export function showAlertModal({
  title = 'Notice',
  message = '',
  buttonLabel = 'OK'
} = {}) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('app-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'app-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-message">
        <div class="modal-header">
          <h3 id="modal-title" class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
          <p id="modal-message" class="modal-message">${message}</p>
        </div>
        <div class="modal-actions">
          <button type="button" id="modal-btn-ok" class="modal-btn modal-btn-primary">${buttonLabel}</button>
        </div>
      </div>
    `;

    const okBtn = overlay.querySelector('#modal-btn-ok');

    const cleanup = () => {
      window.removeEventListener('keydown', handleKeydown);
      overlay.classList.remove('is-open');
      setTimeout(() => {
        overlay.innerHTML = '';
        resolve();
      }, 150);
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        cleanup();
      }
    };

    okBtn.addEventListener('click', cleanup);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
      }
    });

    window.addEventListener('keydown', handleKeydown);

    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      okBtn.focus();
    });
  });
}
