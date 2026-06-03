/**
 * Backend URL: set at container start (EasyPanel env) via /runtime-config.js,
 * or at dev/build time via REACT_APP_BACKEND_URL in .env
 */
export function getBackendUrl() {
  if (typeof window !== "undefined" && window.__RUNTIME_CONFIG__?.BACKEND_URL) {
    const url = window.__RUNTIME_CONFIG__.BACKEND_URL.trim();
    if (url) return url.replace(/\/$/, "");
  }
  const fromEnv = process.env.REACT_APP_BACKEND_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "";
}
