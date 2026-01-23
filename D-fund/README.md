# D-Fund

Plateforme connectant les entrepreneurs africains à leurs ressources: talents, outils, mentors, accompagnements et investisseurs.

## 🏗️ Architecture

Le projet est structuré en **architecture monorepo séparée** :

```
D-fund/
├── backend/          # API NestJS (Node + TypeScript + Prisma)
├── frontend/         # Frontend Next.js 14 (App Router)
├── prisma/           # Schéma Prisma partagé
├── scripts/          # Scripts utilitaires (migration Glide)
├── docs/             # Documentation
└── .env              # Variables d'environnement backend
```

### Backend (`backend/`)
- **NestJS** - Framework Node.js avec TypeScript
- **Prisma** - ORM pour PostgreSQL
- **PostgreSQL** - Base de données (via Supabase)
- **JWT** - Authentification

### Frontend (`frontend/`)
- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS

### Infrastructure
- **Supabase** - PostgreSQL managé + Auth + Storage
- **Vercel** - Déploiement frontend (prévu)
- **Railway/Fly.io** - Déploiement backend (prévu)

## 📋 Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase (gratuit)

## 🚀 Installation

### 1. Configuration Supabase

Suivez le guide détaillé dans [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

Résumé rapide :
1. Créez un projet sur [supabase.com](https://supabase.com)
2. Récupérez la connection string PostgreSQL
3. Configurez les variables d'environnement

### 2. Variables d'environnement

**À la racine** : Créer `.env` (pour le backend) :
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**À la racine** : Créer `.env.local` (pour le frontend) :
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

### 3. Installation des dépendances

```bash
# Installer toutes les dépendances (backend + frontend)
npm run install:all

# OU séparément :
cd backend && npm install
cd ../frontend && npm install
```

### 4. Configuration Prisma

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer le schéma à la base
cd backend
npx prisma migrate deploy
# OU pour développement :
npx prisma migrate dev --name init
```

## 🏃 Développement

### Démarrer le backend

```bash
# Depuis la racine
npm run backend:dev

# OU depuis backend/
cd backend
npm run dev
```

Le backend sera accessible sur `http://localhost:3001`

### Démarrer le frontend

```bash
# Depuis la racine
npm run frontend:dev

# OU depuis frontend/
cd frontend
npm run dev
```

Le frontend sera accessible sur `http://localhost:3000`

## 📁 Structure du Projet

```
D-fund/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── modules/        # Modules métier
│   │   │   ├── auth/       # Authentification
│   │   │   ├── users/      # Gestion utilisateurs
│   │   │   ├── opportunities/
│   │   │   ├── applications/
│   │   │   └── ...
│   │   ├── common/         # Utilitaires partagés
│   │   └── main.ts         # Point d'entrée
│   ├── prisma/
│   │   └── schema.prisma   # Lien vers ../prisma/schema.prisma
│   └── package.json
│
├── frontend/                # Frontend Next.js
│   ├── app/                 # Pages et routes (App Router)
│   ├── components/          # Composants React
│   ├── lib/                 # Utilitaires
│   └── package.json
│
├── prisma/                  # Schéma Prisma principal
│   └── schema.prisma        # Modèle de données complet
│
├── scripts/                 # Scripts utilitaires
│   └── migrate.ts           # Migration Glide → Supabase
│
├── docs/                    # Documentation
│   └── ...
│
└── .env                     # Variables d'environnement backend
```

## 🗄️ Base de données

Le schéma Prisma définit les modèles suivants :

### Entités principales
- **User** - Utilisateurs de la plateforme
- **BtoCProfile** - Profils individuels (talents, entrepreneurs)
- **BtoBProfile** - Profils entreprises
- **Opportunity** - Opportunités (jobs, co-founder, events, etc.)
- **Application** - Candidatures avec workflow
- **Message** - Messages privés et publics
- **Task** - Tâches liées aux opportunités
- **Rating** - Système de notation
- **ReferralCode** - Système de parrainage

Voir [prisma/schema.prisma](./prisma/schema.prisma) pour le schéma complet.

## 🔐 Authentification

L'authentification utilise JWT :

- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion

Les tokens JWT sont utilisés pour protéger les routes API.

## 📝 Commandes Utiles

### À la racine

```bash
# Installation
npm run install:all

# Backend
npm run backend:dev
npm run backend:build

# Frontend
npm run frontend:dev
npm run frontend:build

# Prisma
npm run db:generate
npm run db:studio
npm run db:migrate:glide
```

### Backend

```bash
cd backend

# Développement
npm run dev

# Build
npm run build

# Production
npm run start:prod

# Prisma
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

### Frontend

```bash
cd frontend

# Développement
npm run dev

# Build
npm run build

# Production
npm start
```

## 📚 Documentation

- [Architecture](./ARCHITECTURE.md) - Détails de l'architecture
- [Configuration Supabase](./SUPABASE_SETUP.md) - Guide de setup Supabase
- [Structure des variables d'environnement](./STRUCTURE_ENV.md) - Guide des .env
- [Environnement de travail](./docs/ENVIRONNEMENT_DE_TRAVAIL.md) - Guide de développement
- [Documentation complète](./docs/) - Toutes les phases de validation

## 🎯 Fonctionnalités

### Implémenté
- ✅ Architecture backend NestJS
- ✅ Schéma Prisma complet basé sur les données Glide
- ✅ Authentification JWT de base
- ✅ Structure frontend Next.js
- ✅ Migration des données Glide vers Supabase

### En cours / À venir
- [ ] Modules backend complets (opportunities, applications, messages)
- [ ] Intégration frontend avec le backend
- [ ] Dashboard utilisateur
- [ ] Système de recherche et filtres
- [ ] Notifications (Resend)
- [ ] Upload de fichiers (Supabase Storage)
- [ ] Real-time (Supabase Realtime)

## 📄 Licence

Ce projet est privé.

## 🤝 Contribution

Pour toute question ou suggestion, contactez l'équipe D-Fund.
