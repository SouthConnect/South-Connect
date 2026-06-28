#!/bin/sh
set -e

echo "[entrypoint] Starting..."
echo "[entrypoint] NODE_ENV=$NODE_ENV"
echo "[entrypoint] PORT=$PORT"
echo "[entrypoint] Node: $(node --version)"
echo "[entrypoint] OS: $(uname -a)"

echo "[entrypoint] Checking dist/src/main.js..."
ls -la dist/src/main.js

echo "[entrypoint] Checking .prisma client..."
ls node_modules/.prisma/client/ | head -10

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[entrypoint] Running Prisma migrations..."
  npx prisma migrate deploy --schema=../prisma/schema.prisma
fi

echo "[entrypoint] Launching Node.js..."
exec node dist/src/main.js
