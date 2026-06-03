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

# Same-origin /api proxy when BACKEND_URL is unset but upstream is known
if [ -n "$API_UPSTREAM" ] && [ -z "$BACKEND_URL" ]; then
  UPSTREAM_HOST=$(printf '%s' "$API_UPSTREAM" | sed -e 's#^https\?://##' -e 's#/$##')
  cat > /etc/nginx/conf.d/api-proxy.conf <<NGX
location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://${UPSTREAM_HOST}/api/;
}
NGX
fi

if [ -z "$BACKEND_URL" ] && [ -z "$API_UPSTREAM" ]; then
  echo "WARN: BACKEND_URL not set — app uses same-origin /api; configure Easypanel routing or set BACKEND_URL" >&2
fi

exec nginx -g "daemon off;"
