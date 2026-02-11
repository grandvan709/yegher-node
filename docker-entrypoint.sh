#!/bin/sh

echo "[Entrypoint] Starting Yegher Node entrypoint script..."

echo "[Entrypoint] TT Wrapper URL: ${TT_WRAPPER_URL:-http://127.0.0.1:61000}"
echo "[Entrypoint] Node port: ${NODE_PORT:-2222}"

echo "[Entrypoint] Executing command: $@"
exec "$@"
