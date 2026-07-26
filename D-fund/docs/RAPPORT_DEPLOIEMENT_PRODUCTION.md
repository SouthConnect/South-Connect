# Rapport de déploiement — SouthConnect (D-Fund)

**Date :** 28 juin – 1er juillet 2026
**Stack :** NestJS 11 (Railway) + Next.js 14 App Router (Vercel)
**Auteur :** dan001

---

## 1. Architecture de production

| Service | URL | Plateforme | Notes |
|---|---|---|---|
| Backend API | `https://api.southconnect.io` | Railway | Docker, Node 20 |
| Frontend | `https://southconnect.io` | Vercel | Next.js 14, Edge runtime |
| Base de données | Supabase PostgreSQL | Supabase | pgbouncer port 6543 |
| Cache / Révocation tokens | Redis | Railway | Interne au projet |
| Emails | Resend | Resend | `mail.southconnect.io` |
| Monitoring erreurs | Sentry | Sentry.io | Backend + Frontend |

### Schéma de communication

```
Browser (southconnect.io)
  │
  ├──► Next.js Edge Middleware (Vercel)
  │      └── lit cookie access_token
  │
  ├──► Next.js Server Components / API Routes
  │
  └──► api.southconnect.io (Railway)
         ├── NestJS REST API (/api/v1/*)
         ├── Socket.IO (/chat namespace)
         ├── Supabase PostgreSQL (pgbouncer)
         └── Redis (rate limiting, token revocation)
```

### Authentification (JWT HttpOnly cookies)

- `access_token` : durée 15 min, envoyé sur tous les appels `/api/v1/**`
- `refresh_token` : durée 7 jours, scopé uniquement sur `/api/v1/auth/refresh`
- Révocation côté serveur via Redis (blocklist sur logout)
- Rotation automatique du refresh token à chaque usage

---

## 2. Problèmes rencontrés et fixes appliqués

### Problème 1 — `RUN_MIGRATIONS=true` → EMAXCONNSESSION

**Symptôme :** L'app ne démarrait pas. Logs Railway : `EMAXCONNSESSION — connection pool exhausted`.

**Cause :** `prisma migrate deploy` utilisait la variable `DIRECT_URL` pointant sur le pooler Supabase en mode session (port 5432, max 15 connexions simultanées). La migration épuisait le pool avant même que l'app NestJS charge.

**Fix :** Retirer `RUN_MIGRATIONS=true` de Railway Variables. Les migrations étaient déjà appliquées en développement local. Aucune migration supplémentaire n'est nécessaire pour le déploiement initial.

> **À faire plus tard :** Quand le schéma Prisma changera, pointer `DIRECT_URL` sur la connexion directe Supabase (non-pgbouncer) : `postgresql://postgres:PASSWORD@db.eblxcvivlowdqfbhhple.supabase.co:5432/postgres`, puis réactiver `RUN_MIGRATIONS=true`.

---

### Problème 2 — Build Docker 100% caché → image périmée

**Symptôme :** Déployement Railway en mode "Starting Container" sans aucun log NestJS. Les modifications de code n'avaient aucun effet.

**Cause :** Railway réutilisait une image Docker avec tous les layers en cache, y compris un layer potentiellement corrompu. Les nouvelles modifications n'étaient jamais compilées.

**Fix :** Ajout d'un `LABEL cache-bust=v4` dans le Dockerfile pour invalider le cache et forcer un rebuild complet de toutes les couches.

```dockerfile
# Dans le builder stage
LABEL cache-bust=v4
```

---

### Problème 3 — Erreurs CORS sur toutes les requêtes API

**Symptôme :** Toutes les requêtes API échouaient avec une erreur CORS. Console browser : `Access-Control-Allow-Origin` absent de la réponse. Code HTTP 500.

**Cause :** Vercel sert `www.southconnect.io` (avec le `www`), donc le browser envoie `Origin: https://www.southconnect.io`. La variable `FRONTEND_URL` dans Railway ne contenait que `https://southconnect.io` — le middleware CORS NestJS rejetait l'origine non reconnue.

**Fix :** Mettre à jour la variable Railway :
```
FRONTEND_URL=https://southconnect.io,https://www.southconnect.io
```

Le code CORS dans `main.ts` lit cette liste séparée par virgules et accepte chaque origine :
```typescript
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
```

---

### Problème 4 — Variables Vercel vides → frontend appelle `undefined/api/v1`

**Symptôme :** Pages blanches sur le frontend. Network tab : requêtes vers `undefined/api/v1/...`.

**Cause :** Les variables `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL` étaient présentes dans le dashboard Vercel mais avec une valeur vide.

**Fix :** Remplir les variables dans Vercel, puis **redéployer** (ces variables sont compilées au build time — un simple redémarrage ne suffit pas) :
```
NEXT_PUBLIC_API_URL = https://api.southconnect.io/api/v1
NEXT_PUBLIC_WS_URL  = https://api.southconnect.io
```

> **Important :** Toute modification de variable `NEXT_PUBLIC_*` sur Vercel nécessite un redéploiement complet pour prendre effet.

---

### Problème 5 — Google OAuth → Server Error (URL de redirection invalide)

**Symptôme :** Après authentification Google, redirection vers une URL invalide produisant une page "Server Error".

**Cause :** `auth.controller.ts` utilisait la variable `FRONTEND_URL` entière pour construire l'URL de redirection post-OAuth. Avec la valeur multi-domaines, l'URL générée était :
```
https://southconnect.io,https://www.southconnect.io/auth/google/success
```
Ce qui est une URL invalide.

**Fix (code) :** `D-fund/backend/src/modules/auth/auth.controller.ts` — prendre uniquement le premier domaine :
```typescript
const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000')
  .split(',')[0]
  .trim();
```

---

### Problème 6 — Google OAuth → 401 Unauthorized (cookie de session bloqué)

**Symptôme :** Callback Google retournait HTTP 401. NestJS ne trouvait pas le state OAuth dans la session.

**Cause :** Le cookie de session Express (utilisé pour la protection CSRF du flow OAuth, pas pour l'authentification utilisateur) était configuré avec `sameSite: 'strict'`. Lors de la redirection depuis `google.com` vers `api.southconnect.io`, le navigateur refusait d'envoyer ce cookie (navigation cross-site) → le state OAuth était perdu → NestJS rejetait le callback.

**Fix (code) :** `D-fund/backend/src/main.ts` — session cookie avec `sameSite: 'lax'` :
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',   // ← 'strict' bloquait le cookie sur la redirection Google
    maxAge: 10 * 60 * 1000,
  },
}));
```

> **Note :** Ce cookie ne contient que le state OAuth temporaire (10 min). L'authentification utilisateur repose sur les cookies JWT HttpOnly, non affectés par ce changement.

---

### Problème 7 — Crash silencieux au démarrage (aucun log NestJS)

**Symptôme :** Après le rebuild complet Docker (cache-bust v4), le container démarrait puis s'arrêtait immédiatement sans aucun log applicatif. Railway indiquait "Healthcheck failed" après timeout.

**Cause :** `@sentry/profiling-node` contient un addon natif C++ compilé. Lors d'un rebuild Docker complet, npm télécharge un nouveau binaire natif pour l'architecture cible. Ce binaire plantait silencieusement lors du premier `import` de `instrument.ts`, **avant** que les handlers `uncaughtException` soient enregistrés → aucun log → process mort → healthcheck timeout.

**Fix en 2 étapes :**

*Étape 1 — `D-fund/backend/src/instrument.ts` :* rendre le profiling optionnel :
```typescript
let _profilingIntegration: any = null;
try {
  const { nodeProfilingIntegration } = require('@sentry/profiling-node');
  _profilingIntegration = nodeProfilingIntegration();
} catch {
  // Native addon unavailable — profiling disabled, Sentry still works
}
```

*Étape 2 — `D-fund/backend/src/main.ts` :* protéger l'import Sentry entier :
```typescript
// Sentry must be initialised before any other import.
// Wrapped in try/catch: native addons (profiling) can crash on a fresh Docker build.
try {
  require('./instrument');
} catch (err) {
  process.stderr.write(`[Sentry] init failed — monitoring disabled: ${err}\n`);
}
```

---

### Problème 8 — Pages authentifiées blanches (dashboard, profil, chat, notifications, parrainage, analytiques)

**Symptôme :** Toutes les pages de la sidebar affichaient une page blanche. En regardant le Network tab : redirect HTTP 302 vers `/login?redirect=%2Fdashboard`. En local, tout fonctionnait parfaitement.

**Cause (root cause) :** Le middleware Next.js Edge (`frontend/middleware.ts`) s'exécute sur `www.southconnect.io` et lit le cookie `access_token` pour vérifier si l'utilisateur est connecté. Ce cookie était posé par `api.southconnect.io` **sans attribut `domain`** — par défaut un cookie sans `domain` est scopé au domaine exact qui l'a posé (`api.southconnect.io`) et n'est **jamais transmis** à un autre domaine, même sous le même eTLD+1. Le middleware ne voyait donc jamais le cookie → redirect systématique vers `/login`.

> **Pourquoi ça marche en local :** Frontend (`localhost:3000`) et backend (`localhost:3001`) partagent `localhost`. La règle de sous-domaine ne s'applique pas.

**Fix :**

1. Ajouter dans Railway Variables :
   ```
   COOKIE_DOMAIN = .southconnect.io
   ```
   Le `.` (point) au début est obligatoire — il signifie "ce domaine et tous ses sous-domaines".

2. Code `D-fund/backend/src/modules/auth/auth.controller.ts` — utiliser cet attribut sur tous les cookies JWT :
   ```typescript
   private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
     const isProd = this.config.get<string>('NODE_ENV') === 'production';
     const cookieDomain = this.config.get<string>('COOKIE_DOMAIN');
     const base = {
       httpOnly: true,
       secure: isProd,
       sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
       ...(cookieDomain ? { domain: cookieDomain } : {}),
     };
     // ...
   }
   ```
   Le même pattern est appliqué dans `clearAuthCookies()` (logout).

> **Important :** Après ce fix, les utilisateurs doivent **se déconnecter puis se reconnecter** pour obtenir des cookies avec le nouvel attribut `domain`. Les cookies posés avant ce fix (sans `domain`) restent dans le navigateur mais sont ignorés par le middleware.

---

### Problème 9 — `connection_limit=1` sur DATABASE_URL → files d'attente et timeouts après une période d'inactivité

**Symptôme :** Ralentissements généraux et erreurs après une période d'inactivité de l'app : pages qui "plantent" puis repartent, données qui ne se rechargent pas, résolu temporairement par un refresh manuel.

**Cause :** `DATABASE_URL` (pooler Supabase en **mode transaction**, port 6543) était configuré avec `connection_limit=1` — une seule connexion Prisma pour tout le process NestJS (`PrismaService` est un singleton). Cette valeur était probablement une prudence excessive héritée du Problème 1 (`EMAXCONNSESSION`), qui concernait en réalité `DIRECT_URL` (pooler en **mode session**, port 5432, max 15 connexions) — une variable distincte, utilisée uniquement par les migrations. Avec une seule connexion à l'exécution, un pic de requêtes (ex. plusieurs pages qui refetch simultanément au réveil d'un onglet) se met en file d'attente ; au-delà du `pool_timeout` implicite (~10s), Prisma lève `P2024 — Timed out fetching a new connection from the connection pool`.

**Vérification avant fix (2026-07-24) :**
- Railway : 1 replica backend → `total_connections = replicas × connection_limit`
- Supabase (pooler transaction mode) : Pool Size = 15, Max client connections = 200

Avec `connection_limit=5` et 1 replica, on reste largement sous la limite du pool (5 / 15).

**Fix :**
```
DATABASE_URL: ...?pgbouncer=true&connection_limit=1  →  ...?pgbouncer=true&connection_limit=5&pool_timeout=20
```
Variable Railway (voir section 3) — pas de changement de code, `prisma/schema.prisma` lit déjà `env("DATABASE_URL")`.

> **Si le nombre de replicas change** (scaling horizontal), revalider `total_connections = replicas × connection_limit` contre le Pool Size Supabase (15) avant d'augmenter le nombre d'instances.

---

## 3. Variables d'environnement configurées

### Railway (backend — `api.southconnect.io`)

| Variable | Valeur | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | Configuré dans railway.toml |
| `DATABASE_URL` | `postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=20` | pgbouncer transaction mode — voir Problème 9 |
| `DIRECT_URL` | `postgresql://...@pooler.supabase.com:5432/postgres` | Pour Prisma migrations (désactivé pour l'instant) |
| `JWT_SECRET` | `<min 32 chars>` | |
| `REFRESH_TOKEN_SECRET` | `<min 32 chars>` | |
| `SESSION_SECRET` | `<min 32 chars>` | Distinct de JWT_SECRET |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Variable Railway interne |
| `REDIS_PASSWORD` | `${{Redis.REDIS_PASSWORD}}` | Variable Railway interne |
| `FRONTEND_URL` | `https://southconnect.io,https://www.southconnect.io` | Les deux domaines |
| `BACKEND_URL` | `https://api.southconnect.io` | |
| `COOKIE_DOMAIN` | `.southconnect.io` | Point obligatoire pour les sous-domaines |
| `ENFORCE_EMAIL_VERIFICATION` | `false` | Désactivé le temps de tester |
| `RESEND_API_KEY` | `re_...` | |
| `RESEND_FROM_EMAIL` | `noreply@mail.southconnect.io` | |
| `SUPABASE_URL` | `https://eblxcvivlowdqfbhhple.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `...` | |
| `GOOGLE_CLIENT_ID` | `...` | |
| `GOOGLE_CLIENT_SECRET` | `...` | |
| `SENTRY_DSN` | `https://...` | |

### Vercel (frontend — `southconnect.io`)

| Variable | Valeur | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.southconnect.io/api/v1` | Compilé au build time |
| `NEXT_PUBLIC_WS_URL` | `https://api.southconnect.io` | Compilé au build time |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...` | Optionnel |
| `SENTRY_AUTH_TOKEN` | `...` | Optionnel, pour les source maps |
| `SENTRY_ORG` | `...` | Optionnel |
| `SENTRY_PROJECT` | `...` | Optionnel |

---

## 4. Fichiers modifiés (résumé)

| Fichier | Modification |
|---|---|
| `Dockerfile` | `LABEL cache-bust=v4` pour forcer le rebuild |
| `backend/src/main.ts` | Session `sameSite: 'lax'` ; Sentry `require()` dans try-catch |
| `backend/src/instrument.ts` | `nodeProfilingIntegration` dans try-catch (addon C++ optionnel) |
| `backend/src/modules/auth/auth.controller.ts` | `frontendUrl` = premier domaine seulement ; `COOKIE_DOMAIN` sur tous les cookies |

---

## 5. État final

| Fonctionnalité | Statut |
|---|---|
| Backend Railway stable | ✅ Opérationnel |
| Frontend Vercel en ligne | ✅ Opérationnel |
| CORS multi-origin (www + non-www) | ✅ |
| Connexion email / mot de passe | ✅ |
| Connexion Google OAuth | ✅ |
| Pages authentifiées (dashboard, profil, chat, notifications, parrainage, analytiques) | ✅ |
| Pages publiques (communauté, explorer, opportunités…) | ✅ |
| WebSocket chat temps réel | ✅ (à confirmer en prod) |
| Mot de passe oublié (email) | ⚠️ À vérifier : domaine Resend |
| Création de compte | ⚠️ À tester flux complet |
| Mobile / responsive | ⚠️ CSS à revoir |

---

## 6. Points restants à traiter

### 6.1 — Resend : vérification du domaine `mail.southconnect.io`
Les emails (mot de passe oublié, vérification de compte) ne partiront que si le domaine est **Verified** dans le dashboard Resend.

**Étapes :**
1. Aller sur [resend.com/domains](https://resend.com/domains)
2. Vérifier que `mail.southconnect.io` a le statut **Verified**
3. Si non : ajouter les enregistrements DNS dans Cloudflare (MX, DKIM, SPF fournis par Resend)
4. Attendre la propagation DNS (quelques minutes à quelques heures)

### 6.2 — Migrations Prisma futures
Quand le schéma Prisma change :
1. Mettre à jour `DIRECT_URL` → connexion directe Supabase :
   ```
   postgresql://postgres:PASSWORD@db.eblxcvivlowdqfbhhple.supabase.co:5432/postgres
   ```
2. Réactiver `RUN_MIGRATIONS=true` dans Railway Variables
3. Déployer → les migrations s'exécutent au démarrage
4. Retirer `RUN_MIGRATIONS=true` après confirmation

### 6.3 — Nettoyage Dockerfile
Une fois l'application stable :
- Retirer le `LABEL cache-bust=v4` (plus utile maintenant que le cache est propre)
- Nettoyer les `echo` de debug dans `docker-entrypoint.sh`

### 6.4 — Rotation des secrets
Les secrets suivants sont en attente de rotation (note de sécurité interne) :
- Supabase service role key
- Google OAuth client secret
- Resend API key
- JWT secrets Railway
- Activation du mot de passe Redis

### 6.5 — Visuel mobile
Plusieurs vues (dashboard, sidebar) n'ont pas été testées sur mobile en production. À revoir avec les breakpoints Tailwind.

---

## 7. Décisions techniques notables

**Cookies HttpOnly plutôt que localStorage :** Les tokens JWT ne sont jamais exposés au JavaScript du navigateur. Un payload XSS ne peut pas voler les tokens. La contrepartie est la complexité du partage cross-subdomain (résolue par `COOKIE_DOMAIN=.southconnect.io`).

**`sameSite: 'strict'` sur les cookies JWT (prod) :** Les cookies JWT restent en strict — ils ne partent que sur les requêtes "same-site". Seul le cookie de session OAuth est en `lax` (nécessaire pour la redirection depuis google.com). C'est le bon compromis sécurité/fonctionnalité.

**Profiling Sentry optionnel :** `@sentry/profiling-node` est un addon C++ qui peut crasher sur certaines architectures. Le rendre optionnel avec un try-catch permet à l'app de démarrer même si le profiling échoue — le monitoring Sentry de base (erreurs) continue de fonctionner.

**Middleware Next.js Edge (lecture seule) :** Le middleware vérifie la présence et l'expiration du cookie côté Edge, sans valider la signature JWT (le secret n'est pas partagé avec Vercel). La vraie autorisation est toujours faite côté backend sur chaque appel API. C'est une protection légère UX (évite de charger une page pour rien), pas une barrière de sécurité absolue.
