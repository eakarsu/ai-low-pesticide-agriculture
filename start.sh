#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  . "$ROOT_DIR/.env"
  set +a
fi

mode="${1:-start}"
require_env() { eval "value=\${$1:-}"; [ -n "$value" ] || { echo "$1 is required" >&2; exit 1; }; }
check_config() {
  require_env DATABASE_URL
  require_env JWT_SECRET
  require_env DEFAULT_TENANT_ID
  require_env OPENROUTER_API_KEY
  require_env OPENROUTER_MODEL
  [ "${OPENROUTER_BASE_URL:-}" = 'https://openrouter.ai/api/v1' ] || { echo 'OPENROUTER_BASE_URL must be https://openrouter.ai/api/v1' >&2; exit 1; }
  case "${BACKEND_PORT:-}" in ''|*[!0-9]*) echo 'BACKEND_PORT must be an explicit integer' >&2; exit 1 ;; esac
  case "${FRONTEND_PORT:-}" in ''|*[!0-9]*) echo 'FRONTEND_PORT must be an explicit integer' >&2; exit 1 ;; esac
  [ "$BACKEND_PORT" -ge 1024 ] && [ "$BACKEND_PORT" -le 65535 ] || { echo 'BACKEND_PORT must be between 1024 and 65535' >&2; exit 1; }
  [ "$FRONTEND_PORT" -ge 1024 ] && [ "$FRONTEND_PORT" -le 65535 ] || { echo 'FRONTEND_PORT must be between 1024 and 65535' >&2; exit 1; }
  [ "$BACKEND_PORT" != "$FRONTEND_PORT" ] || { echo 'BACKEND_PORT and FRONTEND_PORT must be different' >&2; exit 1; }
  [ "${#JWT_SECRET}" -ge 32 ] || { echo 'JWT_SECRET must contain at least 32 characters' >&2; exit 1; }
  case "$DATABASE_URL" in postgresql://*|postgres://*) ;; *) echo 'DATABASE_URL must be PostgreSQL' >&2; exit 1 ;; esac
}

case "$mode" in
  check)
    check_config
    ;;
  migrate)
    check_config
    [ "${ALLOW_SCHEMA_MIGRATION:-}" = 1 ] || { echo 'Set ALLOW_SCHEMA_MIGRATION=1' >&2; exit 1; }
    for migration in backend/db/migrations/[0-9]*.sql; do
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
    done
    ;;
  start)
    check_config
    for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
      lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "assigned port $port is occupied" >&2; exit 1; }
    done
    [ -d "$ROOT_DIR/backend/node_modules" ] || { echo 'backend dependencies missing; install explicitly' >&2; exit 1; }
    [ -d "$ROOT_DIR/frontend/node_modules" ] || { echo 'frontend dependencies missing; install explicitly' >&2; exit 1; }
    echo "Starting AgriSense API on $BACKEND_PORT and UI on $FRONTEND_PORT; persistent state is unchanged."
    exec node "$ROOT_DIR/runtime-launcher.js"
    ;;
  worker)
    check_config
    require_env PROVIDER_ENDPOINTS_JSON
    require_env PROVIDER_TOKENS_JSON
    (cd backend && npm run worker)
    ;;
  *) echo 'usage: ./start.sh check|migrate|start|worker' >&2; exit 2 ;;
esac
