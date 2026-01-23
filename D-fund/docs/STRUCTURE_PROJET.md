# Structure du projet (explication non technique)

## Objectif

Ce document explique, en termes simples, à quoi servent les dossiers du projet et pourquoi ils existent. Il est destiné aux personnes non techniques.

---

## Dossiers principaux

### `app/`

**Ce que c'est** : La partie visible de l'application (le site web que l'on voit dans le navigateur).

**Pourquoi il existe** : C'est ici que se trouvent les pages, la navigation et l'interface utilisateur.

**Exemples de contenu** :
- Pages publiques (accueil, ressources, login, register)
- Styles globaux et layout général

---

### `backend/`

**Ce que c'est** : Le « moteur » du projet. Il reçoit les demandes du site web et répond avec les données.

**Pourquoi il existe** : Séparer le site (frontend) du moteur (backend) permet de mieux sécuriser, faire évoluer, et maintenir l'application.

**Exemples de contenu** :
- Modules pour l'authentification, opportunités, profils, messages
- Connexion à la base de données

---

### `components/`

**Ce que c'est** : Les blocs d'interface réutilisables (cartes, menus, etc.).

**Pourquoi il existe** : Eviter de refaire le même design plusieurs fois, garder une interface cohérente.

**Exemples de contenu** :
- Cartes pour talents, mentors, investisseurs
- Barre de navigation, footer

---

### `data/`

**Ce que c'est** : Un espace d'archivage pour les données historiques (ex : exports Glide).

**Pourquoi il existe** : Conserver une copie des anciennes données pour référence, sans les exposer dans l'application.

**Important** : Ces fichiers ne sont pas la source de vérité. La base officielle est Supabase/PostgreSQL.

---

### `docs/`

**Ce que c'est** : Toute la documentation du projet.

**Pourquoi il existe** : Expliquer l'architecture, les décisions, la migration et les règles de travail.

**Exemples de contenu** :
- Rapport final
- Modélisation des données
- Parcours utilisateurs
- Stratégie de migration

---

### `glide/`

**Ce que c'est** : Les captures d'écran et éléments visuels issus de Glide.

**Pourquoi il existe** : Servent de référence produit et de mémoire visuelle pour l'équipe.

---

### `lib/`

**Ce que c'est** : Fonctions utilitaires ou bibliothèques partagées (si nécessaire).

**Pourquoi il existe** : Centraliser les fonctions communes réutilisées dans plusieurs endroits.

---

### `prisma/`

**Ce que c'est** : La définition technique de la base de données.

**Pourquoi il existe** : Garantir une base propre et structurée, et permettre les migrations.

**Exemples de contenu** :
- `schema.prisma` (structure des tables)
- `seed.ts` (données initiales si besoin)

---

### `scripts/`

**Ce que c'est** : Scripts techniques ponctuels (ex : migration de données).

**Pourquoi il existe** : Automatiser des tâches qui ne font pas partie du site ou du backend.

**Exemple de contenu** :
- `migrate.ts` (migration Glide → Supabase)

---

### `node_modules/`

**Ce que c'est** : Les dépendances techniques installées automatiquement.

**Pourquoi il existe** : C'est la « boîte à outils » du projet. Ce dossier est généré et n'est pas modifié manuellement.

---

## Fichiers importants à la racine

- `README.md` : le guide principal du projet
- `ARCHITECTURE.md` : explication globale de l'architecture
- `SUPABASE_SETUP.md` : guide pour configurer Supabase
- `package.json` : liste des dépendances et scripts d'installation
- `next.config.js`, `tailwind.config.js` : configuration du site web

---

## Résumé simple

- **`app/`** : ce que l'utilisateur voit
- **`backend/`** : le moteur qui répond aux demandes
- **`docs/`** : la documentation officielle
- **`data/`** : archives de données
- **`glide/`** : captures d'écran d'origine

Ce découpage est standard dans les projets modernes et facilite la maintenance, la collaboration et la sécurité.
