# Sprint W34 (14 – 20 août 2026) — Plan de la semaine

## Bilan express de la semaine dernière (clos, pour contexte)

Écrans de chargement finis à 100 %, CI Backend verte pour la première fois, tests ajoutés sur les parcours mot de passe oublié / confirmation email, découpage d'`AppShell`, bug de synchronisation multi-onglet corrigé, documentation technique vérifiée créée. Un problème d'affichage mobile trouvé et corrigé en deux temps : d'abord un débordement visible sur 6 pages, puis — suite à un nouveau retour utilisateur le lendemain — un second problème plus sournois sur 2 pages (profil, parrainage) où du contenu était rendu invisible par un cadre qui masque tout dépassement, sans provoquer de débordement détectable automatiquement. Ce sprint ne revient pas dessus — il part de cette base.

**Méthode de préparation de ce sprint** : les chantiers ci-dessous viennent d'un audit direct — `npm audit` lancé en live, inventaire réel des fichiers de test du repo, et lecture de l'historique des commits (pas de la documentation, jugée pas toujours à jour). Deux corrections trouvées en creusant, détaillées plus bas.

---

## Chantier A — Dépendances vulnérables (19 trouvées, jamais scannées automatiquement)

`npm audit` (lancé en direct, pas déduit d'un document) révèle 3 failles côté backend et 16 côté frontend, dont plusieurs à sévérité haute :
- `socket.io-parser` et `ws` — déni de service par épuisement mémoire, directement pertinent puisque l'app a un chat temps réel actif.
- `dompurify` — lié à la protection XSS.
- `brace-expansion`, `nanoid`, `fast-uri`, `@sentry/nextjs`/`@sentry/node`, `js-yaml` (backend), et d'autres dépendances transitives.

**17 des 19 se corrigent sans breaking change** (`npm audit fix`, backend + frontend). Vérifié qu'aucune version de `socket.io` n'est intentionnellement figée pour compatibilité (`^4.8.3`, plage normale) — pas de risque connu à laisser `npm` remonter la version transitive. Les 2 dernières vulnérabilités (`next`, `postcss`) nécessitent un passage à Next.js 16 — changement majeur, **volontairement pas dans ce sprint**, à traiter dans une session dédiée avec son propre plan de test.

Livrable :
1. `npm audit fix` backend + frontend.
2. Vérification complète (tsc, lint, tests, build) + test manuel ciblé du chat (socket.io est directement touché par le correctif).
3. Ajout d'un step `npm audit --audit-level=high` dans la CI pour que ces failles ne s'accumulent plus silencieusement comme cette fois-ci.

---

## Chantier B — Combler les trous de couverture de tests les plus risqués

Constat mesuré dans l'historique git, pas supposé : sur les 90 derniers jours, **60 commits `fix` contre seulement 6 qui touchent un fichier de test** (`git log --since="90 days ago"`). Un déséquilibre structurel réel entre "corriger quand ça casse" et "empêcher que ça recasse".

Trois modules backend ont **zéro test** aujourd'hui, identifiés comme les plus à risque parmi tous les modules non couverts :

- **`users`** — la désanonymisation RGPD (`deleteMe` / `adminDelete` / export de données, RGPD art. 17 et 20) n'a aucun test. Le code est propre (un seul chemin partagé, bien commenté), mais rien n'empêcherait aujourd'hui une régression silencieuse future — par exemple un nouveau champ ajouté au modèle `User` et oublié dans l'anonymisation.
- **`cron`** — 527 lignes, verrou distribué Redis fait maison pour empêcher la double exécution d'une tâche planifiée sur plusieurs instances. Ce type de bug ne se manifeste qu'en production à plusieurs instances — invisible en local, donc particulièrement dangereux sans filet de test.
- **`storage`** — les vérifications d'autorisation sur upload/suppression de fichiers (plusieurs branches selon le type de ressource : avatar, opportunité, pièce jointe) sont bien pensées mais totalement non testées.

**Vérifié pour éviter une fausse piste** : `opportunities.service.ts` est le fichier le plus modifié du repo sur 90 jours (13 fois), avec un vrai historique de bugs corrigés (écritures non-atomiques, pagination RGPD, rate-limiting). Mais il a déjà 48 tests (`opportunities.e2e.spec.ts` + `admin.e2e.spec.ts`) — pas un trou, donc pas ajouté à ce sprint malgré le churn élevé.

Modules à zéro test jugés plus simples / moins risqués et **volontairement pas dans ce sprint** : `search`, `email`, `ai`, `ratings`, `audit`, `industries`, `markets`, `features`, `feedback`.

---

## Chantier C — CI : confirmer que le vert reste vert quand ça compte

**Précision suite à l'échange** : côté GitHub Actions, tout est actuellement vert — confirmé. Le point n'est donc pas "la CI est cassée", elle ne l'est pas. Le point resté ouvert : si elle repassait au rouge demain (un test qui casse, un lint qui échoue), **rien n'empêche aujourd'hui Railway/Vercel de déployer quand même**, puisque les deux plateformes redéploient sur chaque push vers `main` indépendamment du résultat de la CI (vérifié dans `railway.toml` et `vercel.json` — aucune condition liée à la CI). Le réglage qui bloquerait ça se trouve côté paramètres GitHub (branch protection / required status checks), pas dans le repo — je n'ai pas pu le consulter directement d'ici (pas d'accès `gh`/API depuis cet environnement), donc à vérifier ensemble plutôt que supposé.

Décision à prendre ensemble, pas unilatérale : veut-on rendre ce garde-fou actif (la CI bloque le déploiement si elle est rouge) ? Impact réel sur le workflow si jamais un déploiement urgent doit sortir malgré un test flaky. Prévu en fin de sprint, une fois les chantiers A et B stabilisés (pas juste avant d'y toucher).

---

## Explicitement pas cette semaine

- **Migration Next.js 14 → 16** — nécessaire pour corriger les 2 dernières vulnérabilités (PostCSS), mais changement majeur qui mérite sa propre session et son propre plan de test, pas glissé dans un sprint de sécurité/fiabilité.
- **Refactor `forwardRef` Messages ↔ Notifications** — **précision trouvée en creusant les commits (pas dans la doc)** : ce n'est plus un cycle à 3 (Messages↔Notifications↔Email), un refactor du 29 juillet (`edbcf81`, déjà mergé sur `main`, testé 43/43 à l'époque) a proprement extrait `EmailModule` et éliminé 2 des 3 dépendances circulaires. Il ne reste qu'**1 edge** (Messages↔Notifications), déjà atténué par une injection `@Optional()` — donc un problème plus petit et plus stable que ce que les rapports récents laissaient penser. Toujours pas un bug actif, toujours pas dans ce sprint, mais la doc technique sera corrigée pour refléter le travail déjà fait.

---

## En arrière-plan

- **Surveillance Sentry** — confirmer que le crash Notifications (très probablement résolu la semaine dernière) ne réapparaît pas.
- Les 2 incohérences mineures de version d'outils (Prisma racine vs backend, Node CI vs prod) — à corriger seulement si elles causent un jour un vrai problème.

---

## Résumé pour le point

Semaine orientée sécurité et fiabilité, construite sur un audit direct du code et des commits — pas sur la documentation existante, dont deux imprécisions ont d'ailleurs été trouvées et corrigées au passage (le forwardRef a déjà été partiellement traité en juillet ; le statut exact de la CI ne pouvait pas être confirmé de bout en bout depuis cet environnement). Trois chantiers : correction de 17 vulnérabilités de dépendances sans breaking change, comblement des 3 trous de couverture de tests les plus risqués (RGPD, verrou distribué, autorisations de fichiers), et une décision à prendre ensemble sur le blocage de déploiement en cas de CI rouge — sujet clarifié : la CI est verte aujourd'hui, il s'agit seulement de décider ce qui se passerait si elle ne l'était plus.
