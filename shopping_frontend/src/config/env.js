/**
 * Environment and feature flag helpers.
 * CRA exposes env vars prefixed with REACT_APP_ at build time.
 */

// PUBLIC_INTERFACE
export function getFeatureFlags() {
  /** Parse REACT_APP_FEATURE_FLAGS which may be JSON or comma-separated tokens. */
  const raw = process.env.REACT_APP_FEATURE_FLAGS;
  if (!raw) return {};

  // JSON object
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {
    // ignore
  }

  // comma-separated tokens, e.g. "MOCK_API,EXPERIMENT_X"
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .reduce((acc, token) => {
      acc[token] = true;
      return acc;
    }, {});
}

// PUBLIC_INTERFACE
export function isMockApiEnabled() {
  /** Returns true when MOCK_API feature flag is enabled. */
  const flags = getFeatureFlags();
  return Boolean(flags.MOCK_API);
}

// PUBLIC_INTERFACE
export function getBackendBaseUrl() {
  /** Prefer REACT_APP_BACKEND_URL, fallback to REACT_APP_API_BASE, otherwise empty. */
  return process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE || '';
}
