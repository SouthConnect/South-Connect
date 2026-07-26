# Guide d'installation — Nouveau collaborateur (Mac + VS Code)

> Temps estimé : 30–45 min la première fois.

---

## 1. Prérequis système

Installe ces outils dans l'ordre.

### Homebrew (gestionnaire de paquets Mac)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Node.js 22
```bash
brew install node@22
# Vérification
node -v   # doit afficher v22.x.x
npm -v
```

### Git
```bash
brew install git
git --version
```

### Redis (cache local)
```bash
brew install redis
brew services start redis
# Vérification
redis-cli ping   # doit répondre PONG
```

---

## 2. VS Code — Extensions recommandées

Ouvre VS Code et installe ces extensions (Cmd+Shift+X) :

| Extension | ID | Utilité |
|---|---|---|
| ESLint | `dbaeumer.vscode-eslint` | Lint TypeScript |
| Prettier | `esbenp.prettier-vscode` | Formatage auto |
| Prisma | `Prisma.prisma` | Syntaxe schéma Prisma |
| Tailwind CSS IntelliSense | `bradlc.tailwindcss` | Autocomplétion classes |
| DotENV | `mikestead.dotenv` | Coloration .env |
| Thunder Client | `rangav.vscode-thunder-client` | Tester l'API sans Postman |
| GitLens | `eamodio.gitlens` | Historique git inline |

Le projet inclut déjà un `.vscode/settings.json` qui configure le formatage automatiquement à l'enregistrement.

---

## 3. Cloner le dépôt

```bash
git clone git@github.com:scorpion00100/D-fund.git
cd D-fund/D-fund
```

> Si tu n'as pas encore de clé SSH configurée :
> ```bash
> ssh-keygen -t ed25519 -C "ton@email.com"
> cat ~/.ssh/id_ed25519.pub   # copie cette clé dans GitHub > Settings > SSH Keys
> ```

---

## 4. Variables d'environnement

**Demande à un membre de l'équipe** les fichiers `.env` et `.env.local` — ils contiennent des secrets qui ne sont pas dans git.

En attendant, crée-les depuis les templates :

```bash
# Backend
cp backend/.env.example .env

# Frontend
cp frontend/.env.example frontend/.env.local
```

### Ce qu'il faut renseigner dans `.env` (backend, à la racine)

| Variable | Où l'obtenir |
|---|---|
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection string (Transaction mode) |
| `DIRECT_URL` | Supabase Dashboard → Settings → Database → Connection string (Session mode) |
| `JWT_SECRET` | `openssl rand -hex 32` dans le terminal |
| `REFRESH_TOKEN_SECRET` | `openssl rand -hex 32` (différent du JWT_SECRET) |
| `REDIS_URL` | `redis://localhost:6379` (Redis local installé à l'étape 1) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM_EMAIL` | L'adresse email configurée dans Resend |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) (optionnel — désactive l'IA si absent) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console (optionnel — désactive le login Google si absent) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console (optionnel) |
| `FRONTEND_URL` | `http://localhost:3000` |
| `BACKEND_URL` | `http://localhost:3001` |
| `PORT` | `3001` |

### Ce qu'il faut renseigner dans `frontend/.env.local`

| Variable | Valeur en dev local |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` |

---

## 5. Installation des dépendances

Depuis la racine `D-fund/D-fund/` :

```bash
npm run install:all
```

Cette commande installe les dépendances du backend **et** du frontend en une fois.

---

## 6. Générer le client Prisma

```bash
npm run db:generate
```

> Cette commande lit le schéma `prisma/schema.prisma` et génère les types TypeScript.
> À relancer à chaque modification du schéma.

---

## 7. Lancer l'application

Ouvre **deux terminaux** (ou deux onglets dans le terminal VS Code) :

**Terminal 1 — Backend :**
```bash
npm run backend:dev
# Backend disponible sur http://localhost:3001
# Swagger API docs : http://localhost:3001/api/v1/docs
```

**Terminal 2 — Frontend :**
```bash
npm run frontend:dev
# Frontend disponible sur http://localhost:3000
```

---

## 8. Vérifier que tout fonctionne

```bash
# Santé de l'API backend
curl http://localhost:3001/api/v1/health
# Doit répondre : {"status":"ok", ...}
```

Puis ouvre [http://localhost:3000](http://localhost:3000) dans le navigateur.

---

## 9. Commandes utiles au quotidien

```bash
# Voir le schéma de la base de données visuellement
npm run db:studio          # ouvre Prisma Studio sur http://localhost:5555

# Lancer les tests backend
cd backend && npm run test

# Vérifier le lint
cd backend && npm run lint
cd frontend && npm run lint

# Après avoir modifié prisma/schema.prisma
npm run db:generate
cd backend && npx prisma migrate dev --name nom_de_la_migration
```

---

## 10. Structure du projet

```
D-fund/
├── backend/        # API NestJS (port 3001)
│   ├── src/
│   │   ├── auth/       # Authentification JWT + Google OAuth
│   │   ├── users/      # Profils BtoB / BtoC
│   │   ├── opportunities/
│   │   ├── applications/
│   │   ├── messages/   # Chat temps réel (Socket.io)
│   │   ├── notifications/
│   │   └── ...
│   └── test/
├── frontend/       # Next.js 14 App Router (port 3000)
│   └── src/app/
├── prisma/         # Schéma Prisma partagé (source de vérité BDD)
├── scripts/        # Scripts utilitaires
└── docs/           # Documentation
```

---

## Problèmes fréquents

**`Cannot find module '@prisma/client'`**
→ Lance `npm run db:generate`

**`Connection refused` sur le backend**
→ Vérifie que `DATABASE_URL` et `DIRECT_URL` dans `.env` sont corrects

**`Redis connection error`**
→ Lance `brew services start redis` puis vérifie avec `redis-cli ping`

**Erreur de port déjà utilisé**
```bash
lsof -ti:3001 | xargs kill -9   # libère le port 3001
lsof -ti:3000 | xargs kill -9   # libère le port 3000
```

**`prisma migrate` échoue**
→ Utilise `DIRECT_URL` (pas le pooler) pour les migrations — vérifie que `DIRECT_URL` est bien renseigné dans `.env`
