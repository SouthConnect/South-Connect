#!/bin/sh
set -e

echo "[entrypoint] Starting application..."
exec node dist/src/main.js
