#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema=../prisma/schema.prisma

echo "[entrypoint] Starting application..."
exec node dist/src/main.js
