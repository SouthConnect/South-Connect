FROM node:22-alpine3.21 AS builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend ./

RUN npm run build

FROM node:22-alpine3.21 AS production

WORKDIR /app/frontend

ENV NODE_ENV=production

# standalone output contains only the minimal server + deps — no full node_modules needed
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app/frontend
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
