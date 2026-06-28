FROM node:22-slim AS builder

RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY D-fund/package.json D-fund/package-lock.json ./
COPY D-fund/backend/package.json D-fund/backend/package-lock.json ./backend/

RUN npm ci && cd backend && npm ci

COPY D-fund/backend ./backend
COPY D-fund/prisma ./prisma

WORKDIR /app/backend

RUN npx prisma generate --schema=../prisma/schema.prisma

RUN npm run build

# ── Production image ───────────────────────────────────────────────────────────
FROM node:22-slim AS production

RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y wget && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -r dfund && useradd -r -g dfund dfund

WORKDIR /app/backend

COPY --from=builder /app/backend/package.json /app/backend/package-lock.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/prisma ../prisma
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma

COPY --chown=dfund:dfund D-fund/backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN chown -R dfund:dfund /app

USER dfund

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/v1/health/live || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
