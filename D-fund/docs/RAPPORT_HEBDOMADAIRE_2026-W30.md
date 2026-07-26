# Rapport hebdomadaire — Semaine W30 (20 – 25 juillet 2026)

## Résumé

**Semaine de fiabilité, de sécurité, de fonctionnalités produit et de performance.** Focus sur la résolution de bugs critiques identifiés lors d'un audit complet (Redis bloquant, RGPD, authentification), l'amélioration de l'expérience utilisateur (filtres Explore, publication directe, tâches liées aux opportunités), le renforcement de la sécurité (anonymisation PII, escaping email, Sentry) et une passe d'optimisation des performances (gzip backend, bundle JS allégé, socket.io lazy-loaded). 12 commits pushés en production.

---

## Commit 1 — `099a349` (21 juillet) : Fiabilité — Redis SCAN, status ACTIVE, cache sync

### Bug critique : Redis KEYS bloquait le serveur (cause racine des chargements intermittents)

**Symptôme :** Les opportunités ne se chargeaient pas de façon intermittente, sans erreur visible côté utilisateur.

**Cause :** La commande `KEYS *` (utilisée pour invalider le cache) est une opération O(N) bloquante — elle parcourt l'intégralité du keyspace Redis en monopolisant le thread principal, gelant toutes les autres requêtes le temps de l'exécution.

**Fix :** Remplacement par un `SCAN` non-bloquant en streaming. Redis continue à répondre aux autres requêtes pendant l'itération.

- Fichier : `opportunities.service.ts`

### Fix : feed public filtre uniquement les opportunités ACTIVE

**Problème :** Le filtre par défaut était `{ status: { not: 'DRAFT' } }` → les opportunités en statut PENDING et ARCHIVED pouvaient apparaître dans le feed public selon l'état du cache Redis.

**Fix :** Filtre explicite `status: 'ACTIVE'`. La clé de cache Redis inclut maintenant les paramètres de filtre pour éviter les collisions de cache entre requêtes différentes.

### Fix : cache like/save non synchronisé sur la page Explorer

**Problème :** Liker ou sauvegarder une opportunité depuis Explorer revenait à l'état initial au remount — le cache `['explore']` n'était pas patché en optimistic update.

**Fix :** Ajout de `['explore']` dans `patchOpportunityInAllCaches` et dans `toggleSaveMutation.onSuccess`.

### Fix : page Sauvegardés — état d'erreur silencieux

**Problème :** Une erreur réseau affichait "Aucune opportunité sauvegardée" au lieu d'un message d'erreur — l'utilisateur ne savait pas si c'était vide ou cassé.

**Fix :** Extraction de `isError` depuis le hook et ajout d'un bloc d'erreur visible.

---

## Commit 2 — `9d0a64a` (21 juillet) : Feature — Filtres Pays / Date / Remote sur Explorer

### Filtres avancés sur la page Explorer

- **Pays** : dropdown groupé avec 53 pays africains + 11 pays de la diaspora (Île-de-France incluse séparément)
- **Date** : 4 plages — 24 heures, 7 jours, 30 jours, 3 mois
- **Remote** : toggle booléen — affiche uniquement les opportunités en remote
- Les profils utilisateurs sont masqués automatiquement quand un filtre est actif (seules les opportunités sont pertinentes)
- Le cache Redis intègre les nouveaux paramètres dans sa clé pour éviter les résultats incorrects

Fichiers modifiés : `explore/page.tsx`, `list-opportunities.dto.ts`, `opportunities.service.ts`

---

## Commit 3 — `bcd5947` (21 juillet) : Feature — Publication directe (modèle LinkedIn)

### Fin du circuit de validation admin obligatoire

**Avant :** Toute nouvelle opportunité passait par DRAFT → PENDING → validation admin → ACTIVE. Les créateurs attendaient sans feedback.

**Après :** Publication directe en ACTIVE dès la création. Les créateurs peuvent aussi choisir de sauvegarder en brouillon (DRAFT). La modération devient *a posteriori* (signalement, archivage admin).

- Bouton "Publier maintenant" ajouté sur les opps coincées en PENDING (pour les utilisateurs existants)
- Le formulaire de création distingue clairement "Publier" et "Sauvegarder comme brouillon"

Fichiers modifiés : `opportunities/new/page.tsx`, `my-opportunities/page.tsx`, `opportunities.service.ts`

---

## Commit 4 — `d452132` (21 juillet) : Fix — Google OAuth callback → redirect propre

### Bug : échec OAuth affichait un JSON 401 brut dans le navigateur

**Symptôme :** Quand le callback Google échouait (state CSRF expiré, code déjà utilisé, session perdue), Passport levait une exception non interceptée → le navigateur affichait `{"statusCode":401,"message":"Unauthorized"}` en plein écran.

**Cause :** `@UseGuards(AuthGuard('google'))` sur la route callback laisse l'exception se propager si Passport échoue.

**Fix :** Création d'un `GoogleCallbackGuard` custom qui surcharge `handleRequest` — en cas d'échec, il retourne un marqueur `{ oauthError: 'OAUTH_FAILED' }` au lieu de lever une exception. Le controller redirige alors proprement vers `/login?error=OAUTH_FAILED`. Le frontend affiche : *"La connexion via Google a échoué. Réessaie ou connecte-toi avec ton email."*

Fichiers modifiés : `google-callback.guard.ts` (nouveau), `auth.controller.ts`, `login/page.tsx`

---

## Commit 5 — `254874e` (21 juillet) : Feature — Tâches liées aux opportunités dans le dashboard

### Association tâches ↔ opportunités

L'infrastructure (`relatedItemId`, `relatedItemType`) était déjà en base de données mais jamais exposée dans l'UI.

- **Création** : sélecteur "Lier à une opportunité (optionnel)" dans le formulaire de création de tâche
- **Affichage** : nom de l'opportunité liée affiché sous chaque tâche (lien cliquable vers la page de l'opp)
- **Fix queryKey** : la section Tâches utilisait la même clé React Query que le dashboard (`['my-opportunities-dashboard']`) avec `take=100` au lieu de `take=10` → React Query servait les 10 items du cache du dashboard. Corrigé avec une clé distincte `['my-opportunities-tasks']`.

Fichier modifié : `dashboard/page.tsx`

---

## Commit 6 — `8b11b46` (21 juillet) : Feature — Gradient de couverture par type d'opportunité

### Suppression de la dépendance Unsplash

L'image de couverture par défaut pointait vers une URL Unsplash externe (dépendance réseau, image générique non brandée, problème si Unsplash est inaccessible).

**Remplacement :** Gradient CSS généré dynamiquement selon le type d'opportunité — 19 types couverts :

| Type | Gradient |
|---|---|
| JOB_OPPORTUNITY | Bleu indigo (#1e3a5f → #3b49df) |
| FUNDING_OPPORTUNITY | Vert (#14532d → #16a34a) |
| EVENT | Rose (#831843 → #f472b6) |
| COFOUNDER_SEARCH | Teal (#134e4a → #0d9488) |
| MENTORSHIP | Violet (#3b0764 → #9333ea) |
| … | 14 autres types |

Aucune dépendance externe. Rendu instantané même hors réseau.

Fichier modifié : `opportunities/[id]/page.tsx`

---

## Commit 7 — `08a11ba` (21 juillet) : Feature — Bouton documentation sur la page Parrainage

- Ajout d'un bouton "Comment ça marche ?" dans le banner orange de la page Parrainage
- Constante `DOCS_URL` en tête de fichier — mise à jour en une ligne quand l'URL Notion sera disponible

Fichier modifié : `referral/page.tsx`

---

## Commit 8 — `77e9f24` (21 juillet) : Fix — Description des forums ouverts jamais affichée

**Problème :** Le champ description était saisi à la création d'un forum ouvert mais ignoré partout dans l'UI.

**Fix :**
- Liste des forums (`chat/page.tsx`) : description affichée sous le nom du forum (fallback sur le nombre de membres)
- Page de discussion (`chat/public/[id]/page.tsx`) : description affichée dans le header sous le titre

---

## Commit 9 — `f2abbc5` (21 juillet) : Audit — RGPD, Prisma, Redis, pagination, email safety

### RGPD Art. 17 — `adminDelete` sans anonymisation PII

**Problème :** La suppression d'un compte par un admin ne faisait que `deletedAt = now()` — toutes les données personnelles restaient en clair en base (email, nom, bio, téléphone, photo, googleId, password).

**Fix :** Alignement sur `deleteMe` : anonymisation complète de tous les champs PII avant soft-delete.

Fichier : `users.service.ts`

### Prisma P2023 (ID malformé) → 400 Bad Request

**Problème :** Un identifiant invalide dans l'URL (ex. `abc` au lieu d'un CUID) provoquait une erreur Prisma non catchée → réponse 500.

**Fix :** Mapping P2023 → 400 dans le filtre d'exceptions global, avec message `"Invalid identifier format"`.

Fichier : `sentry-exception.filter.ts`

### Redis commandTimeout 5 000 ms → 2 000 ms

Un Redis dégradé pouvait bloquer chaque requête HTTP jusqu'à 5 secondes. Réduit à 2 s pour fail-fast.

Fichier : `redis.module.ts`

### findByOwner — pagination manquante

**Problème :** L'endpoint retournait un tableau plat sans métadonnées. Les utilisateurs avec plus de 50 opportunités voyaient leurs données tronquées silencieusement.

**Fix :** Retourne `{ data, total, hasMore }` avec un `COUNT` en parallèle via `Promise.all`.

Fichiers : `opportunities.service.ts`, `my-opportunities/page.tsx`, `dashboard/page.tsx`

### Email templates — href sans échappement HTML

**Problème :** La fonction `btn(href, label)` injectait les URLs directement dans les attributs HTML sans échappement.

**Fix :** Ajout d'un helper `escapeAttr()` → remplace `&`, `"`, `<`, `>` par leurs entités HTML.

Fichier : `notifications.service.ts`

### Sentry — erreurs `createInApp` silencieuses

Les échecs de notifications in-app étaient loggés dans la console mais jamais envoyés à Sentry.

**Fix :** Ajout de `Sentry.captureException(err)` dans le bloc catch.

Fichier : `notifications.service.ts`

---

## Commit 10 — `1298b44` (21 juillet) : Fix — QueryKey collision dans le dashboard

Correctif isolé suite à l'audit de la section Tâches : la clé `['my-opportunities-tasks', uid]` distincte pour éviter toute ambiguïté de cache. (Détail dans le commit 5.)

---

## Commit 11 — `e60362b` (23 juillet) : Fix — Railway healthcheck `/live` → `/ready`

### Cause racine des chargements en erreur sur la page d'accueil après déploiement

**Symptôme :** Après chaque déploiement (push), la page d'accueil affichait "Impossible de charger les opportunités" pendant 1 à 2 minutes.

**Cause :** `railway.toml` utilisait `/health/live` comme healthcheck. Cette route retourne `{ status: 'ok' }` dès que le process NestJS démarre — **avant** que Prisma ait établi sa connexion pool avec Supabase. Railway envoyait donc du trafic vers la nouvelle instance trop tôt, et la première requête tombait sur une connexion DB froide (10-20 s de latence → timeout frontend de 15 s → erreur).

**Fix :** Changement vers `/health/ready`, qui vérifie explicitement `SELECT 1` (DB) et `PING` (Redis) avec un timeout de 2 s avant de retourner 200. Railway attend maintenant que le serveur soit réellement prêt avant de router les premières requêtes.

Fichiers : `railway.toml`, `frontend/app/page.tsx` (message d'erreur amélioré)

---

## Commit 12 — `9fb23b3` (23 juillet) : Performance — gzip backend + lazy-load bundle critique

### Compression gzip manquante sur le backend

**Problème :** Le backend NestJS ne compressait pas ses réponses HTTP — chaque réponse JSON était envoyée en clair. Une réponse `/opportunities` de 40 KB était envoyée telle quelle au lieu de ~8 KB compressés.

**Fix :** Ajout du middleware `compression` (Express) en tête de la chaîne middleware NestJS. Toutes les réponses JSON sont maintenant compressées en gzip automatiquement.

Fichier : `main.ts`, `package.json`

### socket.io-client dans le bundle global (cause racine des pages lentes)

**Problème :** `socket.io-client` (~350 KB minifié) était importé statiquement dans `Sidebar.tsx`. Comme le Sidebar est chargé sur **toutes** les pages authentifiées via `AppShell`, cette bibliothèque se retrouvait dans le bundle critique partagé — elle était parsée par le navigateur sur chaque navigation, même sur des pages qui n'utilisent pas le WebSocket (Explorer, Dashboard, Profil…).

**Fix :** Extraction de toute la logique socket vers un nouveau composant `RealtimeSync.tsx`, importé dynamiquement dans `AppShell` via `next/dynamic({ ssr: false })`. socket.io-client est maintenant splitté dans son propre chunk et chargé de façon asynchrone après le premier rendu.

Fichiers : `components/RealtimeSync.tsx` (nouveau), `components/AppShell.tsx`, `components/Sidebar.tsx`

### TanStack Query Devtools dans le bundle de production

**Problème :** Malgré le guard `process.env.NODE_ENV === 'development'`, l'import statique de `ReactQueryDevtools` (2× 1.3 MB) n'était pas tree-shaké par Next.js — les chunks apparaissaient dans le build de production.

**Fix :** Remplacement de l'import statique par un `dynamic(() => import(...))` conditionné à l'environnement de développement. Les devtools sont maintenant entièrement absents du bundle de production.

Fichier : `app/Providers.tsx`

---

---

## Commit 13 — `0dcff78` (23 juillet) : Fix — 3 bugs critiques production

### Bug 1 — Duplication de messages dans le chat

**Symptôme :** Un message envoyé apparaissait en double dans la fenêtre de chat.

**Cause :** La mise à jour optimiste ajoutait un message temporaire (ID client), puis l'événement WebSocket `newMessage` ajoutait le message confirmé — sans dédupliquer sur `clientMessageId`. Résultat : deux entrées pour le même message.

**Fix :** `handleNewMessage` dans `chat.gateway.ts` retourne maintenant `clientMessageId` dans le payload. Côté frontend, `setQueryData` remplace le message temporaire s'il trouve une correspondance sur `clientMessageId` au lieu d'ajouter un doublon.

Fichiers : `messages.service.ts`, `chat/private/[id]/page.tsx`, `chat/public/[id]/page.tsx`, migration `0015_add_client_message_id`

### Bug 2 — Analytics page : crash au chargement

**Symptôme :** La page Analytics crashait avec `TypeError: Cannot read properties of undefined (reading 'filter')`.

**Cause :** `findByOwner` avait été refactorisé pour retourner `{ data, total, hasMore }` (commit 9, pagination), mais `analytics/page.tsx` attendait encore un tableau plat et appelait `.filter()` directement dessus.

**Fix :** Extraction de `.data` dans le `queryFn` de la page Analytics.

Fichier : `analytics/page.tsx`

### Bug 3 — Badge conversations privées non mis à jour

**Symptôme :** Après avoir démarré une conversation depuis une page d'opportunité ou depuis la communauté, le badge de messages non lus dans la sidebar ne se rafraîchissait pas.

**Fix :** Ajout de `queryClient.invalidateQueries(['private-discussions'])` dans `onSuccess` des deux mutations concernées.

Fichiers : `opportunities/[id]/page.tsx`, `community/page.tsx`

---

## Commit 14 — `129d669` (23 juillet) : Phase 1 — Centralisation des queryKeys

### Problème architectural : 40+ clés React Query en chaînes de caractères éparpillées

Toutes les clés React Query étaient définies comme des tableaux littéraux inline (`['opportunities', userId]`, `['saved-opportunities']`…) dans chaque composant. Ce pattern causait :
- **Cache cross-user** : `['saved-opportunities']` sans `userId` partageait le cache entre utilisateurs différents
- **Invalidations incomplètes** : `invalidateQueries(['opportunities'])` ne vidait pas les caches des pages qui utilisaient des variantes légèrement différentes
- **Maintenance** : modifier une clé nécessitait de chercher toutes ses occurrences manuellement

**Fix :** Création d'une factory centralisée `app/lib/queryKeys.ts` (`qk`) couvrant 30+ entrées. Chaque clé inclut systématiquement les paramètres qui la distinguent (userId, id, filtres…). Tous les fichiers frontend migrés vers `qk.*`.

**Résultat :** 0 chaîne inline dans les `useQuery`/`useInfiniteQuery`/`invalidateQueries` — vérifié par grep.

Fichiers modifiés : 42 fichiers frontend

---

## Commit 15 — `8e808df` (23 juillet) : Fix — Redis session OAuth + résilience chat

### Redis session store pour OAuth (résolution partielle)

**Problème :** Google OAuth utilisait le `MemoryStore` par défaut d'`express-session`. À chaque redémarrage du container Railway (déploiement, crash), la session contenant le paramètre `state` anti-CSRF était perdue. Google renvoyait un code valide mais le backend ne trouvait plus la session → état mismatch → `OAUTH_FAILED`.

**Fix :** Ajout d'un `RedisStore` (`connect-redis` v8) dans `main.ts`. La session OAuth est persistée dans Redis et survit aux redémarrages.

Note : Configuration initiale avec `lazyConnect: true` + `enableOfflineQueue: false` — corrigée dans le commit 21 (voir ci-dessous).

### Résilience du chat face aux cold starts

**Problème :** Si le backend redémarrait pendant qu'un utilisateur était sur une page de chat, les messages chargés disparaissaient — `isError` masquait tout le contenu dès qu'une requête échouait.

**Fix :**
- Retry automatique : 3 tentatives avec backoff exponentiel (1s, 2s, 4s) sur les requêtes de messages
- Non-destructif : les messages en cache restent visibles même en cas d'erreur réseau (`isError && msgs.length === 0` au lieu de `isError` seul)

---

## Incident — `e720c07` + `33967ad` (23 juillet) : Panne site — suppression de vercel.json

### Chronologie

- **17h00** — `vercel.json` supprimé dans un commit de nettoyage ("stale files")
- **17h24** — Première erreur 500 `MIDDLEWARE_INVOCATION_FAILED` sur southconnect.io
- **17h38** — Cause identifiée : `ReferenceError: __dirname is not defined` dans les logs Vercel
- **17h43** — `vercel.json` restauré à l'identique + `autoInstrumentMiddleware: false` ajouté dans `next.config.js`
- **17h50** — Site restauré

### Cause racine

`vercel.json` spécifiait `"framework": "nextjs"` et `"outputDirectory": ".next"`, verrouillant le pipeline de build Vercel pour ce monorepo. Sans ce fichier, Vercel a re-détecté le projet différemment, changeant le comportement de bundling du middleware Edge. Le plugin webpack Sentry (`withSentryConfig`) a injecté du code utilisant `__dirname` (API Node.js) dans le bundle V8 du middleware — qui n'en supporte pas.

### Actions correctives

1. `vercel.json` restauré à son contenu original
2. `autoInstrumentMiddleware: false` ajouté dans `next.config.js` — Sentry n'instrumente plus le middleware Edge (prévention future)
3. `vercel.json` ajouté à la liste des fichiers d'infrastructure protégés dans `CLAUDE.md`
4. Hook pre-push mis à jour pour bloquer la suppression des fichiers d'infrastructure critiques

**Durée de la panne :** ~19 minutes

---

## Commit 16 — `b3461d1` (23 juillet) : Fix — Migration P3009 (CREATE INDEX CONCURRENTLY)

### Blocage du déploiement Railway

**Symptôme :** `Error: P3009 migrate found failed migrations in the target database` au démarrage du backend Railway.

**Cause :** La migration `0016_users_indexes` utilisait `CREATE INDEX CONCURRENTLY` — une commande PostgreSQL incompatible avec les transactions. Or Prisma enveloppe chaque migration dans un `BEGIN/COMMIT`. PostgreSQL a rejeté la commande, laissant la migration en état `failed` dans `_prisma_migrations` — bloquant tous les déploiements suivants.

**Résolution :**
1. `CONCURRENTLY` retiré du SQL de la migration
2. Migration marquée manuellement via Supabase SQL Editor (`UPDATE _prisma_migrations SET finished_at = NOW()...`)
3. Redéploiement Railway — migration passée sans erreur

**Règle ajoutée à CLAUDE.md :** Ne jamais utiliser `CREATE INDEX CONCURRENTLY` dans une migration Prisma.

---

## Commit 17 — `90d7b1c` (23 juillet) : Sécurité — Garde-fous infra

### CLAUDE.md — Instructions permanentes pour Claude Code

Création de `CLAUDE.md` à la racine du dépôt, contenant :
- Liste des **fichiers d'infrastructure protégés** (vercel.json, railway.toml, next.config.js, middleware.ts, schema.prisma, main.ts)
- Règles : ne jamais qualifier un fichier de "stale" sans lire son contenu et comprendre son impact en production
- Stack technique documentée pour référence rapide

### Pre-push hook renforcé

`scripts/check-secrets.ts` enrichi avec `getDeletedFiles()` : le hook pre-push détecte maintenant les suppressions de fichiers d'infrastructure listés et bloque le push avec un message explicite.

---

## Commit 18 — `142ec79` (23 juillet) : Phase 2 — Soft-delete Opportunity + audit $transaction

### Soft-delete sur les opportunités

**Problème :** `opportunity.delete({ where: { id } })` était un hard DELETE avec CASCADE — suppression définitive et irréversible. En cas d'erreur (mauvais clic, bug UI), les données étaient perdues.

**Fix :**
- Ajout du champ `deletedAt DateTime?` dans le modèle `Opportunity` (schema.prisma)
- Migration `0017_opportunity_soft_delete` : `ALTER TABLE "opportunities" ADD COLUMN "deletedAt" TIMESTAMP(3)` + index
- `remove()` remplace `delete()` par `updateMany({ data: { deletedAt: new Date() } })`
- Filtre `deletedAt: null` ajouté sur **tous** les points d'entrée : `findAll`, `findByOwner`, `findOne`, `update`, `adminFindAll`, `adminUpdateStatus`

### Audit $transaction

Revue complète de la couverture transactionnelle :
- `applications.service.ts` → `submit()` : atomique via `updateMany` + filtre `stage: DRAFT` (race condition protégée) ✅
- `applications.service.ts` → counter updates : `$transaction([...])` fire-and-forget (cron nightly corrige le drift) ✅
- `auth.service.ts` → `register()` : création user + btoCProfile + notificationPreferences dans un seul `create()` imbriqué (atomique) ✅
- Counters dénormalisés : pattern fire-and-forget intentionnel partout, acceptable avec le cron de resync

---

## Commit 19 — `cc7baf3` (23 juillet) : Fix — Google OAuth OAUTH_FAILED définitif

### Cause racine de l'échec OAuth persistant

Même avec le `RedisStore` ajouté au commit 15, Google OAuth continuait d'échouer. L'investigation a révélé un problème de configuration Redis :

```js
// Avant (problème)
new Redis(redisUrl, { lazyConnect: true, enableOfflineQueue: false })
```

`lazyConnect: true` : le client ne se connecte pas au démarrage, seulement à la première commande.
`enableOfflineQueue: false` : si Redis n'est pas encore connecté, la commande échoue immédiatement (sans mise en file d'attente).

**Séquence d'échec :**
1. Première requête OAuth → express-session tente d'écrire la session dans Redis
2. Le client Redis est en mode "lazy", pas encore connecté
3. `enableOfflineQueue: false` → la commande SET échoue immédiatement
4. La session n'est pas persistée (silencieusement)
5. Google redirige → backend cherche la session → introuvable → state mismatch → `OAUTH_FAILED`

**Fix :**
```js
// Après (correct)
new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
```
Connexion immédiate au démarrage du serveur. La session OAuth est toujours persistée avant la redirection vers Google.

---

## État à la fin de la semaine W30

| Fonctionnalité / Correctif | Statut |
|---|---|
| Redis SCAN non-bloquant | ✅ Corrigé |
| Feed public filtre ACTIVE | ✅ Corrigé |
| Cache like/save synchronisé sur Explorer | ✅ Corrigé |
| État erreur page Sauvegardés | ✅ Corrigé |
| Filtres Explorer (Pays / Date / Remote) | ✅ Livré |
| Publication directe sans validation admin | ✅ Livré |
| Google OAuth → redirect propre au lieu de JSON 401 | ✅ Corrigé |
| Tâches liées aux opportunités (dashboard) | ✅ Livré |
| QueryKey collision tâches/dashboard | ✅ Corrigé |
| Gradient de couverture par type (19 types) | ✅ Livré |
| Bouton documentation Parrainage | ✅ Livré |
| Description forums ouverts affichée | ✅ Corrigé |
| adminDelete — anonymisation RGPD | ✅ Corrigé |
| Prisma P2023 → 400 Bad Request | ✅ Corrigé |
| Redis commandTimeout réduit à 2 s | ✅ Corrigé |
| findByOwner pagination { data, total, hasMore } | ✅ Corrigé |
| Email href escaping | ✅ Corrigé |
| Sentry couverture createInApp | ✅ Corrigé |
| Railway healthcheck `/ready` (trafic routé uniquement quand DB prête) | ✅ Corrigé |
| Compression gzip backend (réponses JSON ~70% plus légères) | ✅ Livré |
| socket.io-client sorti du bundle global → lazy-load async | ✅ Optimisé |
| TanStack Devtools exclus du bundle de production | ✅ Optimisé |
| Duplication messages chat | ✅ Corrigé |
| Analytics crash (TypeError filter) | ✅ Corrigé |
| Badge conversations privées non mis à jour | ✅ Corrigé |
| queryKeys centralisés (factory `qk`) — 42 fichiers migrés | ✅ Refactorisé |
| Redis session store pour OAuth | ✅ Livré |
| Chat résilient aux redémarrages (retry + cache non-destructif) | ✅ Corrigé |
| Incident vercel.json — site rétabli (19 min) | ✅ Résolu |
| Migration P3009 CONCURRENTLY — déploiement Railway débloqué | ✅ Résolu |
| CLAUDE.md + pre-push guard fichiers infra | ✅ Livré |
| Soft-delete Opportunity (migration 0017) | ✅ Livré |
| Audit $transaction coverage | ✅ Vérifié |
| Google OAuth OAUTH_FAILED — Redis connexion lazy corrigée | ✅ Corrigé |

---

## Semaine suivante (W31)

- Audit complet soft-delete : vérifier `search.service.ts`, `social.service.ts`, crons pour `deletedAt: null` sur Opportunity
- Rotation des secrets (Supabase, Google OAuth, Resend, Redis password) — actions manuelles en attente depuis W27
- Activation RLS Supabase (Row Level Security) — SQL à appliquer manuellement
- Révocation des JWT access tokens après logout/deleteMe (blacklist Redis) — chantier architectural différé
- Mettre à jour `DOCS_URL` dans `referral/page.tsx` quand la documentation Notion est prête
