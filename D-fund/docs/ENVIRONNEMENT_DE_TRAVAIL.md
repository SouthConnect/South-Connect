# Environnement de travail D-Fund

## Objectif

Définir **comment travailler proprement** sur D-Fund :
- comment lancer le **frontend** et le **backend**,
- comment configurer les **variables d'environnement**,
- comment gérer les **données** (Supabase, migration Glide, CSV),
- et ce qu'il **ne faut plus faire** (utiliser les CSV comme source).

---

## Structure du projet

À la racine :

```text
D-fund/
├── backend/            # API NestJS (Node + TypeScript + Prisma)
├── app/                # Frontend Next.js 14 (App Router)
├── prisma/             # Schéma Prisma principal + seed
├── data/
│   └── glide/
│       └── raw/        # TOUS les CSV Glide archivés (ignorés par Git)
└── docs/               # Documentation (phases, ERD, mapping, etc.)
```

- Les fichiers CSV Glide ont été **déplacés** dans `data/glide/raw/`.
- `data/glide/` est **ignoré par Git** (`.gitignore`) → pas de données brutes dans le repo.

---

## Variables d'environnement

### Backend (`backend/.env`)

Créer `backend/.env` à partir de `.env.example` :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="change-me-with-a-strong-secret"
PORT=3001
FRONTEND_URL="http://localhost:3000"

# (plus tard)
# RESEND_API_KEY="..."
```

> `DATABASE_URL` vient de **Supabase** (onglet Settings → Database).

### Frontend (`.env.local` à la racine)

Créer `.env.local` :

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

- Le frontend appellera le backend NestJS sur cette URL.
- Pas de secret dans le frontend (préfixe `NEXT_PUBLIC_` = exposé au navigateur).

---

## Lancer l'environnement de dev

### 1. Backend (NestJS)

```bash
cd backend

# Installer les dépendances (une seule fois)
npm install

# Générer le client Prisma si besoin
npm run prisma:generate

# Appliquer le schéma à la base (ATTENTION: utilise DATABASE_URL)
npm run prisma:deploy  # ou npm run prisma:migrate si défini

# Lancer le serveur NestJS
npm run start:dev
```

- Le backend tourne sur `http://localhost:3001`.
- Les routes principales V1 (non versionnées pour l’instant) :
  - `GET /profiles/lists/talents`
  - `GET /profiles/lists/companies`
  - `GET /opportunities`
  - `GET /opportunities/:id`
  - `GET /applications/opportunity/:opportunityId`
  - `GET /applications/user/:userId`

### 2. Frontend (Next.js)

```bash
cd /home/dan001/Téléchargements/D-fund

# Installer les dépendances
npm install

# Lancer le frontend
npm run dev
```

- Le frontend tourne sur `http://localhost:3000`.
- Il consomme le backend via `NEXT_PUBLIC_API_URL`.

---

## Gestion des données & CSV Glide

### Source de vérité

- **Avant** : les CSV Glide (`*.csv` à la racine) servaient de base.
- **Maintenant** :
  - La **source de vérité** est **la base Supabase/PostgreSQL**.
  - Les CSV sont uniquement une **archive de migration** dans `data/glide/raw/`.

### Où sont les CSV ?

- Tous les fichiers `*.csv` ont été déplacés dans :

```text
data/glide/raw/
```

- `data/glide/` est ignoré par Git → pas de fuite de données sensibles.

### Migration des données vers Supabase

1. Vérifier `DATABASE_URL` dans `backend/.env`.
2. Depuis la racine du projet :

```bash
npm run db:migrate:glide
```

Ce script (`scripts/migrate.ts`) :
- lit les CSV principaux (`Users(1).csv`, `Opportunities(1).csv`, `Applications(1).csv`) depuis `data/glide/raw/`,
- mappe vers les entités Prisma (`User`, `BtoCProfile`, `BtoBProfile`, `Opportunity`, `Application`),
- insère dans la DB via Prisma.

Après migration :
- tu peux **garder les CSV localement** pour archive,
- mais ils **ne doivent plus être utilisés pour le produit** (ni re-importés manuellement).

---

## Ce qui est "propre" vs "pas pro"

### OK (propre)

- Données de production stockées dans **Supabase**, pas dans des CSV.
- CSV archivés dans `data/glide/raw/`, **hors Git**.
- Config / mapping / ERD documentés dans `docs/`.
- Frontend qui parle **uniquement** à l'API NestJS (plus à Prisma directement).

### À éviter

- Laisser des CSV métier à la racine du repo.
- Modifier directement les données dans les CSV après migration.
- Appeler Prisma directement depuis le frontend.

---

## Workflow Dev standard

1. **Mettre à jour le schéma** dans `prisma/schema.prisma` (root).
2. **Déployer les changements** sur la DB Supabase via Prisma (depuis backend).
3. **Adapter le backend NestJS** (services + controllers) à ces changements.
4. **Adapter le frontend Next.js** pour consommer les nouveaux endpoints.
5. **Ne jamais** retoucher les CSV, sauf pour refaire une migration de test (en local uniquement).

---

## Références utiles

- `docs/PHASE2_MODELLISATION_DONNEES.md` : détails des entités et champs.
- `docs/MAPPING_CSV_SCHEMA.md` : mapping CSV Glide → schéma Prisma.
- `docs/PHASE7_MIGRATION_GLIDE.md` : stratégie de migration.
- `docs/ERD_DIAGRAM.json` : ERD complet au format JSON.
- `ARCHITECTURE.md` : architecture globale (frontend/backend/DB).

---

## Résumé opérationnel

1. **Configurer** Supabase + `backend/.env` + `.env.local`.
2. **Lancer** :
   - `npm run dev` (frontend, racine)
   - `cd backend && npm run start:dev` (backend)
3. **Migrer les données** une fois : `npm run db:migrate:glide`.
4. **Oublier les CSV** dans Git : ils sont archivés dans `data/glide/raw/`, ignorés.
5. Travailler **toujours** contre la DB Supabase via Prisma + NestJS.


