/**
 * Floating back-to-top button controller for Obelisk.
 * Manages scroll threshold detection, smooth viewport reset, and iconography.
 */

import { ARROW_UP_ICON_SVG } from '../icons.js';

//=============================================
// CONFIGURATION & INITIALIZATION
//=============================================

const SCROLL_THRESHOLD_PX = 300;

/**
 * Initializes scroll listeners and click handler for the floating back-to-top button.
 * @returns {void}
 */
export function initScrollTopButton() {
  const btnScrollTop = document.getElementById('btn-scroll-top');
  const appMain = document.querySelector('.app-main');
  const previewPane = document.getElementById('editor-preview-pane');
  if (!btnScrollTop) return;

  const iconSpan = btnScrollTop.querySelector('.scroll-top-icon');
  if (iconSpan) {
    iconSpan.innerHTML = ARROW_UP_ICON_SVG;
  }

  const updateVisibility = () => {
    let currentScroll = 0;

    if (previewPane && !previewPane.hasAttribute('hidden') && previewPane.offsetParent !== null) {
      currentScroll = previewPane.scrollTop;
    } else if (appMain) {
      currentScroll = appMain.scrollTop;
    }

    if (currentScroll > SCROLL_THRESHOLD_PX) {
      btnScrollTop.classList.add('is-visible');
    } else {
      btnScrollTop.classList.remove('is-visible');
    }
  };

  btnScrollTop.addEventListener('click', () => {
    if (previewPane && !previewPane.hasAttribute('hidden') && previewPane.offsetParent !== null) {
      previewPane.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (appMain) {
      appMain.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (appMain) {
    appMain.addEventListener('scroll', updateVisibility, { passive: true });
  }

  if (previewPane) {
    previewPane.addEventListener('scroll', updateVisibility, { passive: true });
  }

  window.addEventListener('scroll', updateVisibility, { passive: true });
}
