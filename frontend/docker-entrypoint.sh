#!/bin/sh
set -eu

# EasyPanel / Docker — public backend origin (no trailing slash, no /api)
BACKEND_URL="${REACT_APP_BACKEND_URL:-${BACKEND_URL:-}}"
# Optional: upstream for nginx /api proxy (e.g. http://viksitmaharashtra_backend:8001)
API_UPSTREAM="${API_UPSTREAM:-${BACKEND_URL:-}}"

escape_json() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

BACKEND_ESCAPED=$(escape_json "$BACKEND_URL")

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  BACKEND_URL: "${BACKEND_ESCAPED}"
};
EOF

# Same-origin /api proxy: API_UPSTREAM or BACKEND_URL (internal http URL)
PROXY_TARGET="${API_UPSTREAM:-}"
if [ -z "$PROXY_TARGET" ] && [ -n "$BACKEND_URL" ]; then
  case "$BACKEND_URL" in
    http://*|https://*) PROXY_TARGET="$BACKEND_URL" ;;
  esac
fi

if [ -n "$PROXY_TARGET" ]; then
  UPSTREAM_HOST=$(printf '%s' "$PROXY_TARGET" | sed -e 's#^https\?://##' -e 's#/$##')
  cat > /etc/nginx/conf.d/api-proxy.conf <<NGX
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
  # Browser uses same-origin /api; runtime BACKEND_URL stays empty
  if [ -z "$BACKEND_URL" ]; then
    cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  BACKEND_URL: ""
};
EOF
  fi
else
  printf '%s\n' '# No /api proxy — set BACKEND_URL (public backend URL) or API_UPSTREAM (internal host:port)' \
    > /etc/nginx/conf.d/api-proxy.conf
  if [ -z "$BACKEND_URL" ]; then
    echo "WARN: Set BACKEND_URL or API_UPSTREAM or Easypanel /api route — else API calls return HTML" >&2
  fi
fi

exec nginx -g "daemon off;"
