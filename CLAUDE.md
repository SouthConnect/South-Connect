# Instructions pour Claude Code — Projet D-Fund / SouthConnect

## Fichiers d'infrastructure protégés — NE JAMAIS SUPPRIMER sans accord explicite

Ces fichiers ont un rôle critique en production. Leur suppression peut provoquer une panne immédiate.
Avant tout `git rm` ou suppression : expliquer pourquoi, attendre la confirmation de l'utilisateur.

| Fichier | Rôle |
|---------|------|
| `D-fund/frontend/vercel.json` | Verrouille le pipeline de build Vercel pour le monorepo |
| `D-fund/railway.toml` | Configuration du déploiement Railway (backend) |
| `D-fund/frontend/next.config.js` | Config Next.js + Sentry + CSP headers |
| `D-fund/frontend/middleware.ts` | Protection des routes côté Edge (Vercel) |
| `D-fund/prisma/schema.prisma` | Schéma de base de données Prisma |
| `D-fund/backend/src/main.ts` | Bootstrap NestJS — session, CORS, Redis |
| `.git/hooks/pre-push` | Hook de sécurité pre-push |
| `D-fund/scripts/check-secrets.ts` | Script de vérification des secrets |

## Règles générales

- Ne jamais qualifier un fichier de config de "stale" ou "inutile" sans lire son contenu ET comprendre son impact en production.
- Toute suppression de fichier de configuration d'infrastructure doit être proposée à l'utilisateur, pas décidée unilatéralement.
- Ne jamais utiliser `CREATE INDEX CONCURRENTLY` dans les migrations Prisma (interdit dans une transaction).
- Ne jamais pusher sans accord explicite de l'utilisateur.
- Répondre toujours en français.

## Stack technique

- **Frontend** : Next.js 14, Vercel (southconnect.io)
- **Backend** : NestJS, Railway (api.southconnect.io)
- **Base de données** : PostgreSQL via Supabase (pooler AWS eu-north-1)
- **Cache/Sessions** : Redis (Railway)
- **Auth** : JWT (HttpOnly cookies) + Google OAuth (Passport)
- **ORM** : Prisma, migrations dans `D-fund/prisma/migrations/`
