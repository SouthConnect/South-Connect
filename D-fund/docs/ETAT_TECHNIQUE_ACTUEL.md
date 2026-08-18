# État technique actuel — D-Fund / SouthConnect

**Dernière vérification : 12 août 2026.** Ce document décrit l'état réel du code à cette date, vérifié directement dans le repo (versions, modules, configuration) — pas une description de ce qui était prévu. Il fait autorité sur l'état actuel du projet ; les 9 documents `PHASE1_*` à `PHASE9_*` dans ce dossier sont des documents de **planification datant d'avant le développement** (janvier 2026) et ne reflètent pas nécessairement des décisions encore ouvertes aujourd'hui — voir la note en tête de chacun.

Pour un résumé plus court et déjà à jour, voir le [`README.md`](../README.md) à la racine. Ce document va plus loin sur les détails d'implémentation et les points de vigilance.

---

## 1. Vue d'ensemble

D-Fund (marque commerciale : **SouthConnect**) est une plateforme connectant des entrepreneurs africains à leurs ressources : talents, mentors, financement, opportunités professionnelles. Monorepo à deux applications (frontend Next.js, backend NestJS) partageant un schéma de base de données commun.

- **Production** : [southconnect.io](https://southconnect.io) (Vercel) · API [api.southconnect.io](https://api.southconnect.io) (Railway)
- **Dépôt** : `github.com/SouthConnect/D-fund` (transféré depuis un compte personnel fin juillet 2026)

---

## 2. Architecture

```
Navigateur
   │
   ├─ HTTP ──────────► Next.js (Vercel)  ── App Router, SSR/CSR mixte
   │                        │
   │                        │ fetch (cookies HttpOnly, credentials: include)
   │                        ▼
   ├─ WebSocket ─────► NestJS (Railway) ── API REST + Gateway Socket.IO
                             │
                 ┌───────────┼───────────────┐
                 ▼           ▼               ▼
           PostgreSQL      Redis          Resend
           (Supabase,    (Railway)      (emails)
          pooler AWS      cache,
          eu-north-1)   sessions OAuth,
                         verrous cron,
                        blocklist JWT,
                       adapter Socket.IO
```

- Le frontend ne parle **jamais directement** à Supabase ou à Redis — tout passe par l'API NestJS. Aucune dépendance `@supabase/supabase-js` côté frontend (vérifié — absente de `package.json`).
- Sentry est branché des deux côtés (backend `@sentry/nestjs`, frontend `@sentry/nextjs`) et capture déjà les erreurs de production.

---

## 3. Stack technique (versions vérifiées)

| Couche | Techno | Version |
|---|---|---|
| Frontend | Next.js | 14.0.4 (App Router) |
| Frontend | React | 18.2 |
| Frontend | TanStack React Query | 5.90 |
| Frontend | Tailwind CSS | 3.4 |
| Backend | NestJS | 11.1 |
| Backend | Prisma Client | 5.7 (backend) — voir note ⚠️ ci-dessous |
| Backend | Socket.IO | 4.8 (+ adapter Redis) |
| Backend | BullMQ | 5.78 (queues, ex: email) |
| DB | PostgreSQL | via Supabase, pooler AWS eu-north-1 |
| Cache/sessions | Redis | Railway |
| Auth | JWT (cookies HttpOnly) + Google OAuth (Passport) | — |
| Email | Resend | — |
| Monitoring | Sentry | backend + frontend |
| IA | Anthropic SDK | génération de brouillon d'opportunité (`ai` module) |
| Node.js (CI) | 20 | — |
| Node.js (images Docker prod) | 22 | — voir note ⚠️ ci-dessous |

⚠️ **Deux incohérences de version mineures repérées, sans impact fonctionnel connu à ce jour, mais à garder en tête** :
- Le `package.json` racine déclare `prisma@6.19` / `@prisma/client@6.19`, alors que `backend/package.json` (celui qui compte réellement pour l'app) est sur `prisma@5.7` / `@prisma/client@5.7`. Un avertissement de version apparaît à chaque `prisma generate`.
- La CI teste sur Node 20, mais les images Docker de production (`backend/Dockerfile`, `frontend/Dockerfile`) sont construites sur Node 22. Le code n'a jamais montré de comportement différent entre les deux versions, mais la CI ne teste donc pas exactement l'environnement de prod.

---

## 4. Structure du repo

```
D-fund/
├── backend/       # API NestJS — 24 modules (dont 3 d'infrastructure : auth, redis, prisma)
├── frontend/      # Next.js 14 App Router — 44 routes (confirmé par `npm run build`)
├── prisma/        # Schéma partagé (22 modèles) + 20 migrations
├── docs/          # Ce document, PHASE1-9 (historique), rapports hebdo, sprint plans
├── scripts/       # Scripts utilitaires (vérif secrets, migration Glide, etc.)
├── docker-compose.yml / .dev.yml / .prod.yml
└── railway.toml, README.md
```

### Modules backend (`backend/src/modules/`)

| Module | Rôle |
|---|---|
| `auth` | Inscription, connexion, refresh JWT, vérification email, reset mot de passe, OAuth Google |
| `opportunities` | CRUD opportunités (emploi, co-fondateur, financement, mentorat...), feed, modération admin |
| `applications` | Candidatures à une opportunité, machine à états (DRAFT → SUBMITTED → OWNER_REVIEW → SUCCESS/ARCHIVED) |
| `messages` | Discussions publiques (forum, liées à une opportunité) et privées (1-à-1), + `ChatGateway` (Socket.IO) |
| `notifications` | Notifications in-app + emails transactionnels |
| `social` | Follow, like, save, ratings |
| `referral` | Codes de parrainage |
| `profiles` | Profils B2C/B2B, listes publiques (talents, entreprises, membres) |
| `storage` | Upload de fichiers vers Supabase Storage (proxy authentifié) |
| `search` | Recherche publique multi-entités |
| `tasks` | Tâches personnelles utilisateur |
| `users` | Gestion de compte (profil, export RGPD, suppression, modération admin) |
| `ai` | Génération de brouillon d'opportunité via Anthropic (pré-remplissage formulaire, ne persiste rien) |
| `cron` | Tâches planifiées : archivage, expiration de boosts/parrainages, resync de compteurs — verrou distribué Redis pour éviter la double exécution multi-instance |
| `audit` | Journal des actions admin |
| `feedback`, `industries`, `markets`, `features` | Contenus de référence / retours utilisateurs |
| `health` | Liveness/readiness probes |
| `email` | Client Resend + file BullMQ (a remplacé un ancien `email-queue` pour casser un cycle de dépendances) |
| `redis`, `prisma` | Modules d'infrastructure partagée |

### Frontend (`frontend/app/`)

App Router avec 44 routes. Layout racine (`AppShell.tsx`) gère le rendu conditionnel selon l'état auth (nav publique vs sidebar connectée), avec deux sous-composants dédiés (`TopNav`, `EmailVerificationBanner`) extraits pour limiter les responsabilités mélangées dans un seul fichier.

---

## 5. Modèle de données

22 modèles Prisma. Entités centrales :

- **`User`** — compte, avec profils optionnels `BtoCProfile`/`BtoBProfile` selon le type d'usage
- **`Opportunity`** — le contenu central (19 types : emploi, co-fondateur, financement, mentorat, service, événement...)
- **`Application`** + **`ApplicationProcess`** — candidature à une opportunité, machine à états
- **`Message`** ↔ **`PrivateDiscussion`** / **`PublicDiscussion`** (+ **`Participant`**) — messagerie
- **`Notification`** — in-app, avec préférences par utilisateur (**`NotificationPreferences`**)
- **`Follow`**, **`SavedOpportunity`**, **`LikedOpportunity`**, **`Rating`** — interactions sociales
- **`ReferralCode`** — parrainage
- **`AdminAuditLog`** — traçabilité des actions admin

**Row-Level Security (RLS)** activée sur 22/23 tables (deny-all, sans policy) — sert de garde-fou si jamais l'API REST auto-générée de Supabase venait à être exposée un jour ; sans effet sur le fonctionnement actuel puisque le backend se connecte en tant que propriétaire des tables (bypass RLS par défaut) et que le frontend n'utilise jamais le client Supabase directement.

---

## 6. Authentification & sécurité

- **JWT en cookies HttpOnly** (`access_token` courte durée, `refresh_token` longue durée avec rotation), jamais en `localStorage`.
- **Blocklist Redis** pour la révocation immédiate des refresh tokens (logout, détection de réutilisation). **Fail-closed en production** si Redis est injoignable (503 plutôt que d'accepter un token potentiellement révoqué) ; fail-open en dev/test uniquement.
- **Vérification côté Edge** (`frontend/middleware.ts`) : contrôle la présence/expiration du cookie pour rediriger tôt, mais **ne vérifie pas la signature** (le secret JWT n'est jamais partagé avec le runtime Edge). La vraie autorisation est toujours appliquée côté backend à chaque appel API.
- **Modèle de guards actuellement opt-in** : chaque route protégée porte explicitement `@UseGuards(JwtAuthGuard)`, pas de guard global avec exception `@Public()`. Audité route par route en août 2026 (108 routes) : 0 route mal protégée trouvée, le modèle est appliqué de façon disciplinée malgré l'absence de filet de sécurité structurel.
- **OAuth Google** : liaison de compte bloquée si l'email existe déjà via mot de passe (empêche une prise de contrôle de compte par un attaquant qui contrôlerait un compte Google au même email) — au prix d'une légère énumération de compte possible via le message d'erreur, acceptée en connaissance de cause (sévérité jugée faible, nécessite déjà de contrôler le compte Google visé).
- **Vérification d'email non forcée** (`ENFORCE_EMAIL_VERIFICATION=false` en prod) — choix assumé pour ne pas freiner l'inscription.
- **Rate limiting** différencié par route sensible (`@Throttle`), tracké par utilisateur authentifié (pas seulement par IP) pour éviter qu'un foyer/réseau partagé ne consomme un quota commun.
- **Tokens sensibles hachés** (SHA-256) en base — reset password, vérification email, désabonnement.

---

## 7. Temps réel

`ChatGateway` (namespace `/chat`) : authentification JWT au handshake, rooms par discussion, adaptateur Redis (`@socket.io/redis-adapter`) pour que les messages traversent toutes les instances backend en cas de scaling multi-instance — pas seulement le process qui a reçu la connexion WebSocket.

`MessagesModule` et `NotificationsModule` sont reliés par un `forwardRef` (pattern supporté nativement par NestJS) : Messages a besoin de Notifications pour créer une notif à la réception d'un message, Notifications a besoin du `ChatGateway` de Messages pour la pousser en temps réel. L'injection du `ChatGateway` côté Notifications est marquée `@Optional()`, donc le module boote même sans `MessagesModule` chargé (ex. tests unitaires).

Depuis le 29 juillet 2026 (commit `edbcf81`), ce cycle ne concerne plus que ces deux modules : `EmailQueueModule` a été extrait en `EmailModule`, qui possède désormais entièrement le client Resend et la file BullMQ sans dépendance retour vers Notifications. Casser le dernier edge restant demanderait de faire de `ChatGateway` le propriétaire d'un nouveau module `RealtimeModule` dédié (déplacement de l'authentification de handshake, de l'adaptateur Redis et du tracking de présence) — planifié si repris un jour.

---

## 8. CI/CD & déploiement

- **CI** (`.github/workflows/ci.yml`, déclenché sur push/PR vers `main`) : scan de secrets (gitleaks), job Backend (Postgres éphémère jetable, migrations, lint, type-check, tests unitaires + e2e), job Frontend (lint, type-check, tests, build), E2E Playwright (smoke tests), build Docker.
- **Déploiement** : Railway (backend) et Vercel (frontend) redéploient automatiquement sur chaque push vers `main`, **indépendamment de la CI** — un échec de CI ne bloque pas un déploiement aujourd'hui (pas de "required status check" configuré côté GitHub/plateformes). À garder en tête : la CI est un filet de vérification, pas une porte bloquante.
- **Migrations en prod** : contrôlées par la variable `RUN_MIGRATIONS` sur Railway (désactivée par défaut suite à un incident passé d'épuisement du pool de connexions au démarrage) — à activer manuellement, déployer, puis redésactiver, uniquement quand une vraie migration doit s'appliquer.

---

## 9. Démarrage en local

Voir le [`README.md`](../README.md) (section "Installation locale") et [`ONBOARDING.md`](./ONBOARDING.md) pour le détail complet, pas dupliqué ici. Point de vigilance : `ONBOARDING.md` recommande Node 22 (cohérent avec les images Docker de prod, mais pas avec la CI qui teste sur Node 20 — voir section 3).

---

## 10. Dette technique et compromis assumés — résumé

| Point | Statut |
|---|---|
| `forwardRef` Messages ↔ Notifications | Connu, pas un bug actif, refactor documenté mais reporté |
| `Rating.itemId` sans clé étrangère (polymorphisme à 3 usages) | Compromis documenté, redesign nécessaire sinon |
| Énumération de compte via callback OAuth Google | Accepté, sévérité jugée faible |
| `ENFORCE_EMAIL_VERIFICATION=false` | Choix assumé, pas un oubli |
| Incohérence versions Prisma (racine vs backend) | Mineure, sans impact connu, à nettoyer un jour |
| Incohérence Node CI (20) vs prod (22) | Mineure, sans impact connu, à harmoniser un jour |
| CI non bloquante pour le déploiement | Vrai angle mort, à corriger si on veut une vraie porte de qualité |
| RLS activée sans policies | Sûr dans l'usage actuel (deny-all, backend en bypass), à revoir seulement si un accès direct Supabase côté client est introduit un jour |

---

*Document maintenu manuellement — à remettre à jour après tout changement d'architecture significatif (nouveau service, changement d'hébergement, nouveau module transverse).*
