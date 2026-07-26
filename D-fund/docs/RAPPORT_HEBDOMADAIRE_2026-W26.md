# Rapport hebdomadaire — Semaine W26 (22 – 29 juin 2026)

## Résumé

**Première mise en production de SouthConnect.** Semaine charnière : déploiement complet sur Railway (backend) et Vercel (frontend), résolution de 8 bugs bloquants découverts lors des tests prod, et go-live confirmé en fin de semaine. Application accessible sur `https://southconnect.io`.

---

## Déploiement — mise en production

### Commit principal — 28 juin : audit sécurité + production-ready

Commit `2a90476` — 233 tests (17 unit + 216 e2e) tous verts, build prod OK, smoke test 8/8 ✓

**Sécurité backend (corrections C1–C4, H1–H4, M1–M10, L1–L7) :**
- Rate-limiting `@Throttle` ajouté sur 12 controllers (élimine les 429 en usage normal, protège contre le brute-force)
- `forgotPassword` + `findByEmail` filtrent `deletedAt:null` → impossible de confirmer l'existence d'un compte supprimé
- `SESSION_SECRET` et `REDIS_PASSWORD` vérifiés au boot (app refuse de démarrer sans eux en prod)
- Cron `resync applicationsCount` filtre `deletedAt:null` + `isDraft:false`
- `onDelete:SetNull` ajouté sur 4 relations Prisma manquantes (évite les enregistrements orphelins)
- Migration `0013` : colonnes `emailOptOut`, `emailUnsubscribeToken`, index composites
- Referral : route publique `GET /code/:code` débloquée (guard mal placé retiré)
- Storage : ownership check sur `opportunities/{id}/file` via DB (non via URL)
- `ParseIdPipe` sur tous les params ID (profiles, messages, applications, social)
- Stats admin : filtrent les soft-deleted users et applications
- CSP `img-src` : domaines explicites (Supabase, Pexels, Unsplash, GoogleUserContent…)
- Notifications : `user.email` retiré des logs, remplacé par `user.id`
- Dashboard : enveloppé dans `AuthGuard`

**Infrastructure :**
- `railway.toml` créé à la racine du repo (healthcheck `/api/v1/health/live`, restart policy)
- `Dockerfile` multi-stage adapté pour Railway (contexte de build à la racine)
- `next.config.js` : `output: 'standalone'` conditionnel (désactivé sur Vercel, actif pour Docker)
- `jose` rétrogradé de v6 → v5.10.0 (v6 incompatible avec le middleware Next.js Edge Runtime)

---

## Bugs production résolus (28–29 juin)

### Bug 1 — Entrypoint Docker incorrect
**Commit :** `1a45657`
NestJS compile `src/` vers `dist/src/`, pas `dist/`. Le `CMD` du Dockerfile pointait sur `dist/main.js` qui n'existait pas → crash immédiat.
**Fix :** `node dist/src/main.js`

### Bug 2 — Alpine Linux incompatible avec `@sentry/profiling-node`
**Commit :** `e2bc7c3`
L'addon C++ natif de Sentry utilise glibc. Alpine utilise musl libc → crash silencieux avant tout output Node.js, zéro log.
**Fix :** `node:22-slim` (Debian Bookworm / glibc) à la place de `node:22-alpine`

### Bug 3 — Ordre `npm ci` / `.prisma` incorrect
**Commit :** `944a643`
`npm ci` supprime `node_modules` avant réinstallation, écrasant le dossier `.prisma` copié avant lui. Les enums Prisma (`UserRole`) étaient `undefined` → crash du controller au chargement.
**Fix :** `npm ci` d'abord, puis `COPY .prisma`

### Bug 4 — Binaire Prisma OpenSSL mauvaise version
**Commits :** `e3efc95`, `a4a176f`, `cd3c6e9`
Prisma générait un binaire pour `openssl-1.1.x` (Bullseye). Le container `node:22-slim` (Bookworm) utilise OpenSSL 3.0.x → premier appel DB crashait.
**Fix :** `binaryTargets = ["native"]` uniquement (native détecte automatiquement la bonne version)

### Bug 5 — CORS bloqué pour `www.southconnect.io`
Vercel sert le frontend sur `www.southconnect.io`. Le backend n'acceptait que `southconnect.io` → toutes les requêtes API retournaient 500 CORS.
**Fix :** `FRONTEND_URL=https://southconnect.io,https://www.southconnect.io` dans Railway Variables

### Bug 6 — Variables Vercel vides
`NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_WS_URL` étaient présentes mais vides → le frontend appelait `undefined/api/v1/...`.
**Fix :** Remplir les variables + redéploiement Vercel obligatoire (compilées au build time)

### Bug 7 — Google OAuth → URL de redirection invalide + 401
**Commits :** `150776d`, `368bbe2`
Deux sous-problèmes distincts :
1. `frontendUrl` utilisait toute la chaîne `FRONTEND_URL` (multi-domaines) → URL invalide → Server Error
2. Cookie de session `sameSite: 'strict'` bloqué par le navigateur lors de la redirection depuis `google.com` → state OAuth perdu → 401

**Fix :** `.split(',')[0].trim()` pour l'URL de redirection + `sameSite: 'lax'` sur le cookie de session (pas les cookies JWT)

### Bug 8 — `@sentry/profiling-node` crash au rebuild complet
**Commits :** `6ed3dfa`, `ac85115`
Après le rebuild Docker complet (cache-bust v4), npm téléchargeait un nouveau binaire C++ natif qui crashait avant l'enregistrement des handlers `uncaughtException` → zéro log → healthcheck timeout.
**Fix :** try-catch autour de `require('@sentry/profiling-node')` dans `instrument.ts` + try-catch autour de `require('./instrument')` dans `main.ts`

### Bug 9 — Pages authentifiées blanches (dashboard, profil, chat, etc.)
**Commit :** `7fff468`
Le middleware Next.js Edge lit le cookie `access_token`. Ce cookie était posé par `api.southconnect.io` sans attribut `domain` → cookie invisible pour `www.southconnect.io` → redirect systématique vers `/login`.
**Fix :** `COOKIE_DOMAIN=.southconnect.io` dans Railway Variables + code `auth.controller.ts` applique cet attribut sur tous les cookies JWT

---

## État à la fin de la semaine

| Fonctionnalité | Statut |
|---|---|
| Backend Railway | ✅ En ligne |
| Frontend Vercel | ✅ En ligne |
| Connexion email / mot de passe | ✅ |
| Connexion Google OAuth | ✅ |
| Pages authentifiées | ✅ (après déconnexion/reconnexion post-fix domain) |
| Pages publiques | ✅ |
| CORS multi-origin | ✅ |
| 233 tests (unit + e2e) | ✅ |
| Emails (mot de passe oublié) | ⚠️ À vérifier (domaine Resend) |
| Mobile / responsive | ⚠️ Non testé en prod |

---

## Variables d'environnement configurées en prod

### Railway (backend)
```
FRONTEND_URL=https://southconnect.io,https://www.southconnect.io
BACKEND_URL=https://api.southconnect.io
COOKIE_DOMAIN=.southconnect.io
NEXT_PUBLIC_API_URL=https://api.southconnect.io/api/v1   ← (info, côté Vercel)
```

### Vercel (frontend)
```
NEXT_PUBLIC_API_URL=https://api.southconnect.io/api/v1
NEXT_PUBLIC_WS_URL=https://api.southconnect.io
```

---

## Semaine suivante (W27)

- Vérifier le domaine `mail.southconnect.io` dans Resend (DNS Cloudflare) → débloquer les emails
- Tester le flux d'inscription complet par email
- Revoir le responsive mobile (sidebar, dashboard)
- Nettoyer le Dockerfile (LABEL cache-bust, echo de debug dans entrypoint)
- Préparer la rotation des secrets (Supabase, Google OAuth, JWT, Redis)
