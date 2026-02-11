FROM node:20-alpine AS builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm install

COPY frontend ./

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app/frontend

ENV NODE_ENV=production

COPY --from=builder /app/frontend/package.json /app/frontend/package-lock.json ./
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public

RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "start"]

