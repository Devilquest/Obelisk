/**
 * Hash router, URL state synchronizer, and in-document anchor navigator for Obelisk.
 * Manages in-document section anchor scrolling and URL hash synchronization.
 */

//=============================================
// URI UTILITIES
//=============================================

/**
 * Safely decodes a URI string, falling back to the raw string if decoding fails.
 * @param {string} str - Raw or encoded URI string.
 * @returns {string} Decoded string.
 */
export function safeDecodeURI(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

//=============================================
// HASH ROUTING
//=============================================

/**
 * Parses a window location hash into an in-document section anchor.
 * Ignores any legacy document file paths in the hash.
 * @param {string} rawHash - Raw hash string from window.location.hash.
 * @returns {{ anchor: string }} Parsed section anchor.
 */
export function parseHashRoute(rawHash) {
  const hash = (rawHash || '').replace(/^#/, '').trim();
  if (!hash || hash.includes('.md')) {
    return { anchor: '' };
  }
  return { anchor: safeDecodeURI(hash) };
}

/**
 * Synchronizes the browser address bar hash for in-document section anchors.
 * @param {string} [anchor=''] - In-document section anchor.
 * @param {boolean} [replace=false] - Whether to replace the history entry rather than pushing.
 * @returns {void}
 */
export function updateUrlHash(anchor = '', replace = false) {
  const targetHash = anchor ? `#${anchor}` : '';
  if (window.location.hash !== targetHash) {
    if (replace) {
      history.replaceState(null, '', targetHash || window.location.pathname + window.location.search);
    } else {
      history.pushState(null, '', targetHash || window.location.pathname + window.location.search);
    }
  }
}

//=============================================
// ANCHOR NAVIGATION
//=============================================

/**
 * Scrolls the document container to the specified heading or footnote anchor.
 * Automatically opens parent details elements if the target is collapsed.
 * @param {string} anchorId - Target slug or element identifier.
 * @param {boolean} [smooth=true] - Whether to use smooth scrolling.
 * @returns {boolean} True if target element was located and scrolled to.
 */
export function scrollToAnchor(anchorId, smooth = true) {
  const appMain = document.querySelector('.app-main');
  if (!anchorId) {
    if (appMain) {
      appMain.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    }
    return true;
  }

  const decodedId = safeDecodeURI(anchorId);
  let targetEl = document.getElementById(decodedId);
  if (!targetEl) {
    try {
      targetEl = document.querySelector(`[name="${CSS.escape(decodedId)}"]`);
    } catch {
      targetEl = null;
    }
  }

  if (targetEl) {
    const closedDetails = targetEl.closest('details:not([open])');
    if (closedDetails) {
      closedDetails.open = true;
    }
    targetEl.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'start'
    });
    return true;
  }

  return false;
}
