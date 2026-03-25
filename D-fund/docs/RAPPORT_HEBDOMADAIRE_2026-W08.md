# Rapport hebdomadaire — Semaine du 17 février 2026

*Backend = serveur et API (logique métier, base de données). Frontend = interface dans le navigateur (pages, formulaires, affichage).*

---

## 0. Résumé non-technique (pour lecture CEO)

Cette semaine, nous avons renforcé le cœur produit autour des **opportunités**, des **profils** et des **conversations**, en rapprochant l’interface Next.js du comportement historique Glide.

- Les utilisateurs peuvent désormais **explorer les opportunités** avec des filtres avancés, mais aussi gérer leurs propres offres dans une page dédiée “My opportunities”.
- La **communauté** est plus vivante: les profils BtoC/BtoB sont consultables, suivis (follow/unfollow) et reliés à des profils publics propres.
- Le **chat** est branché au backend: les discussions publiques et privées listent les messages réels de la base Supabase, avec possibilité d’échanger directement depuis l’interface.
- Le **dashboard** offre une vue synthétique des candidatures et des offres créées, avec un onglet Tasks prévu pour les évolutions post‑V1.

---

## 1. Opportunités & navigation

### 1.1 Page `/opportunities` (exploration globale)

- Liste publique des opportunités avec:
  - Recherche plein‑texte sur nom / punchline / description.
  - Filtres par **type** (les 18 types issus de Glide) et par **statut** (`ACTIVE`, `PENDING`, `DRAFT`, `CLOSED`, `ARCHIVED`).
  - Affichage via `OpportunityCard` (titre, type, owner, métriques sociales).
- La page ne filtre plus sur “mes” opportunités, pour éviter le doublon avec la nouvelle vue propriétaire.

### 1.2 Page `/my-opportunities` (vue Owner)

- Nouvelle page listant uniquement les opportunités créées par l’utilisateur connecté:
  - Alimentation via `GET /api/v1/opportunities/user/:userId?take=50`.
  - Filtres par statut (`ALL`, `DRAFT`, `ACTIVE`, `ARCHIVED`, `CLOSED`).
  - CTA “Create opportunity” renvoyant vers `/opportunities/new`.
- Intégration dans la navigation:
  - Ajout de “My Opportunities” dans la section **My Content** du `Sidebar` aux côtés de “Saved” et “My Applications”.

### 1.3 Pages ressources alimentées par les vraies données

- **`/resources/programs`**:
  - Liste les opportunités de type `VENTURE_PROGRAM` avec statut `ACTIVE` via `GET /opportunities?type=VENTURE_PROGRAM&status=ACTIVE&take=50`.
  - Réutilise `OpportunityCard` pour rester cohérent avec Glide.

- **`/resources/tools`**:
  - Liste les opportunités de type `SERVICE_LISTING` actives via `GET /opportunities?type=SERVICE_LISTING&status=ACTIVE&take=50`.
  - Message d’état vide expliquant comment créer la première opportunité de ce type.

---

## 2. Profils, communauté & follow/unfollow

### 2.1 Profil public `/profiles/[userId]`

- Nouvelle page publique pour afficher le profil complet d’un utilisateur:
  - Lecture via `GET /api/v1/profiles/:userId` (User + BtoCProfile/BtoBProfile).
  - Affiche:
    - Avatar, nom, email, localisation.
    - Bio simple.
    - Bloc “Individual profile” (description, skills/tags, industries).
    - Bloc “Company profile” (companyName, punchline, description, logo).
    - Statistiques: `opportunitiesCount`, `followersCount`.
  - Lien vers `/profile` pour que l’utilisateur connecté modifie son propre profil.

### 2.2 Page communauté `/community`

- Vue BtoC/BtoB alimentée par:
  - `GET /profiles/lists/talents` (talents).
  - `GET /profiles/lists/companies` (entreprises).
- Ajout des fonctionnalités **Follow/Unfollow**:
  - Récupération des utilisateurs suivis via `GET /social/following/:userId`.
  - Pour chaque ligne:
    - Bouton **Follow / Following** à droite:
      - Si non connecté: redirection vers `/login`.
      - Si connecté:
        - Tentative `POST /social/follow/:userId`.
        - Si déjà suivi (erreur “Already following”), bascule automatique en `DELETE /social/follow/:userId`.
    - Invalidation ciblée du cache React Query (`social-following`, `community-btoc`, `community-btob`) après changement.
  - Clic sur la partie gauche de la ligne ouvre le profil public `/profiles/[userId]`.

### 2.3 Profil entreprise: upload logo et header

- Sur `/profile` (onglet **Company Profile**):
  - Upload de **logo** et **headerImage**:
    - Utilisation de `uploadImage(file, 'companies', userId, 'images')` côté frontend.
    - Envoi des URLs résultantes dans `PUT /profiles/bto-b/:userId` (`logo`, `headerImage`).
  - Prévisualisation des images et possibilité de les réinitialiser avant sauvegarde.
  - Conversion des champs `industries` et `marketFocus` en tableaux (split par virgule).

---

## 3. Chat & messages (publics et privés)

### 3.1 API messages (backend)

- **Listes de discussions**:
  - `GET /api/v1/messages/public?type=OPPORTUNITY_RELATED|OPEN_FORUM`:
    - Retourne les `PublicDiscussion` avec owner, opportunité liée, compteurs.
  - `GET /api/v1/messages/private` (protégé JWT):
    - Retourne les `PrivateDiscussion` où l’utilisateur est participant, avec les participants et `lastMessageAt`.

- **Messages d’une discussion**:
  - `GET /api/v1/messages/public/:discussionId`:
    - Messages publics triés par `createdAt`, avec info sur le sender.
  - `GET /api/v1/messages/private/:discussionId` (JWT):
    - Messages privés triés par `createdAt`, avec sender + receiver.

- **Création de messages**:
  - DTO `CreateMessageDto` (champ `content` obligatoire).
  - `POST /api/v1/messages/public/:discussionId` (JWT):
    - Vérifie l’existence de la `PublicDiscussion`.
    - Crée le message, met à jour `lastMessageAt` et `messagesCount`.
  - `POST /api/v1/messages/private/:discussionId` (JWT):
    - Vérifie que la discussion existe et que l’utilisateur est bien participant.
    - Crée un message avec `senderId` et `receiverId` (autre participant).
    - Met à jour `lastMessageAt` et `unreadCount`.

### 3.2 Interface de chat (frontend)

- Page `/chat`:
  - Onglets **Open / Private**.
  - Sous‑onglets Open:
    - *Opportunity-Related* (discussions liées aux opportunités).
    - *Open Forum* (discussions générales).
  - Sous‑onglets Private:
    - *Direct Messages* (fonctionnel).
    - *Pending* et *Archive* (placeholders pour itérations futures).
  - Chaque ligne de discussion renvoie vers:
    - `/chat/public/[id]` pour les discussions publiques.
    - `/chat/private/[id]` pour les discussions privées.

- Pages de détail:
  - `/chat/public/[id]`:
    - Affiche la liste des messages (`GET /messages/public/:id`).
    - Formulaire d’envoi connecté à `POST /messages/public/:id`, avec rafraîchissement de la liste via React Query.
    - Si non connecté: message invitant à se connecter pour participer.
  - `/chat/private/[id]`:
    - Affiche les messages privés (`GET /messages/private/:id`) avec alignement différent pour ses propres messages.
    - Formulaire d’envoi branché sur `POST /messages/private/:id`.

---

## 4. Dashboard et vue Owner

- Mise à jour de la page `/dashboard`:
  - Introduction d’onglets **Applications / Offers / Tasks**:
    - Applications: reprend la liste des candidatures de l’utilisateur (`GET /applications/user/:userId`).
    - Offers: liste rapide des opportunités créées (`GET /opportunities/user/:userId?take=10`) avec statut, nombre de candidatures et likes.
    - Tasks: section placeholder pour la future gestion de tâches (hors V1).
  - Conservation des trois cartes d’actions rapides en haut de page (Import Opportunities, Create Opportunities, Start Engaging).

---

## 5. Qualité & tests

- **Linter**:
  - Tous les fichiers modifiés backend et frontend (messages, community, profile, chat, dashboard, my‑opportunities, resources) passent sans erreurs via l’outil de lint intégré.

- **Tests manuels recommandés (réalisés ou à refaire régulièrement)**:
  - Flux Owner:
    - Connexion → création d’opportunité → vérification dans `/opportunities`, `/my-opportunities` et `/dashboard` (onglet Offers).
  - Flux Community:
    - Consultation BtoC/BtoB, follow/unfollow, navigation vers profils publics.
  - Flux Chat:
    - Navigation `/chat` → sélection discussion publique/privée → envoi et affichage de nouveaux messages.
  - Flux Profil BtoB:
    - Upload/sauvegarde de logo et header, contrôle visuel sur les vues profil public et communauté.

---

## 6. Prochaines étapes

1. **Upload d’images BtoC (avatar talents)** sur le même modèle que BtoB.
2. **Tests backend ciblés** (register/login, create opportunity, create/submit/review application, follow/unfollow) pour sécuriser avant déploiement.
3. Préparation des **configurations Railway/Vercel** (variables d’environnement de prod, URLs API, secrets) et premier déploiement de bout en bout. 

