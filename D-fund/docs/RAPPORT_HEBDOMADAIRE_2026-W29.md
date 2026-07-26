# Rapport hebdomadaire — Semaine W29 (13 – 17 juillet 2026)

## Résumé

**Semaine d'amélioration produit et de performance.** Focus sur l'expérience utilisateur, le référencement, la rétention des nouveaux utilisateurs et la résolution d'un bug de connexion intermittente à la base de données. 4 commits pushés en production.

---

## Commit 1 — `afbf6d1` (13 juillet) : UX, PWA, SEO, skeletons, prefetch

### PWA — Application installable sur mobile
- Création du `manifest.webmanifest` via `app/manifest.ts` (Next.js 14 natif)
- Icône SVG SouthConnect ajoutée dans `public/icon.svg`
- `viewport.themeColor` configuré → barre de statut bleue sur mobile
- L'app est désormais installable sur iOS et Android comme une app native

### Top loader
- Ajout de `nextjs-toploader` : barre de progression bleue (#3b49df) affichée en haut de l'écran à chaque changement de page — feedback immédiat pour l'utilisateur

### Skeleton loaders
Création de fichiers `loading.tsx` sur toutes les pages principales (Next.js App Router — Suspense automatique) :
- `app/loading.tsx` — Accueil
- `app/explore/loading.tsx` — Explorer (chips + grille de cards)
- `app/my-opportunities/loading.tsx`
- `app/saved/loading.tsx`
- `app/search/loading.tsx`
- `app/opportunities/[id]/loading.tsx`

### Error boundaries
Création de fichiers `error.tsx` sur les pages critiques avec capture Sentry + bouton "Réessayer" :
- `app/explore/error.tsx`
- `app/my-opportunities/error.tsx`
- `app/saved/error.tsx`
- `app/search/error.tsx`

### SEO — Métadonnées dynamiques
- `app/layout.tsx` : metadata globale (title template, description, OG image par défaut, Apple Web App)
- `app/opportunities/[id]/layout.tsx` : `generateMetadata` dynamique — chaque opportunité a son propre `<title>`, description, OG image et Twitter Card
- Layouts metadata pour les pages client-only : `explore/layout.tsx`, `community/layout.tsx`, `search/layout.tsx`, `saved/layout.tsx`
- **Canonical URL** sur chaque page opportunité pour éviter le duplicate content Google

### OG Images dynamiques
- `app/og/route.tsx` : Edge Function générant des images 1200×630 au format PNG
- Chaque opportunité partagée sur WhatsApp/LinkedIn/Twitter affiche une image avec son titre, type et créateur
- Runtime : `edge` (exécution côté Vercel, latence < 50 ms)

### Sitemap dynamique
- `app/sitemap.ts` : crawle toutes les opportunités actives via cursor pagination
- Revalidé toutes les heures — Google peut indexer les nouvelles opportunités dans la journée

### Prefetch on hover
- `components/OpportunityCard.tsx` : `queryClient.prefetchQuery` au survol d'une card
- Les données de la page détail sont pré-chargées en cache avant le clic → navigation instantanée perçue

### Fix images cassées
- `app/search/page.tsx` + `app/my-opportunities/page.tsx` : `<Image>` remplacés par `<Avatar>` (gestion `onError` + fallback initiale)

### Auth résilience
- `app/lib/api.ts` : `RefreshResult` discriminated union (`'ok' | 'expired' | 'server-error'`) — pas de déconnexion sur blip Redis ou erreur réseau transitoire
- `app/lib/AuthContext.tsx` : broadcast `'login'` après refresh silencieux → synchronisation multi-onglets après rotation de token

---

## Commit 2 — `998d46c` (15 juillet) : Analytics, emails, onboarding, infinite scroll

### Vercel Analytics
- Ajout de `@vercel/analytics` dans `app/layout.tsx`
- Suivi des pages vues, sources de trafic, pays, appareils — 0 cookie, 0 bannière RGPD
- Données visibles directement dans le dashboard Vercel

### Templates email redesignés
- Création d'un helper `emailLayout()` dans `notifications.service.ts` : enveloppe HTML branded (header bleu #3b49df, boutons CTA, typographie cohérente)
- Application sur tous les emails transactionnels : vérification, bienvenue, candidature, acceptation, nouveau message, nouveau follower, reset mot de passe, sécurité
- Bouton `btn()` réutilisable pour les CTA

### Email rejection manquant — corrigé
- **Bug** : la préférence `emailOpportunityRejected` existait mais la méthode `sendOpportunityRejectedEmail` n'était pas implémentée → les propriétaires ne recevaient jamais d'email quand leur opportunité était refusée
- **Fix** : ajout de la méthode + câblage dans `opportunities.service.ts` au moment du changement de statut vers ARCHIVED/CLOSED

### Wizard d'onboarding
- Création de `app/onboarding/page.tsx` : wizard 3 étapes pour les nouveaux inscrits
  - Étape 1 : type de profil (Entrepreneur / Professionnel / Étudiant / Investisseur)
  - Étape 2 : localisation (pays + ville) via liste de 40+ pays
  - Étape 3 : bio + LinkedIn (optionnels)
- Barre de progression visuelle (step X/3)
- "Passer" disponible à chaque étape — pas de blocage
- À la fin : PATCH `/users/me` avec les données collectées → redirection vers Explorer
- `app/register/page.tsx` : redirection post-inscription vers `/onboarding` (au lieu de `/profile?onboarding=true`)
- `components/AppShell.tsx` : `/onboarding` ajouté aux chemins sans sidebar/navbar

### Infinite scroll sur Explorer
- `app/explore/page.tsx` : `useQuery` → `useInfiniteQuery` avec cursor pagination
- `IntersectionObserver` sur une div sentinelle invisible en bas de page → chargement automatique à 200px du bas
- Skeleton de 3 cards supplémentaires pendant le chargement des pages suivantes
- Suppression du bouton "Page suivante" — scroll naturel comme Instagram/LinkedIn

---

## Commits 3 & 4 — `588c1d4` + `bb3d5a3` (17 juillet) : Fix feed vide + keep-alive DB

### Bug : feed principal affichait "Aucune opportunité" par intermittence

**Symptôme :** À la connexion, l'accueil montrait parfois un feed vide alors que des opportunités actives existaient.

**Cause 1 — Absence de filtre `status=ACTIVE`** : La requête appelait `/opportunities` sans filtre de statut. Le backend excluait uniquement les DRAFT, mais des PENDING/ARCHIVED pouvaient être inclus ou exclus selon l'état du cache Redis (TTL 45 s), créant des incohérences intermittentes.

**Fix** : Ajout de `status=ACTIVE` explicite sur la requête `useInfiniteQuery` du feed principal → seules les opportunités approuvées et publiées sont affichées.

**Cause 2 — `isError` non géré** : Quand l'API échouait (timeout, redémarrage Railway), `pages` était `undefined`, `allItems` devenait `[]`, et le message "Aucune opportunité" s'affichait au lieu d'une erreur — l'utilisateur ne savait pas si c'était un bug ou un feed réellement vide.

**Fix** : Ajout de `isError` + bouton "Réessayer" distinctif. `retry: 2` pour réduire l'attente avant d'afficher l'erreur.

### Bug : connexion Prisma/Redis fermée après inactivité

**Symptôme :** Première requête après une longue pause (30+ min) prenait 10-20 secondes — ressemblait à une mise en veille Railway mais c'était un timeout de connexion Supabase.

**Cause** : Supabase ferme les connexions idle après ~5 min. La reconnexion Prisma au premier appel réel prenait 10-20 s, dépassant le timeout de 15 s du frontend.

**Fix** : Ajout d'un job `keepAlive()` dans `CronService` (`*/5 * * * *`) :
- `prisma.$queryRaw\`SELECT 1\`` — maintient la connexion Prisma/Supabase vivante
- `redis.ping()` — maintient la connexion Redis vivante
- Coût : < 1 ms toutes les 5 minutes, 0 impact sur les performances

---

## État à la fin de la semaine W29

| Fonctionnalité | Statut |
|---|---|
| PWA installable sur mobile | ✅ Livré |
| Top loader navigation | ✅ Livré |
| Skeleton loaders (6 pages) | ✅ Livré |
| Error boundaries (5 pages) | ✅ Livré |
| SEO + canonical URL | ✅ Livré |
| OG images dynamiques | ✅ Livré |
| Sitemap dynamique | ✅ Livré |
| Prefetch on hover | ✅ Livré |
| Vercel Analytics | ✅ Livré |
| Templates email brandés | ✅ Livré |
| Email rejet d'opportunité | ✅ Corrigé |
| Wizard onboarding 3 étapes | ✅ Livré |
| Infinite scroll sur Explorer | ✅ Livré |
| Fix feed vide intermittent | ✅ Corrigé |
| Keep-alive Prisma + Redis | ✅ Livré |

---

## Semaine suivante (W30)

- Vérifier en prod que le feed ne s'affiche plus vide après une longue pause (keep-alive actif)
- Rotation des secrets (Supabase, Google OAuth, Resend) + activation RLS Supabase — actions manuelles en attente depuis W27
- Rate limiting frontend sur les formulaires critiques (candidature, inscription)
- Envisager upgrade Railway Hobby ($5/mois) si problème de mise en veille persiste
