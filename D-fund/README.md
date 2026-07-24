# D-Fund (SouthConnect)

Plateforme connectant les entrepreneurs africains à leurs ressources : talents, outils, mentors, accompagnements et investisseurs.

**Production** : [southconnect.io](https://southconnect.io) (Vercel) · API [api.southconnect.io](https://api.southconnect.io) (Railway)

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript, Socket.IO (temps réel messagerie) |
| Base de données | PostgreSQL (Supabase, pooler AWS eu-north-1), Prisma ORM |
| Cache / sessions / queues | Redis (Railway), BullMQ |
| Auth | JWT (cookies HttpOnly) + Google OAuth (Passport) |
| Email | Resend |
| Monitoring | Sentry |

## Architecture

```
D-fund/
├── backend/     # API NestJS — 25 modules métier (auth, opportunities, applications,
│                #   messages, notifications, social, referral, ratings, search, ai, ...)
├── frontend/    # Next.js 14 App Router — 41 pages
├── prisma/      # Schéma partagé (22 modèles) + migrations
├── docs/        # Documentation projet (onboarding, phases produit, audits, rapports)
└── scripts/     # Scripts utilitaires
```

### Points d'architecture notables

- **Verrous distribués Redis** (`SET NX EX`) sur les cron jobs pour éviter la double exécution en cas de scaling multi-instance.
- **Socket.IO + adapter Redis** : les messages temps réel traversent toutes les instances du backend via pub/sub Redis, pas seulement le process qui a reçu la connexion WebSocket.
- **Soft-delete + audit trail** : suppressions RGPD (`deletedAt`) et journal des actions admin (`AdminAuditLog`) plutôt que des `DELETE` définitifs.
- **Tokens sensibles hachés** (SHA-256) en base — reset password, vérification email, désabonnement — pour qu'un dump DB ne donne pas accès à des liens actifs.
- **Compteurs dénormalisés** (vues, likes, candidatures) recalculés par cron avec verrou distribué, pour éviter les agrégations coûteuses à chaque lecture.

Détails complets dans [`docs/`](./docs), notamment [`PHASE3_ARCHITECTURE_FONCTIONNELLE.md`](./docs/PHASE3_ARCHITECTURE_FONCTIONNELLE.md) et [`PHASE5_SECURITE_PERMISSIONS.md`](./docs/PHASE5_SECURITE_PERMISSIONS.md).

## Sécurité

- Rate limiting différencié par route sensible (`@Throttle`), CSP + headers Helmet, cookies JWT HttpOnly/SameSite.
- RGPD : opt-out email, suppression de compte anonymisée (art. 17), désabonnement en un clic.
- IDOR, XSS stocké, races sur soumission de candidature et bypass de modération identifiés et corrigés lors des audits successifs (voir `docs/PHASE5_SECURITE_PERMISSIONS.md`).
- Scan de secrets (gitleaks) sur chaque push/PR ; `.env` jamais commité.

## CI/CD

Pipeline GitHub Actions (`.github/workflows/ci.yml`) sur chaque push/PR vers `main`/`develop` :
- **Backend** : type-check strict (`tsc --noEmit`, `noImplicitAny`), lint (ESLint + Prettier), tests unitaires + e2e (Jest), sur Node 20 et 22.
- **Frontend** : type-check, build Next.js, smoke tests Playwright.
- Build Docker de l'image de prod.

## Prérequis

- Node.js 18+
- npm
- Compte Supabase (PostgreSQL managé)
- Redis (local : `brew install redis` / `docker run redis`)

## Installation locale

### 1. Variables d'environnement

Copier les fichiers d'exemple et remplir les valeurs :

```bash
cp .env.example .env                       # backend (racine du monorepo)
cp frontend/.env.example frontend/.env.local
```

Voir [`.env.example`](./.env.example) pour la liste complète des variables (DB, JWT, Redis, OAuth, email, Sentry...).

### 2. Dépendances

```bash
npm run install:all
# ou séparément :
cd backend && npm install
cd ../frontend && npm install
```

### 3. Base de données

```bash
npm run db:generate
cd backend && npx prisma migrate dev
```

## Développement

```bash
npm run backend:dev    # http://localhost:3001
npm run frontend:dev   # http://localhost:3000
```

Documentation Swagger disponible sur `http://localhost:3001/api/docs` (désactivée en production).

## Tests

```bash
cd backend
npm run lint:check     # ESLint
npx tsc --noEmit       # type-check
npm test               # unit + e2e (Jest)
npm run test:cov       # avec couverture
```

## Documentation

- [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) — guide d'installation complet pour un nouveau collaborateur
- [`docs/GUIDE_DEMO.md`](./docs/GUIDE_DEMO.md) — parcours de démonstration de la plateforme
- [`docs/RAPPORT_DEPLOIEMENT_PRODUCTION.md`](./docs/RAPPORT_DEPLOIEMENT_PRODUCTION.md) — état du déploiement production
- [`docs/`](./docs) — cadrage produit, modélisation de données, architecture fonctionnelle, sécurité/permissions, notifications, standards de process (phases 1 à 9)

## Licence

Projet privé.
