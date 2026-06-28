FROM node:22-alpine AS builder

# Mettre à jour les packages système pour éliminer les CVE connus
RUN apk upgrade --no-cache

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/

RUN npm ci && cd backend && npm ci

COPY backend ./backend
COPY prisma ./prisma

WORKDIR /app/backend

RUN npx prisma generate --schema=../prisma/schema.prisma

RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk upgrade --no-cache && \
    apk add --no-cache wget

RUN addgroup -S dfund && adduser -S dfund -G dfund

WORKDIR /app/backend

COPY --from=builder /app/backend/package.json /app/backend/package-lock.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/prisma ../prisma
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma

RUN npm ci --omit=dev

COPY --chown=dfund:dfund backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN chown -R dfund:dfund /app

USER dfund

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/v1/health/live || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
