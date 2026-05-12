FROM node:22-alpine3.21 AS builder

WORKDIR /app

# Copie des fichiers de configuration
COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/

# npm ci garantit une installation reproductible (lock file strict)
RUN npm ci && cd backend && npm ci

# Copie du code source monorepo (backend + prisma)
COPY backend ./backend
COPY prisma ./prisma

WORKDIR /app/backend

# Generate Prisma client (required before build)
RUN npx prisma generate --schema=../prisma/schema.prisma

# Build du backend NestJS
RUN npm run build

# Image de production minimale
FROM node:22-alpine3.21 AS production

# Create non-root user to avoid running as root in production
RUN addgroup -S dfund && adduser -S dfund -G dfund

WORKDIR /app/backend

# Copie uniquement du nécessaire pour exécuter le backend
COPY --from=builder /app/backend/package.json /app/backend/package-lock.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/prisma ../prisma
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma

RUN npm ci --omit=dev

# Hand off ownership to the unprivileged user before switching
RUN chown -R dfund:dfund /app

USER dfund

ENV NODE_ENV=production

EXPOSE 3001

# Entrypoint: apply pending Prisma migrations then start the server.
# Using migrate deploy (not dev) — safe for production, no interactive prompts.
COPY --chown=dfund:dfund docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]

