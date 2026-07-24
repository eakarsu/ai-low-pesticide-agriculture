#!/bin/sh
set -eu

# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
if [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
else
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD
fi
unset demo_credentials_email demo_credentials_password demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

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
