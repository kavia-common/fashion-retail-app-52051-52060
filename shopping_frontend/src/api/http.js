import { getBackendBaseUrl } from '../config/env';

// PUBLIC_INTERFACE
export async function httpJson(path, options = {}) {
  /**
   * Simple JSON fetch wrapper.
   * @param {string} path - URL path like "/products" (will be joined to backend base).
   * @param {RequestInit} options - fetch options.
   * @returns {Promise<any>} parsed JSON
   */
  const base = getBackendBaseUrl();
  const url = base ? `${base.replace(/\/$/, '')}${path}` : path;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let body;
  if (isJson) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => '');
  }

  if (!res.ok) {
    const message =
      (body && body.message) ||
      (typeof body === 'string' && body) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}
