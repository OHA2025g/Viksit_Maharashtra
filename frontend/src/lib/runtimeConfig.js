/**
 * Backend origin (no trailing slash).
 * Production: EasyPanel sets BACKEND_URL / REACT_APP_BACKEND_URL → docker-entrypoint writes /runtime-config.js
 * Dev: REACT_APP_BACKEND_URL in .env
 * Fallback: same-origin (use /api paths; route /api to backend in Easypanel or nginx)
 */
export function getBackendUrl() {
  if (typeof window !== "undefined" && window.__RUNTIME_CONFIG__?.BACKEND_URL != null) {
    const url = String(window.__RUNTIME_CONFIG__.BACKEND_URL).trim();
    if (url && url !== "undefined") return url.replace(/\/$/, "");
  }
  const fromEnv = process.env.REACT_APP_BACKEND_URL;
  if (fromEnv && fromEnv !== "undefined") {
    return String(fromEnv).replace(/\/$/, "");
  }
  return "";
}

/** Axios / fetch base path — never "undefined/api". */
export function getApiBase() {
  const backend = getBackendUrl();
  if (backend) return `${backend}/api`;
  return "/api";
}

export function getWebSocketEventsUrl() {
  const backend = getBackendUrl();
  if (backend) {
    const wsOrigin = backend.replace(/^http/, "ws");
    return `${wsOrigin}/api/ws/events`;
  }
  if (typeof window !== "undefined" && window.location?.host) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/ws/events`;
  }
  return "/api/ws/events";
}
