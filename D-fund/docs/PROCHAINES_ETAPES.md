# Prochaines Étapes - Développement V1

## Objectif

Compléter l'implémentation des fonctionnalités V1 validées dans la phase pré-code. Prioriser les features indispensables pour avoir une version fonctionnelle de la plateforme D-Fund.

---

## Priorité 1 : Compléter les modules backend V1

### 1.1 Module Opportunities

**État actuel** : Endpoints GET de base existants

**À implémenter** :

- **POST /opportunities** : Création d'opportunité
  - Validation des données (DTO)
  - Création avec ownerId (utilisateur authentifié)
  - Support des statuts DRAFT/ACTIVE
  - Gestion des images/files (Supabase Storage)

- **PUT /opportunities/:id** : Modification d'opportunité
  - Vérification des permissions (seul le owner peut modifier)
  - Validation des données
  - Gestion des images/files

- **DELETE /opportunities/:id** : Suppression d'opportunité
  - Vérification des permissions
  - Soft delete ou hard delete selon besoin

- **GET /opportunities** : Amélioration de la liste
  - Filtres par type, industrie, marché, statut
  - Recherche par texte (nom, description)
  - Pagination
  - Tri (date, popularité)

- **GET /opportunities/user/:userId** : Opportunités d'un utilisateur
  - Liste des opportunités créées par un user
  - Filtres par statut

**Livrables** :
- DTOs complets (CreateOpportunityDto, UpdateOpportunityDto)
- Service avec toutes les méthodes métier
- Controller avec guards et validation
- Tests unitaires de base

---

### 1.2 Module Applications

**État actuel** : Endpoints GET de base existants

**À implémenter** :

- **POST /applications** : Création de candidature
  - Validation (opportunityId, userId, goalLetter)
  - Création en statut DRAFT par défaut
  - Vérification que l'utilisateur n'a pas déjà postulé

- **PUT /applications/:id** : Modification de candidature
  - Seulement si statut DRAFT
  - Vérification des permissions (seul le candidat peut modifier)

- **POST /applications/:id/submit** : Soumission de candidature
  - Passage DRAFT → SUBMITTED
  - Notification à l'owner (voir 1.5)

- **PUT /applications/:id/review** : Review par owner
  - Ajout de feedback
  - Changement de statut (SUBMITTED → SUCCESS/ARCHIVED)
  - Notification au candidat (voir 1.5)
  - Vérification des permissions (seul le owner peut review)

- **GET /applications/user/:userId** : Amélioration
  - Filtres par statut
  - Pagination

**Livrables** :
- DTOs complets (CreateApplicationDto, UpdateApplicationDto, ReviewApplicationDto)
- Service avec workflow de candidature
- Controller avec guards
- Tests unitaires

---

### 1.3 Module Profiles

**État actuel** : Endpoints GET de base (talents, companies)

**À implémenter** :

- **GET /profiles/:userId** : Profil complet d'un utilisateur
  - Retourne User + BtoCProfile ou BtoBProfile selon le cas
  - Inclut les statistiques (opportunitiesCount, followersCount, etc.)

- **PUT /profiles/bto-c/:id** : Mise à jour profil BtoC
  - Vérification des permissions (seul le user peut modifier son profil)
  - Validation des données
  - Mise à jour des compétences, industries, markets, etc.

- **PUT /profiles/bto-b/:id** : Mise à jour profil BtoB
  - Vérification des permissions
  - Validation des données
  - Gestion du logo/header (Supabase Storage)

- **POST /profiles/bto-c** : Création profil BtoC
  - À la création d'un user ou après inscription
  - Initialisation avec valeurs par défaut

- **POST /profiles/bto-b** : Création profil BtoB
  - À la création d'un user ou après inscription
  - Initialisation avec valeurs par défaut

**Livrables** :
- DTOs complets pour chaque type de profil
- Service avec validation métier
- Controller avec guards
- Tests unitaires

---

### 1.4 Module Social (Follow, Like, Save)

**À créer** :

- **POST /social/follow/:userId** : Suivre un utilisateur
  - Création relation Follow
  - Incrémentation followersCount
  - Vérification (ne pas se suivre soi-même)

- **DELETE /social/follow/:userId** : Ne plus suivre
  - Suppression relation Follow
  - Décrémentation followersCount

- **GET /social/followers/:userId** : Liste des followers
- **GET /social/following/:userId** : Liste des suivis

- **POST /social/like/:opportunityId** : Liker une opportunité
  - Création relation LikedOpportunity
  - Incrémentation likesCount

- **DELETE /social/like/:opportunityId** : Unlike
  - Suppression relation
  - Décrémentation likesCount

- **POST /social/save/:opportunityId** : Sauvegarder une opportunité
  - Création relation SavedOpportunity

- **DELETE /social/save/:opportunityId** : Retirer des sauvegardes
  - Suppression relation

- **GET /social/saved** : Opportunités sauvegardées par l'utilisateur authentifié

**Livrables** :
- Module social/ (service + controller)
- DTOs si nécessaire
- Guards d'authentification
- Tests unitaires

---

### 1.5 Module Notifications (Resend)

**À créer** :

- **Installation** : `npm install resend` dans backend

- **Service NotificationsService** :
  - Configuration Resend avec API key
  - Templates d'emails (application submitted, reviewed, accepted)
  - Méthodes d'envoi avec gestion d'erreurs

- **Intégration** :
  - Hook dans ApplicationsService lors de submit
  - Hook dans ApplicationsService lors de review
  - Hook dans AuthService lors d'inscription (welcome email)

- **Configuration** :
  - Variable d'environnement `RESEND_API_KEY`
  - Templates d'emails HTML

**Livrables** :
- Module notifications/ (service + templates)
- Configuration Resend
- Intégration dans les workflows métier
- Tests d'envoi d'emails

---

### 1.6 Guards et Permissions

**À implémenter** :

- **Protection des routes** :
  - Ajouter `@UseGuards(JwtAuthGuard)` sur toutes les routes nécessitant authentification
  - Routes publiques : GET /opportunities, GET /profiles/:id (si public)
  - Routes protégées : création/modification/suppression

- **Guards personnalisés** :
  - `@OwnerGuard` : Vérifier que l'utilisateur est owner de l'opportunité
  - `@ApplicationOwnerGuard` : Vérifier que l'utilisateur est owner de la candidature

- **Décorateurs personnalisés** :
  - `@CurrentUser()` : Récupérer l'utilisateur depuis le token JWT
  - `@Roles()` : Vérifier le rôle (USER, ADMIN)

**Livrables** :
- Guards personnalisés
- Décorateurs helpers
- Application sur tous les endpoints sensibles
- Tests des permissions

---

## Priorité 2 : Frontend V1

### 2.1 Authentification

**À implémenter** :

- **Pages** :
  - `/login` : Formulaire de connexion
  - `/register` : Formulaire d'inscription
  - Gestion des tokens JWT (localStorage ou cookies)
  - Redirection après login

- **Composants** :
  - FormLogin avec validation
  - FormRegister avec validation
  - Logout button
  - Protection des routes (middleware Next.js)

- **API Calls** :
  - Hook `useAuth()` pour gérer l'état d'authentification
  - Appels à `/auth/login` et `/auth/register`
  - Gestion des erreurs

**Livrables** :
- Pages login/register fonctionnelles
- Système d'authentification client
- Protection des routes
- Gestion des tokens

---

### 2.2 Pages Opportunités

**À implémenter** :

- **Page liste** : `/opportunities`
  - Affichage de toutes les opportunités
  - Filtres (type, industrie, marché)
  - Recherche
  - Pagination
  - Cards avec informations essentielles

- **Page détail** : `/opportunities/[id]`
  - Affichage complet d'une opportunité
  - Bouton "Postuler" (si authentifié)
  - Informations owner
  - Actions sociales (Like, Save, Share)

- **Page création** : `/opportunities/new`
  - Formulaire multi-étapes ou formulaire unique
  - Validation des champs
  - Upload d'images (Supabase Storage)
  - Sauvegarde en DRAFT ou publication
  - Redirection après création

- **Page mes opportunités** : `/my-opportunities`
  - Liste des opportunités créées par l'utilisateur
  - Filtres par statut
  - Actions (éditer, archiver, supprimer)

**Livrables** :
- Pages complètes avec formulaires
- Composants réutilisables (OpportunityCard, OpportunityForm)
- Gestion d'état (React Query ou Zustand)
- Validation côté client

---

### 2.3 Pages Candidatures

**À implémenter** :

- **Page mes candidatures** : `/my-applications`
  - Liste des candidatures de l'utilisateur
  - Filtres par statut
  - Affichage du statut actuel

- **Page détail candidature** : `/applications/[id]`
  - Affichage de la candidature
  - Lettre de motivation
  - Feedback owner (si disponible)
  - Actions (modifier si DRAFT, soumettre)

- **Page candidatures reçues** : `/my-opportunities/[id]/applications` (pour owner)
  - Liste des candidatures pour une opportunité
  - Actions (voir profil candidat, review, feedback)

- **Modal/Page review** : Pour owner
  - Formulaire de feedback
  - Changement de statut
  - Notification au candidat

**Livrables** :
- Pages complètes
- Composants ApplicationCard, ApplicationDetail
- Workflow de candidature complet
- Notifications visuelles

---

### 2.4 Pages Profils

**À implémenter** :

- **Page mon profil** : `/profile`
  - Affichage du profil actuel
  - Formulaire d'édition (BtoC ou BtoB)
  - Upload logo/image (Supabase Storage)
  - Sauvegarde des modifications

- **Page profil utilisateur** : `/profiles/[userId]`
  - Affichage public d'un profil
  - Informations selon visibilité
  - Bouton Follow/Unfollow
  - Opportunités créées par l'user

**Livrables** :
- Pages profils complètes
- Formulaires d'édition avec validation
- Upload de fichiers fonctionnel
- Gestion de la visibilité

---

### 2.5 Pages Social

**À implémenter** :

- **Page opportunités sauvegardées** : `/saved`
  - Liste des opportunités sauvegardées
  - Actions (retirer de sauvegardes, voir détails)

- **Intégration Like/Save** :
  - Boutons Like/Save sur les cards opportunités
  - États visuels (liked, saved)
  - Compteurs en temps réel

**Livrables** :
- Page sauvegardées
- Composants Like/Save buttons
- Gestion d'état social

---

### 2.6 Navigation et Layout

**À implémenter** :

- **Navbar** :
  - Menu selon état d'authentification
  - Liens vers principales pages
  - Avatar/Profil utilisateur
  - Notification badge (si applicable)

- **Footer** : Basique avec liens utiles

- **Layout global** :
  - Protection des routes privées
  - Gestion des erreurs 404
  - Loading states

**Livrables** :
- Navigation complète
- Layout responsive
- Protection des routes
- UX cohérente

---

## Priorité 3 : Intégrations

### 3.1 Supabase Storage

**Configuration** :
- Créer buckets dans Supabase (images, files, avatars)
- Configuration CORS
- Génération des URLs signées ou publiques

**Utilisation** :
- Upload d'images opportunités
- Upload logo/header entreprises
- Upload avatar utilisateur
- Service backend pour upload/delete

**Livrables** :
- Service Supabase Storage configuré
- Méthodes upload/delete dans backend
- Composants upload dans frontend
- Gestion des URLs dans Prisma

---

### 3.2 Gestion d'état Frontend

**Choix** : React Query ou Zustand

**À implémenter** :
- Configuration React Query avec API backend
- Hooks personnalisés pour chaque ressource
- Cache et invalidation
- Optimistic updates

**Livrables** :
- Configuration React Query
- Hooks réutilisables
- Gestion du cache optimisée

---

## Priorité 4 : Tests et Qualité

### 4.1 Tests Backend

**À créer** :
- Tests unitaires pour chaque service
- Tests d'intégration pour les endpoints
- Tests des guards et permissions
- Coverage > 70%

**Livrables** :
- Tests unitaires complets
- Tests d'intégration
- Configuration Jest/Supertest
- Rapport de coverage

---

### 4.2 Tests Frontend

**À créer** :
- Tests des composants critiques (formulaires)
- Tests d'intégration des pages
- Tests E2E (optionnel, avec Playwright ou Cypress)

**Livrables** :
- Tests de base frontend
- Configuration testing library
- Tests E2E si applicable

---

## Priorité 5 : Déploiement

### 5.1 Configuration Backend (Railway)

**À faire** :
- Créer compte Railway
- Lier le repo GitHub
- Configurer les variables d'environnement
- Déployer le backend
- Tester en production

**Livrables** :
- Backend déployé sur Railway
- Variables d'environnement configurées
- URL production fonctionnelle

---

### 5.2 Configuration Frontend (Vercel)

**À faire** :
- Créer compte Vercel
- Lier le repo GitHub
- Configurer les variables d'environnement (NEXT_PUBLIC_API_URL)
- Déployer le frontend
- Tester en production

**Livrables** :
- Frontend déployé sur Vercel
- Variables d'environnement configurées
- URL production fonctionnelle

---

## Planning Suggéré (par sprint/jour)

### Jour 1-2 : Backend Core (Priorité 1.1 à 1.3)
- Compléter Opportunities, Applications, Profiles
- Guards et permissions de base

### Jour 3 : Backend Social & Notifications (Priorité 1.4 à 1.5)
- Module social
- Intégration Resend

### Jour 4-5 : Frontend Authentification & Opportunités (Priorité 2.1 à 2.2)
- Login/Register
- Pages opportunités complètes

### Jour 6-7 : Frontend Candidatures & Profils (Priorité 2.3 à 2.4)
- Workflow candidatures
- Pages profils

### Jour 8 : Frontend Social & Finalisation (Priorité 2.5 à 2.6)
- Features sociales
- Navigation complète

### Jour 9 : Intégrations (Priorité 3)
- Supabase Storage
- React Query

### Jour 10 : Tests & Déploiement (Priorité 4 à 5)
- Tests de base
- Déploiement Vercel + Railway

---

## Notes importantes

- **Commits réguliers** : Commiter après chaque feature complétée
- **Documentation** : Documenter les endpoints API créés
- **Validation** : Tester chaque feature avant de passer à la suivante
- **Feedback** : Demander validation sur les features critiques (formulaires, workflows)

---

## Livrables finaux attendus

1. Backend complet avec tous les endpoints V1 fonctionnels
2. Frontend complet avec toutes les pages V1
3. Authentification complète (register, login, guards)
4. Notifications email fonctionnelles
5. Upload de fichiers fonctionnel
6. Application déployée (Vercel + Railway)
7. Documentation API mise à jour
8. Tests de base passants

**Objectif** : Avoir une version V1 fonctionnelle et déployée en production.

