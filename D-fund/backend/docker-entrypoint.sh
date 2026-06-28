#!/bin/sh
set -e

# Le service 'migrate' du docker-compose gère les migrations avant ce container.
# En déploiement direct (Railway/Render sans compose), définir RUN_MIGRATIONS=true.
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy --schema=../prisma/schema.prisma
fi

exec node dist/src/main.js
