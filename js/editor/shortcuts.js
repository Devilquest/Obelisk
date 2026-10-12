/**
 * Keyboard shortcuts and text ergonomic handlers for Obelisk markdown editor.
 * Intercepts Ctrl+S for atomic saving and Tab for 2-space indentation.
 */

//=============================================
// SHORTCUT BINDINGS
//=============================================

/**
 * Handles Tab key indentation inside the editor textarea.
 * Inserts 2 spaces at the current cursor selection without losing focus.
 * @param {KeyboardEvent} event - Native keyboard event.
 * @param {HTMLTextAreaElement} textarea - Target editor textarea element.
 * @returns {void}
 */
export function handleTextareaTab(event, textarea) {
  if (event.key !== 'Tab') return;

  event.preventDefault();

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  const indentation = '  ';
  textarea.value = value.substring(0, start) + indentation + value.substring(end);
  textarea.selectionStart = start + indentation.length;
  textarea.selectionEnd = start + indentation.length;

  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Registers global keyboard shortcut listeners for the active editor session.
 * Listens for Ctrl+S / Meta+S to trigger persistence.
 * @param {Function} onSave - Callback invoked when save shortcut is detected.
 * @returns {Function} Cleanup function to unregister the listener.
 */
export function registerEditorShortcuts(onSave) {
  const handleKeydown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (typeof onSave === 'function') {
        onSave();
      }
    }
  };

  window.addEventListener('keydown', handleKeydown);

  return () => {
    window.removeEventListener('keydown', handleKeydown);
  };
}
