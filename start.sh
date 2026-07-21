#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "${NODE_ENV:-development}" == test && -n "${RUNTIME_PROJECT_SOURCE:-}" && -d "$RUNTIME_PROJECT_SOURCE" ]]; then
  project_root="$RUNTIME_PROJECT_SOURCE"
fi
cd "$project_root"
mode="${1:-production}"
case "$mode" in
  production|development|migrate) ;;
  *) echo "Usage: ./start.sh [production|development|migrate]" >&2; exit 64 ;;
esac

if [[ "${NODE_ENV:-development}" == test ]]; then
  AUTH_SECRET="${NEXTAUTH_SECRET:-}"
  REGULATED_DATA_KEY="${MEMORY_ENCRYPTION_KEY_BASE64:-}"
  AUTH_URL="http://127.0.0.1:${BACKEND_PORT:-}"
  NEXTAUTH_URL="$AUTH_URL"
  NEXT_PUBLIC_APP_URL="$AUTH_URL"
  export AUTH_SECRET REGULATED_DATA_KEY AUTH_URL NEXTAUTH_URL NEXT_PUBLIC_APP_URL
fi

for name in DATABASE_URL AUTH_SECRET REGULATED_DATA_KEY BACKEND_PORT; do
  if [[ -z "${!name:-}" ]]; then echo "$name is required; copy .env.example and use secret storage." >&2; exit 78; fi
done
if ! [[ "$BACKEND_PORT" =~ ^[0-9]+$ ]] || (( BACKEND_PORT < 1024 || BACKEND_PORT > 65535 )); then
  echo "BACKEND_PORT must be an explicit integer between 1024 and 65535" >&2; exit 78
fi
if [[ "${AUTH_SECRET}" == *change-me* || "${AUTH_SECRET}" == *replace* ]]; then
  echo "Refusing placeholder AUTH_SECRET." >&2; exit 78
fi

if [[ "$mode" == "migrate" ]]; then
  exec npm run db:deploy
fi
if lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Assigned port $BACKEND_PORT is occupied" >&2; exit 69
fi
if [[ "$mode" == "development" ]]; then
  exec npm run dev -- -H 127.0.0.1 -p "$BACKEND_PORT"
fi

if [[ "${NODE_ENV:-development}" == test ]]; then
  exec npm run dev -- -H 127.0.0.1 -p "$BACKEND_PORT"
fi

if [[ ! -d .next ]]; then echo "Production build missing; run npm ci && npm run build first." >&2; exit 66; fi
exec npm run start -- -H 127.0.0.1 -p "$BACKEND_PORT"
