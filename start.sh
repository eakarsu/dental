#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)";set -a;source "$project_dir/.env";set +a;mode="${1:-start}"
case "$mode" in check) exec npm --prefix "$project_dir" run typecheck;;migrate) exec npm --prefix "$project_dir" run db:deploy;;start);;*)echo 'usage: ./start.sh check|migrate|start' >&2;exit 2;;esac
: "${DATABASE_URL:?DATABASE_URL is required}";: "${AUTH_SECRET:?AUTH_SECRET is required}";: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}";: "${OPENROUTER_MODEL:?OPENROUTER_MODEL is required}";: "${OPENROUTER_BASE_URL:?OPENROUTER_BASE_URL is required}"
api_port="${BACKEND_PORT:?BACKEND_PORT is required}";ui_port="${FRONTEND_PORT:?FRONTEND_PORT is required}";[[ "$api_port" != "$ui_port" ]]||{ echo 'ports must differ' >&2;exit 1;};for port in "$api_port" "$ui_port";do ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1||{ echo "port $port is occupied" >&2;exit 1;};done
export AUTH_URL="http://127.0.0.1:$api_port" NEXTAUTH_URL="http://127.0.0.1:$api_port" NEXT_PUBLIC_APP_URL="http://127.0.0.1:$ui_port" BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin
export PROVISION_ADMIN_EMAIL="${ADMIN_EMAIL:?ADMIN_EMAIL is required}" PROVISION_ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}" PROVISION_ADMIN_NAME="${PROVISION_ADMIN_NAME:-Runtime Administrator}"
if [[ "${MIGRATE_ON_START:-false}" == "true" ]];then npm --prefix "$project_dir" run db:deploy;fi;npm --prefix "$project_dir" run create-admin
cleanup(){ trap - INT TERM EXIT;[[ -z "${proxy_pid:-}" ]]||kill "$proxy_pid" 2>/dev/null||true;[[ -z "${api_pid:-}" ]]||kill "$api_pid" 2>/dev/null||true;[[ -z "${proxy_pid:-}" ]]||wait "$proxy_pid" 2>/dev/null||true;[[ -z "${api_pid:-}" ]]||wait "$api_pid" 2>/dev/null||true;};trap cleanup INT TERM EXIT
NODE_ENV=development npm --prefix "$project_dir" run dev -- --hostname 127.0.0.1 --port "$api_port" & api_pid=$!;for ((attempt=0;attempt<180;attempt++));do curl -sS -o /dev/null "http://127.0.0.1:$api_port/api/auth/me" 2>/dev/null&&break;ps -p "$api_pid" >/dev/null||{ wait "$api_pid";exit $?;};sleep 0.5;done;curl -sS -o /dev/null "http://127.0.0.1:$api_port/api/auth/me"
RUNTIME_PROXY_PORT="$ui_port" RUNTIME_PROXY_TARGET_PORT="$api_port" node "$project_dir/_runtime-proxy.mjs" & proxy_pid=$!;wait "$api_pid" "$proxy_pid"
