# D-Fund Frontend

Frontend Next.js 14 pour la plateforme D-Fund.

## Structure

```
frontend/
├── app/              # Pages Next.js (App Router)
├── components/       # Composants React réutilisables
├── lib/              # Utilitaires (API, helpers)
└── package.json      # Dépendances frontend
```

## Installation

```bash
cd frontend
npm install
```

## Configuration

Créer `.env.local` à la racine du projet (pas dans frontend/) :

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

## Développement

```bash
npm run dev
```

Le frontend sera accessible sur http://localhost:3000

## Build

```bash
npm run build
npm start
```
