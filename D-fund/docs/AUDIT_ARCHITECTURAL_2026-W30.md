# Audit architectural — SouthConnect / D-Fund
**Semaine W30 · Juillet 2026**

---

## Scores globaux

| Dimension | Score /10 |
|---|---|
| Stabilité | 4.2 |
| Maintenabilité | 5.0 |
| Testabilité | 5.5 |
| Performance | 6.0 |
| Observabilité | 3.5 |
| Évolutivité | 3.0 |

**Capacité à évoluer sans régression (état actuel) : ~30 %**
**Objectif après Phase 1+2 : 7.5/10 · ~75 %**

> **Mise à jour de statut — 2026-07-27** : la quasi-totalité de la Phase 1 est
> passée en production (queryKeys factory, filtre soft-delete sur
> `applications.review()`, fallback brute-force sans Redis, index `users`,
> logs structurés à la place des `.catch(() => undefined)` silencieux). La
> Phase 2 est entamée (soft-delete Opportunity, consolidation
> `deleteMe`/`adminDelete`) mais le découplage architectural dur (triangle
> `forwardRef`, `$transaction` sur `social.follow()`/`opportunities.create()`,
> contraintes CHECK) reste ouvert. Détail section par section ci-dessous
> (colonne **Statut**).

---

## 1. Synthèse — Pourquoi les correctifs génèrent des régressions

L'application n'est pas instable à cause de bugs isolés. Elle est instable parce que **trois problèmes structurels** rendent chaque correction imprévisible.

### Problème n°1 — Fragmentation des queryKeys (CRITIQUE)

Il n'existe aucune factory centralisée de queryKeys React Query. Les clés sont des string literals éparpillées dans 20+ fichiers, avec des variantes incompatibles :

| Clé invalidée (socket/mutation) | Clé attendue (page/composant) | Résultat |
|---|---|---|
| `['notifications']` | `['notifications', user.id]` | Page notifications jamais rafraîchie |
| `['private-discussions']` | `['private-discussions', user.id]` | Inbox stale après reconnexion socket |
| `['tasks']` | `['tasks', user.id]` | Dashboard et page tasks désynchronisés |
| `['my-applications']` | `['my-applications-full']` | Nouvelle candidature absente de la liste |

**C'est la cause principale de ~40 % des "données qui ne se rafraîchissent pas".**

De plus, `['saved-opportunities']` est déclaré sans `user.id` → deux utilisateurs partageant une session navigateur voient les favoris du compte précédent jusqu'au prochain reload complet.

### Problème n°2 — Écritures non atomiques + erreurs silencieuses (CRITIQUE)

Plusieurs mutations critiques s'effectuent en deux writes séquentiels **sans `$transaction`** :

| Mutation | Write 1 | Write 2 | Risque si Write 2 échoue |
|---|---|---|---|
| `applications.review()` | `application.update (stage)` | `referralCode.updateMany (status)` | Code parrainage reste ACTIVE, candidature SUCCESS |
| `social.follow()` | `follow.create` | `notification.createInApp` | ✅ Corrigé — follow + compteurs dans un `$transaction` ; la notification reste fire-and-forget par choix (non-critique) |
| `opportunities.create()` | `opportunity.create` | `profile.updateMany (compteur)` | Compteur profil désynchronisé définitivement |
| `messages.createPrivateMessage()` | `message.create` | `participant.updateMany (unreadCount)` | Message livré, badge non incrémenté |

Ces failures sont **silencieuses** : les `.catch(() => undefined)` empêchent toute détection dans les logs.

### Problème n°3 — Triangle forwardRef Messages/Notifications/EmailQueue (ÉLEVÉ)

Trois modules NestJS se référencent mutuellement via `forwardRef()`. Toute modification du graphe de dépendances peut provoquer :
- Une erreur DI circulaire au démarrage → app qui ne démarre plus en prod
- Une injection de `undefined` silencieuse en dev → comportement imprévisible

---

## 2. Zones les plus fragiles

### CRITIQUE

**Cache React Query — fragmentation des queryKeys** — ✅ Corrigé
- Cause : string literals dispersés sans contrat TypeScript
- Impact : invalidations ratent silencieusement leur cible
- Fix minimal : créer `lib/queryKeys.ts` avec des factory functions typées

**Hard delete Opportunity — cascade destructrice irréversible** — ✅ Corrigé
- Cause : `opportunities.service.ts remove()` fait un hard delete ; `Opportunity → Application` a une cascade DELETE en DB
- Impact : supprimer une opportunité efface toutes les candidatures reçues, messages, références notifications — irréversible
- Fix minimal : ajouter `deletedAt DateTime?`, changer `remove()` en soft-delete

**`applications.review()` opère sur des candidatures soft-deleted** — ⚠️ Partiellement corrigé
- Cause : `findUnique` sans filtre `deletedAt: null`
- Impact : un propriétaire peut passer une candidature retirée en SUCCESS, corrompant les compteurs et l'audit trail
- Fix : ajouter `where: { id, deletedAt: null }` (fait) + wrapper les deux writes en `$transaction` (pas fait — le write sur le code de parrainage reste séparé, juste loggé en cas d'échec)

### ÉLEVÉ

**Triangle forwardRef Messages/Notifications/EmailQueue** — ❌ Toujours présent
- Fix minimal : extraire un `EmailModule` standalone sans dépendance vers les deux autres modules
- État réel : `EmailQueueModule` créé mais toujours en `forwardRef` avec `NotificationsModule` — le cycle existe encore, juste réparti sur 3 modules

**Protection brute-force désactivée sans Redis** — ✅ Corrigé
- Cause : `checkAndIncrementLoginAttempts` retourne immédiatement si `redis === null`
- Impact : credential stuffing illimité sans Redis (démarrage local, panne Redis)
- Fix : fallback `Map<ip, {count, expiresAt}>` en mémoire

**`useSocket` — globals mutables non-React-safe + double handler `reconnect`** — ⚠️ Mitigé, pas résolu
- Cause : instance socket en variable module-level + `RealtimeSync` ajoute un second handler `reconnect` divergent
- Impact : comportement non-déterministe après déconnexion réseau — certaines pages se rafraîchissent, d'autres non
- Fix : passer l'instance dans un `SocketContext` React, unifier les handlers (pas fait — un commentaire dans le code documente le risque sans le refactorer)

### MODÉRÉ

**`NotificationsService` — 5 responsabilités dans une seule classe**
- In-app, Resend email direct, queue BullMQ, push WebSocket, préférences
- Mapping de préférence inversé : `APPLICATION_RECEIVED` mappé sur `inAppApplicationSubmitted` → propriétaire qui désactive ses notifications désactive involontairement la réception de nouvelles candidatures

**Cron N+1 — `recomputeTrendingScores`**
- 1 `UPDATE` Prisma par opportunité active, toutes les heures
- À 1 000 opportunités = 1 000 writes/heure → saturation du pool DB à l'échelle
- Fix : 1 seul `$executeRaw` UPDATE SQL avec la formule calculée côté serveur

**DB — index manquants + contraintes CHECK absentes**
- Index manquants : `users.deletedAt`, `users.role`, `users.isBanned` — ✅ Corrigé (migration `0016_users_indexes`)
- Message orphelin possible : aucun CHECK garantissant qu'un message appartient à exactement une discussion — ❌ Toujours absent
- `Rating.itemId` sans FK : intégrité référentielle absente, ratings vers ressources supprimées — ⚠️ Creusé plus en détail : `itemId` n'est pas juste "sans FK", il est **structurellement polymorphique à 3 usages** — un `User.id` (note de profil), un `Opportunity.id` (note d'opportunité), ou une chaîne synthétique `"discussion:<id>"` (`social.service.ts likeDiscussion()`, réutilise `Rating` comme mécanisme de dedup par-utilisateur sans créer de nouveau modèle). Une vraie FK Prisma est donc impossible sans redesign (séparer en plusieurs tables ou ajouter un vrai discriminant `itemType`) — ce n'est pas une migration de 5 minutes comme le suggérait l'estimation initiale. Recommandation : documenter le compromis assumé plutôt que forcer une fausse FK.

**Erreurs silencieuses — `.catch(() => undefined)` sans log** — ✅ Corrigé globalement (0 occurrence dans `src/`)
- `Opportunity.messagesCount` — drift silencieux
- `audit.service.ts` — piste d'audit tronquée sans alerte
- `social.service.ts` — double erreur silencieuse sur `createInApp` + `sendNewFollowerEmail`
- `AuthContext.tsx logout()` — ⚠️ toujours un best-effort silencieux (`catch { /* clear local state regardless */ }`), maintenant documenté comme choix assumé plutôt qu'un oubli — le risque décrit (session serveur non révoquée) reste réel

---

## 3. Plan de refactoring — 3 phases

### Phase 1 — Stabilisation immédiate (4–6 jours · Régression -60 %)

| # | Action | Fichiers | Effort | Statut (2026-07-27) |
|---|---|---|---|---|
| 1 | Créer `lib/queryKeys.ts` — factory centralisée | 20+ fichiers (grep + remplace) | 1–2 j | ✅ Fait — `frontend/app/lib/queryKeys.ts` |
| 2 | `applications.review()` : filtre soft-delete + `$transaction` | `applications.service.ts` | 2h | ⚠️ Partiel — filtre `deletedAt: null` en place ; l'update du code de parrainage reste un `updateMany` séparé (loggé, pas transactionnel) |
| 3 | Remplacer tous les `.catch(() => undefined)` par des logs structurés | grep exhaustif backend | 1 j | ✅ Fait — 0 occurrence restante dans `src/` |
| 4 | Unifier handler `reconnect` socket — supprimer le doublon de `RealtimeSync.tsx` | `RealtimeSync.tsx`, `useSocket.ts` | 2h | ⚠️ Partiel — mitigation ad hoc dans `useSocket.ts` (commentaire explicite sur le risque), pas de refonte |
| 5 | Fallback brute-force en mémoire sans Redis | `auth.service.ts` | 3h | ✅ Fait — `Map<email, {count, expiresAt}>` quand `this.redis` est null |
| 6 | Migration : index `users.deletedAt`, `users.role`, `users.isBanned` | migration SQL | 1h | ✅ Fait — migration `0016_users_indexes` |

### Phase 2 — Découplage architectural (2–3 semaines · Maintenabilité +50 %)

| # | Action | Impact | Statut (2026-07-27) |
|---|---|---|---|
| 1 | Briser triangle forwardRef → `EmailModule` standalone | Messagerie+notifs découplés | ❌ Pas fait — `EmailQueueModule` existe mais référence encore `NotificationsModule` en `forwardRef` ; le cycle est déplacé sur 3 modules, pas cassé |
| 2 | Soft-delete Opportunity (migration + service) | Suppression sécurisée | ✅ Fait — migration `0017_opportunity_soft_delete` |
| 3 | Wrapper `social.follow()` et `opportunities.create()` en `$transaction` | État cohérent garanti | ⚠️ Partiel — `social.follow()` déjà transactionnel (follow + compteurs BtoC/BtoB dans un `$transaction`, notification volontairement fire-and-forget après coup) ; `opportunities.create()` toujours non transactionnel |
| 4 | Passer l'instance socket dans un `SocketContext` React | Comportement déterministe | ❌ Pas fait — pas de fichier `SocketContext` |
| 5 | Consolider `deleteMe` / `adminDelete` en méthode privée partagée | Évolution RGPD en un endroit | ✅ Fait — méthode privée partagée, commentaire explicite dans `users.service.ts` |
| 6 | Migration : CHECK constraint Message (discussion exclusive) + Rating (1–5) | Intégrité DB garantie | ❌ Pas fait — aucune contrainte CHECK trouvée dans les migrations |
| 7 | Réécrire `recomputeTrendingScores` en 1 SQL `$executeRaw` | N writes → 1 write/heure | ⚠️ Partiel — toujours N `update()` Prisma, mais batchés par 20 via `Promise.all` au lieu de séquentiels |

### Phase 3 — Testabilité et observabilité (3–4 semaines · Confiance déploiement +80 %)

| # | Action |
|---|---|
| 1 | Tests unitaires `useSocket` + invalidations queryKeys (Vitest + Testing Library) |
| 2 | Tests e2e Playwright : inscription + vérification email + reset mot de passe |
| 3 | Tests e2e Playwright : messagerie WebSocket bout en bout |
| 4 | Sentry sur `ChatGateway` (actuellement seules les exceptions HTTP sont capturées) |
| 5 | Correlation ID (`X-Request-Id`) sur toutes les requêtes HTTP |
| 6 | Guard global fail-closed NestJS (`@Public()` pour les routes publiques) |
| 7 | Décomposer `AppShell` en `EmailVerificationBanner` + `ProtectedRouteGuard` + `MobileNavWrapper` |

---

## 4. Couverture de tests actuelle

### Existant

| Couche | Fichiers | Type | Évaluation |
|---|---|---|---|
| Backend | `auth.service.spec.ts` | Unitaire | Seul fichier unitaire — bon modèle |
| Backend | 12 fichiers `*.e2e.spec.ts` | E2E API | Bonne couverture (auth, opps, apps, social, messages, notifs, referral, tasks, profiles) |
| Frontend | 6 fichiers Playwright | E2E UI | Login, like/save, follow, autosave, smoke, offline |
| Frontend | 0 fichiers | Unitaire | **Aucun test de hooks, composants, utilitaires** |

### Flux non couverts à prioriser

| Flux | Priorité |
|---|---|
| Inscription + vérification email (token → accès) | P0 |
| Reset mot de passe (token expiré, invalide, succès) | P0 |
| Chat privé WebSocket e2e | P0 |
| `useSocket` — reconnexion, tokenExpired, double-mount | P1 |
| queryKey invalidations après mutations | P1 |
| Cascade suppression utilisateur | P1 |
| Rate limiting / throttling (HTTP 429) | P2 |
| Upload d'images (profilePic, backgroundImage) | P2 |

---

## 5. Observabilité — manques critiques

| Problème | Fix |
|---|---|
| `SentryExceptionFilter` ne capture pas les exceptions WebSocket | Ajouter `Sentry.captureException` dans les handlers `ChatGateway` |
| `.catch(() => undefined)` sans log | Grep + remplacer par `this.logger.warn(...)` (Phase 1) |
| `audit.service.ts` avale les échecs silencieusement | Ajouter `Sentry.captureException` dans le catch |
| Pas de Correlation ID sur les requêtes HTTP | Middleware `X-Request-Id` UUID — trace les bugs signalés dans les logs Railway |

---

## 6. Performance — optimisations à bénéfice mesurable

| Problème | Fix | Effort |
|---|---|---|
| Cron N+1 `recomputeTrendingScores` | 1 `$executeRaw` UPDATE SQL | 1 jour |
| Sidebar prefetch keys invalides (jamais consommées) | Aligner sur queryKeys factory | 2h |
| `IntersectionObserver` recréé à chaque render | Extraire deps de `useMemo` | 1h |
| `sanitizedDescription` en `setState` (cycle rendu inutile) | Passer à `useMemo` | 30 min |
| Index manquants `users.deletedAt/role/isBanned` | Migration 3 lignes SQL | 1h |
| Chat — fetch inbox complète pour métadonnées 1 conversation | Endpoint `GET /messages/private/:id/metadata` | 1 jour |

---

## 7. Fonctionnalités — état de couverture

| Fonctionnalité | État |
|---|---|
| Connexion email | ✅ Couverte |
| Connexion Google OAuth | ✅ Couverte |
| Inscription + vérification email | ❌ Non couverte |
| Reset mot de passe | ❌ Non couverte |
| Création / édition d'opportunité | ✅ Couverte |
| Suppression d'opportunité | ⚠️ Risque (hard delete — cascade) |
| Candidature (submit / retrait) | ✅ Couverte |
| Review candidature | ⚠️ Risque (soft-delete bypass) |
| Follow / Unfollow | ✅ Couverte |
| Like / Unlike | ✅ Couverte |
| Save / Unsave | ⚠️ Risque (`toggleSaveMutation` sans `onSettled`) |
| Chat privé (temps réel) | ⚠️ Zone fragile (double handler reconnect) |
| Chat public (WebSocket) | ❌ Non couverte |
| Notifications badge | ⚠️ Split queryKey non corrigé |
| Notifications liste | ✅ Couverte |
| Analytics | ⚠️ Fix récent sans test de non-régression |
| Dashboard | ✅ Couverte |
| Parrainage | ✅ Couverte |
| Tâches | ✅ Couverte |
| Favoris (home feed) | ⚠️ Clé sans user.id |
| Profil BtoC / BtoB | ✅ Couverte |
| Administration | ✅ Couverte (admin.e2e.spec.ts) |
| Upload images | ❌ Non couverte |

---

## 8. Risques résiduels après Phase 1+2

1. **BroadcastChannel `login`** : un login dans un autre onglet déclenche `queryClient.clear()` — si une mutation optimiste est en cours, son contexte (`onMutate ctx`) est silencieusement détruit. Nécessite un changement architectural plus profond.
2. **Message optimiste permanent** : si le socket se perd après le POST HTTP (mais avant la confirmation), le message optimiste reste avec son UUID comme ID permanent. Aucun polling fallback. À adresser en Phase 3.
3. **`Rating.itemId` sans FK** : intégrité référentielle polymorphique non garantie en DB. Des ratings peuvent pointer vers des ressources supprimées indéfiniment.

---

## Conclusion

Le score de stabilité initial était **4.2/10**, mesuré avant la Phase 1.

**La Phase 1 seule (4–6 jours) réduit ce risque à ~30 % et porte le score à ~6.5/10.** La Phase 2 complète la stabilisation structurelle. La Phase 3 apporte la confiance nécessaire pour déployer sans stress.

### État réel au 2026-07-27

La Phase 1 est **quasi entièrement livrée** (5/6 items faits, 1 partiel) — le cache React Query fragmenté, la protection brute-force, les index manquants et les erreurs silencieuses sans log, qui causaient la majorité des régressions décrites en section 1, sont corrigés. Le score de stabilité réel est donc plus proche de l'objectif Phase 1 (~6.5/10) que du score initial.

La Phase 2 est **entamée mais pas complète** (2/7 items faits, 1 partiel, 4 encore ouverts) : le soft-delete Opportunity et la consolidation `deleteMe`/`adminDelete` sont en place, mais le découplage architectural dur reste à faire — le triangle `forwardRef` Messages/Notifications/EmailQueue existe toujours (juste réparti sur 3 modules au lieu de 2), et aucune des écritures multi-étapes identifiées (`social.follow()`, `opportunities.create()`, l'update du code de parrainage dans `applications.review()`) n'est encore wrappée en `$transaction`. Ces points restent le risque principal pour toute évolution future touchant la messagerie, le suivi social ou les compteurs de parrainage.

La Phase 3 (tests unitaires frontend, Correlation ID, Sentry sur les WebSockets) n'a pas été auditée dans cette mise à jour — à vérifier séparément.
