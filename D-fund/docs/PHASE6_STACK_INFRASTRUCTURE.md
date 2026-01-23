# Phase 6 — Stack & infrastructure

##   Stack technique figée

### Frontend
-   **Next.js 14** (App Router)
-   **TypeScript**
-   **Tailwind CSS**
-   **React Query** (pour appels API)

### Backend
-   **NestJS** + TypeScript
-   **Prisma** ORM
-   **PostgreSQL** (via Supabase)
-   **JWT** (Passport)

### Base de données
-   **PostgreSQL** (Supabase managed)
-   **Prisma** (ORM)

### Authentification
-   **JWT** (backend)
-   **Auth.js** (NextAuth) - à intégrer côté frontend

### Emails
-   **Resend** (choisi)

### Infrastructure
-   **Vercel** (Frontend) - à configurer
-   **Railway** ou **Fly.io** (Backend) - à choisir

---

##    Hébergement

### Frontend : Vercel
**Pourquoi** :
- Gratuit pour projets open-source
- Déploiement automatique depuis Git
- CDN global
- Excellent pour Next.js
- SSL automatique

**Configuration** :
- Connecter repo GitHub/GitLab
- Variables d'env : `NEXT_PUBLIC_API_URL`
- Build command : `npm run build`

### Backend : Railway (recommandé) ou Fly.io

#### Option 1 : Railway
**Pourquoi** :
- Simple à utiliser
- PostgreSQL intégré (ou Supabase externe)
- Déploiement depuis Git
- Pricing clair ($5/mois starter)

**Configuration** :
- Connecter repo
- Variables d'env : `DATABASE_URL`, `JWT_SECRET`, etc.
- Build command : `npm run build`
- Start command : `npm run start:prod`

#### Option 2 : Fly.io
**Pourquoi** :
- Gratuit pour petits projets
- Global edge deployment
- Bonne performance

**Configuration** :
- Nécessite `fly.toml`
- Plus de configuration que Railway

**Recommandation** : **Railway** pour simplicité

---

##    Outils tiers

### Développement
-   **Git** (version control)
-   **GitHub/GitLab** (repo)
-   **ESLint** (linting)
-   **Prettier** (formatting)

### Monitoring (Post-V1)
-   **Sentry** (error tracking)
-   **LogRocket** (session replay)
-   **Analytics** (Google Analytics ou Plausible)

### CI/CD (Post-V1)
-   **GitHub Actions** (tests automatiques)
-   **Vercel** (auto-deploy frontend)
-   **Railway** (auto-deploy backend)

---

## 📦 Livrables

1. **Document de stack**   (ce document)
2. **Configuration déploiement**   (à créer)
   - `vercel.json` (frontend)
   - `railway.json` ou `fly.toml` (backend)
3. **Guide de déploiement**   (à créer)

---

##   Validation

-   Stack frontend validée
-   Stack backend validée
-   DB choisie (Supabase)
-   Hébergement à configurer
-   Outils tiers à intégrer (post-V1)

