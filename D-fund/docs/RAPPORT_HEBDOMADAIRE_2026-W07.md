
## 1. Nouvelles fonctionnalités principales

### 1.1 Création d’opportunités (backend + frontend)

- **Backend**
  - Endpoint `POST /api/v1/opportunities` finalisé :
    - Utilise `CreateOpportunityDto` pour valider les données côté serveur.
    - Attribue automatiquement l’`ownerId` à l’utilisateur authentifié.
    - Initialise le statut à `DRAFT` si aucun statut n’est fourni.
  - Endpoint `PUT /api/v1/opportunities/:id` :
    - Permet la mise à jour des champs principaux (nom, description, type, statut, localisation, tags, industries, markets, prix, etc.).
    - Vérifie que **seul le propriétaire** de l’opportunité peut la modifier.
  - Endpoint `DELETE /api/v1/opportunities/:id` :
    - Supprime une opportunité en vérifiant que l’appelant est bien owner.

- **Frontend**
  - Page `/opportunities/new` :
    - Formulaire complet avec choix du type (job, co‑founder, event, etc.).
    - Champs alignés sur les colonnes issues de Glide (nom, punchline, description, city, country, remote, tags, industries, markets, prix).
    - Création de l’opportunité en une requête, statut brouillon par défaut.

### 1.2 Mise à jour des profils (talents / entreprises)

- **Backend**
  - Endpoints:
    - `PUT /api/v1/profiles/bto-c/:userId` pour les profils talents.
    - `PUT /api/v1/profiles/bto-b/:userId` pour les profils entreprises.
  - Règles :
    - Le `JwtAuthGuard` protège ces routes.
    - Le serveur vérifie que l’`userId` dans l’URL correspond à l’utilisateur authentifié avant toute mise à jour.
  - Données gérées:
    - Talents: description, tags (skills), industries, markets, niveau de séniorité, préférences (remote, pays, régions).
    - Entreprises: nom, punchline, description, logo, site web, industrie, marché, niveau de maturité.

- **Frontend**
  - Page `/profile` :
    - Onglets **Basic Info**, **Individual Profile (BtoC)** et **Company Profile (BtoB)**.
    - Formulaires reliés aux endpoints `PUT /profiles/bto-c/:userId` et `PUT /profiles/bto-b/:userId`.
    - Affichage et édition cohérents avec les données migrées depuis Glide.

---

## 2. Qualité, sécurité et validation des données

- **Tests automatisés avec nettoyage des données de test**
  - Scripts de test backend capables de:
    - Créer des utilisateurs et opportunités de test.
    - Exécuter les workflows critiques (création d’opportunité, candidature, etc.).
    - Nettoyer automatiquement les enregistrements de test à la fin du scénario.

- **Protection par authentification JWT**
  - Les endpoints sensibles (création / édition / suppression d’opportunités, mise à jour de profils, workflow de candidatures) sont protégés par `JwtAuthGuard`.
  - Seules les routes publiques (ex. liste publique d’opportunités, listes talents / entreprises) sont accessibles sans token.

- **Validation de données systématique**
  - Tous les DTO utilisent `class-validator` et `class-transformer` pour contrôler les types, formats (dates, enums, tableaux) et champs obligatoires.
  - Le backend rejette les requêtes non valides avec des messages d’erreur explicites.

---

## 3. Endpoints API stabilisés cette semaine

- **Auth**
  - `POST /api/v1/auth/register` : inscription.
  - `POST /api/v1/auth/login` : connexion.
  - `GET /api/v1/auth/me` : informations de l’utilisateur connecté (protégé JWT).

- **Opportunities**
  - `GET /api/v1/opportunities` : liste publique avec recherche texte et filtres (type, statut, propriétaire si besoin).
  - `GET /api/v1/opportunities/:id` : détail d’une opportunité.
  - `GET /api/v1/opportunities/user/:userId` : opportunités créées par un utilisateur (utilisé pour le dashboard et “My opportunities”).
  - `POST /api/v1/opportunities` : création d’opportunité.
  - `PUT /api/v1/opportunities/:id` : mise à jour.
  - `DELETE /api/v1/opportunities/:id` : suppression par le propriétaire.

- **Applications**
  - `GET /api/v1/applications/opportunity/:id` : candidatures reçues pour une opportunité donnée (vue Owner).
  - `GET /api/v1/applications/user/:userId` : candidatures d’un utilisateur (vue Candidat).
  - `POST /api/v1/applications` : création d’une candidature (brouillon).
  - `PUT /api/v1/applications/:id` : mise à jour d’un brouillon par le candidat.
  - `POST /api/v1/applications/:id/submit` : soumission.
  - `PUT /api/v1/applications/:id/review` : review par le propriétaire, changement de statut et feedback.

- **Profiles**
  - `GET /api/v1/profiles/:userId` : profil complet (User + BtoCProfile/BtoBProfile).
  - `GET /api/v1/profiles/lists/talents` : liste publique des talents.
  - `GET /api/v1/profiles/lists/companies` : liste publique des entreprises.
  - `PUT /api/v1/profiles/bto-c/:userId` : mise à jour profil talent.
  - `PUT /api/v1/profiles/bto-b/:userId` : mise à jour profil entreprise.

- **Messages**
  - `GET /api/v1/messages/public/:discussionId` : messages d’une discussion publique.
  - `GET /api/v1/messages/private/:discussionId` : messages d’une discussion privée.

- **Users**
  - `GET /api/v1/users/:id` : récupération d’un utilisateur par son identifiant.

---

## 4. Corrections et stabilisation backend

- **Bug “Internal server error” à l’inscription corrigé**
  - Problème initial : conflit entre `@IsEnum(UserRole)` (DTO) et l’enum Prisma au runtime dans `RegisterDto`.
  - Solution:
    - Suppression de la dépendance directe au type Prisma dans le DTO.
    - Validation simplifiée du rôle côté DTO (string), puis cast explicite vers l’enum `UserRole` dans `AuthService`.
  - Résultat : l’inscription fonctionne de manière stable en environnement de développement comme en Docker.

- **Build backend et image Docker**
  - Correction de la configuration de build NestJS pour pointer vers `dist/main.js` comme entrypoint.
  - Reconstruction de l’image backend validée, prête pour les futurs déploiements sur Railway.

---

## 5. Prochaines étapes recommandées

- **Couvrir les workflows clés par des tests automatisés supplémentaires**
  - Au minimum : inscription / connexion, création d’opportunité, création & soumission de candidature, mise à jour de profil.

- **Brancher les notifications email (Resend) sur les événements métier**
  - Email de bienvenue.
  - Email au propriétaire lors d’une nouvelle candidature.
  - Email au candidat lors de la review / acceptation.

- **Continuer l’intégration frontend**
  - Finaliser les vues “Owner” (liste et détail des candidatures reçues, gestion des opportunités).
  - Harmoniser les messages d’erreur et les états vides sur toutes les pages (en particulier opportunités, candidatures, profils).

