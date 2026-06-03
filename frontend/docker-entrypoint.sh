#!/bin/sh
set -eu

# EasyPanel / Docker runtime — REACT_APP_BACKEND_URL or BACKEND_URL
BACKEND_URL="${REACT_APP_BACKEND_URL:-${BACKEND_URL:-}}"

# Escape for JSON string (minimal: backslash and double-quote)
escape_json() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

BACKEND_ESCAPED=$(escape_json "$BACKEND_URL")

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  BACKEND_URL: "${BACKEND_ESCAPED}"
};
EOF

exec nginx -g "daemon off;"
