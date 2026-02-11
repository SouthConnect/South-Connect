FROM node:20-alpine AS builder

WORKDIR /app

# Copie des fichiers de configuration
COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/

# Installation des dépendances à la racine (scripts / prisma) et pour le backend
RUN npm install && cd backend && npm install

# Copie du code source monorepo (backend + prisma)
COPY backend ./backend
COPY prisma ./prisma

WORKDIR /app/backend

# Build du backend NestJS
RUN npm run build

# Image de production minimale
FROM node:20-alpine AS production

WORKDIR /app/backend

# Copie uniquement du nécessaire pour exécuter le backend
COPY --from=builder /app/backend/package.json /app/backend/package-lock.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/prisma ../prisma

RUN npm install --omit=dev

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/main.js"]

