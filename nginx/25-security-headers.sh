#!/bin/sh
# Renders nginx/security-headers.conf.template into the running container.
#
# The CSP pins img-src and connect-src to the Supabase origin. Hardcoding that
# origin in the repo means any deployment pointing elsewhere has every API call
# and every image silently blocked by the browser, so it is derived here from
# the same variable the frontend build already requires.
#
# nginx:alpine runs every executable in /docker-entrypoint.d in name order
# before starting nginx.
set -eu

if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  echo "25-security-headers.sh: VITE_SUPABASE_URL is not set." >&2
  echo "  It is required to build the Content-Security-Policy. Refusing to" >&2
  echo "  start with a policy that would block every API call and image." >&2
  exit 1
fi

# Scheme + host + optional port only: a CSP source expression must carry no path.
SUPABASE_ORIGIN=$(printf '%s' "$VITE_SUPABASE_URL" | sed -E 's#^(https?://[^/]+).*#\1#')
export SUPABASE_ORIGIN

envsubst '${SUPABASE_ORIGIN}' \
  < /etc/nginx/security-headers.conf.template \
  > /etc/nginx/security-headers.conf

echo "25-security-headers.sh: CSP pinned to ${SUPABASE_ORIGIN}"
