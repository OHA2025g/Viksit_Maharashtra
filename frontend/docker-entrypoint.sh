#!/bin/sh
set -eu

# Public backend origin for the browser (no trailing slash, no /api suffix)
BACKEND_URL="${REACT_APP_BACKEND_URL:-${BACKEND_URL:-}}"
# Internal upstream for nginx /api proxy (e.g. http://maharashtra_ai_viksitmaharashtra_backend:8001)
API_UPSTREAM="${API_UPSTREAM:-}"

escape_json() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

BACKEND_ESCAPED=$(escape_json "$BACKEND_URL")

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  BACKEND_URL: "${BACKEND_ESCAPED}"
};
EOF

SNIPPET=/etc/nginx/snippets/api-proxy.conf

if [ -n "$API_UPSTREAM" ]; then
  UPSTREAM_HOST=$(printf '%s' "$API_UPSTREAM" | sed -e 's#^https\?://##' -e 's#/$##')
  cat > "$SNIPPET" <<NGX
location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
    proxy_pass http://${UPSTREAM_HOST}/api/;
}
NGX
  echo "nginx: proxying /api/ -> http://${UPSTREAM_HOST}/api/" >&2
elif [ -n "$BACKEND_URL" ]; then
  printf '%s\n' '# Browser calls BACKEND_URL directly (no nginx /api proxy)' > "$SNIPPET"
  echo "nginx: BACKEND_URL=${BACKEND_URL} (set API_UPSTREAM for same-origin /api proxy)" >&2
else
  printf '%s\n' '# No /api proxy — set API_UPSTREAM or BACKEND_URL on the frontend service' > "$SNIPPET"
  echo "WARN: Set API_UPSTREAM (internal) or BACKEND_URL (public) on the frontend service" >&2
fi

exec nginx -g "daemon off;"
