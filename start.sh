#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
if [ "${NODE_ENV:-development}" = test ] && [ -n "${RUNTIME_PROJECT_SOURCE:-}" ] && [ -d "$RUNTIME_PROJECT_SOURCE" ]; then ROOT_DIR=$RUNTIME_PROJECT_SOURCE; fi
cd "$ROOT_DIR"
mode="${1:-check}"
require_env() { eval "value=\${$1:-}"; [ -n "$value" ] || { echo "$1 is required" >&2; exit 1; }; }
check_config() {
  if [ "${NODE_ENV:-development}" = test ]; then DEFAULT_TENANT_ID=${TENANT_ID:-};CORS_ORIGIN="http://127.0.0.1:${FRONTEND_PORT:-}";export DEFAULT_TENANT_ID CORS_ORIGIN;fi
  require_env DATABASE_URL; require_env JWT_SECRET; require_env DEFAULT_TENANT_ID
  case "${BACKEND_PORT:-}" in ''|*[!0-9]*) echo 'BACKEND_PORT must be an explicit integer' >&2;exit 1;;esac
  [ "$BACKEND_PORT" -ge 1024 ] && [ "$BACKEND_PORT" -le 65535 ] || { echo 'BACKEND_PORT must be between 1024 and 65535' >&2;exit 1; }
  [ "${#JWT_SECRET}" -ge 32 ] || { echo 'JWT_SECRET must contain at least 32 characters' >&2; exit 1; }
  case "$DATABASE_URL" in postgresql://*|postgres://*) ;; *) echo 'DATABASE_URL must be PostgreSQL' >&2; exit 1;; esac
  if [ "${NODE_ENV:-development}" = production ]; then require_env CORS_ORIGIN; require_env PROVIDER_WEBHOOK_SECRETS_JSON; [ "${ENABLE_GENERATED_FEATURES:-false}" = false ] || { echo 'Generated features are disabled in production' >&2; exit 1; }; fi
}
case "$mode" in
  check) (cd backend && npm run check); (cd frontend && npm run build) ;;
  migrate) check_config; [ "${ALLOW_SCHEMA_MIGRATION:-}" = 1 ] || { echo 'Set ALLOW_SCHEMA_MIGRATION=1' >&2; exit 1; }; for migration in backend/db/migrations/[0-9]*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"; done ;;
  start) check_config;lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1&&{ echo "assigned port $BACKEND_PORT is occupied" >&2;exit 1; };if [ "${BOOTSTRAP_ACKNOWLEDGEMENT:-}" = create-initial-admin ];then (cd backend && npm run create-admin);fi;PORT=$BACKEND_PORT BACKEND_HOST=127.0.0.1;export PORT BACKEND_HOST;(cd backend && exec npm start) ;;
  worker) check_config; require_env PROVIDER_ENDPOINTS_JSON; require_env PROVIDER_TOKENS_JSON; (cd backend && npm run worker) ;;
  *) echo 'usage: ./start.sh check|migrate|start|worker' >&2; exit 2 ;;
esac
