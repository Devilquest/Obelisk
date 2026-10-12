/**
 * Asynchronous document loader module.
 * Responsible strictly for static file retrieval over HTTP without manipulating DOM.
 */

//=============================================
// IN-MEMORY DOCUMENT STORE
//=============================================

const documentStore = new Map();

/**
 * Stores or updates raw markdown content in the in-memory document store.
 * @param {string} docPath - Relative or display path of the document.
 * @param {string} content - Raw markdown text content.
 * @returns {void}
 */
export function setDocumentInMemory(docPath, content) {
  if (docPath && typeof content === 'string') {
    documentStore.set(docPath, content);
  }
}

//=============================================
// DOCUMENT FETCHER
//=============================================

/**
 * Fetches the raw text content of a Markdown file from the specified URL path.
 * Checks in-memory store before making a network request.
 * @param {string} docPath - Relative or absolute path to the markdown file.
 * @returns {Promise<string>} The raw text content of the document.
 * @throws {Error} If the HTTP response fails or network errors occur.
 */
export async function fetchDocument(docPath) {
  if (!docPath || typeof docPath !== 'string') {
    throw new Error('Invalid document path provided to loader.');
  }

  if (documentStore.has(docPath)) {
    return documentStore.get(docPath);
  }

  const response = await fetch(docPath, {
    method: 'GET',
    headers: {
      'Accept': 'text/plain, text/markdown, */*'
    },
    cache: 'no-cache'
  });

  if (!response.ok) {
    throw new Error(`Failed to load document (${response.status} ${response.statusText}): ${docPath}`);
  }

  const text = await response.text();
  documentStore.set(docPath, text);
  return text;
}

//=============================================
// DOCUMENT EXPORTER
//=============================================

/**
 * Triggers a client-side file download of the markdown text content.
 * @param {string} fileName - Destination filename (e.g. 'document.md').
 * @param {string} content - Raw markdown text content.
 * @returns {void}
 */
export function downloadDocument(fileName, content) {
  if (typeof content !== 'string') return;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = fileName || 'document.md';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

