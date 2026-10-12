/**
 * Loading veil controller module for Obelisk.
 * Manages full-viewport overlay during heavy document compilation and frame settling.
 */

//=============================================
// STATE & HELPERS
//=============================================

let activeVeilTimer = null;

/**
 * Locks or unlocks all interactive header controls while loading overlay is visible.
 * Prevents clicking Edit, Close, Save, or switching tabs during active compilation.
 * @param {boolean} locked - True to disable buttons, false to restore interactivity.
 * @returns {void}
 */
function setHeaderControlsLocked(locked) {
  const actionButtons = document.querySelectorAll(
    '#btn-download-doc, #btn-edit-doc, #btn-close-edit, #btn-save-edit, #tab-edit, #tab-preview'
  );

  actionButtons.forEach((btn) => {
    if (locked) {
      if (!btn.hasAttribute('data-veil-was-disabled')) {
        btn.setAttribute('data-veil-was-disabled', btn.disabled ? 'true' : 'false');
      }
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
    } else {
      const wasDisabled = btn.getAttribute('data-veil-was-disabled') === 'true';
      btn.removeAttribute('data-veil-was-disabled');
      btn.disabled = wasDisabled;
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
    }
  });

  const brandLink = document.getElementById('brand-link');
  if (brandLink) {
    brandLink.style.pointerEvents = locked ? 'none' : '';
  }
}

/**
 * Waits for the browser graphics engine to complete layout reflow and rasterization.
 * Uses a double requestAnimationFrame cycle with a safety timeout guarantee.
 * @param {number} [timeoutMs=120] - Maximum milliseconds to wait before resolving.
 * @returns {Promise<void>}
 */
export function waitForNextPaint(timeoutMs = 120) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    const safetyTimer = setTimeout(finish, timeoutMs);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clearTimeout(safetyTimer);
        finish();
      });
    });
  });
}

//=============================================
// OVERLAY LIFECYCLE
//=============================================

/**
 * Shows the full-viewport loading veil overlay with a custom title.
 * Automatically locks header buttons to prevent interaction during compilation.
 * @param {string} [title='Loading document...'] - Status text displayed next to spinner.
 * @returns {void}
 */
export function showLoadingVeil(title = 'Loading document...') {
  const veil = document.getElementById('loading-veil');
  const titleEl = document.getElementById('loading-veil-title');
  if (!veil) return;

  setHeaderControlsLocked(true);

  if (activeVeilTimer) {
    clearTimeout(activeVeilTimer);
    activeVeilTimer = null;
  }

  if (titleEl) {
    titleEl.textContent = title;
  }

  veil.removeAttribute('hidden');
  veil.classList.remove('is-fading');
}

/**
 * Hides the loading veil overlay with a smooth opacity fade-out transition.
 * Restores header button interactivity upon completion.
 * @returns {Promise<void>}
 */
export function hideLoadingVeil() {
  return new Promise((resolve) => {
    const veil = document.getElementById('loading-veil');
    if (!veil || veil.hasAttribute('hidden')) {
      setHeaderControlsLocked(false);
      resolve();
      return;
    }

    veil.classList.add('is-fading');

    if (activeVeilTimer) {
      clearTimeout(activeVeilTimer);
    }

    activeVeilTimer = setTimeout(() => {
      veil.setAttribute('hidden', '');
      veil.classList.remove('is-fading');
      activeVeilTimer = null;
      setHeaderControlsLocked(false);
      resolve();
    }, 150);
  });
}

/**
 * Dismisses the fullscreen initial app boot splash screen with a smooth fade-out.
 * @returns {Promise<void>}
 */
export function dismissAppSplash() {
  return new Promise((resolve) => {
    const splash = document.getElementById('app-splash');
    if (!splash || splash.hasAttribute('hidden')) {
      resolve();
      return;
    }

    splash.classList.add('is-dismissed');

    setTimeout(() => {
      splash.setAttribute('hidden', '');
      splash.classList.remove('is-dismissed');
      resolve();
    }, 200);
  });
}

