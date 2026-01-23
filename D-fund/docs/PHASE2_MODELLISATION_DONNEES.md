# Phase 2 — Modélisation des données

##   Entités principales

### 1. User (Utilisateur)
**Champs** :
- `id` (PK)
- `email` (unique)
- `firstName`, `lastName`, `name`
- `password` (nullable si OAuth)
- `role` (USER, ADMIN, OWNER)
- `bio`, `profilePic`, `headerImage`
- `phone`, `city`, `country`
- `linkedinUrl`, `website`
- `visibility` (boolean)
- `createdAt`, `updatedAt`

**Relations** :
- 1:1 avec BtoCProfile
- 1:1 avec BtoBProfile
- 1:N avec Opportunity (owner)
- 1:N avec Application (candidate)
- N:M avec User (Follow)
- N:M avec Opportunity (Saved, Liked)

### 2. BtoCProfile (Profil Individu)
**Champs** :
- `id` (PK)
- `userId` (FK → User)
- `description`, `tags[]`, `industries[]`
- `marketFocus[]`, `languages[]`
- `businessSkills[]`, `techSkills[]`
- `seniorityLevel`
- `opportunitiesCount`, `followersCount`
- `avgRating`, `roundedRating`
- `lookingForOpportunities`, `remote`
- `countries[]`, `regions[]`, `opportunityTypes[]`

**Relations** :
- N:1 avec User

### 3. BtoBProfile (Profil Entreprise)
**Champs** :
- `id` (PK)
- `userId` (FK → User)
- `companyName`, `logo`, `headerImage`
- `punchline`, `description`, `longDescription`
- `website`, `linkedinUrl`
- `city`, `country`, `foundationDate`
- `developmentStage`
- `industries[]`, `marketFocus[]`
- `followersCount`, `opportunitiesCount`

**Relations** :
- N:1 avec User

### 4. Opportunity (Opportunité)
**Champs** :
- `id` (PK)
- `name`, `punchline`, `description`
- `type` (enum: 18 types)
- `featureId` (FK → Feature)
- `status` (DRAFT, PENDING, ACTIVE, ARCHIVED, CLOSED)
- `ownerId` (FK → User)
- `city`, `country`, `region`, `remote`
- `startDate`, `endDate`, `expirationDate`
- `applicationProcessId` (FK → ApplicationProcess)
- `needToCheckApplicant`
- `image`, `backgroundImage`, `file`
- `url`, `tags[]`, `industries[]`, `markets[]`
- `price`, `currency`, `pricingUnit`, `pricingDetails`
- `aiGenerated`, `aiPrompt`, `aiOutput`
- `applicationsCount`, `likesCount`, `messagesCount`
- `boosted`, `boostedUntil`, `qualified`
- `referralAvailable`, `referralAmount`

**Relations** :
- N:1 avec User (owner)
- N:1 avec Feature
- N:1 avec ApplicationProcess
- 1:N avec Application
- 1:N avec PublicDiscussion
- 1:N avec Task
- 1:N avec ReferralCode
- N:M avec User (Saved, Liked)

### 5. Application (Candidature)
**Champs** :
- `id` (PK)
- `opportunityId` (FK → Opportunity)
- `candidateId` (FK → User)
- `title`, `goalLetter`
- `submissionDate`
- `stage` (DRAFT, SUBMITTED, OWNER_REVIEW, SUCCESS, ARCHIVED)
- `isClosed`, `isDraft`
- `reviewDate`, `reviewFeedback`, `feedbackTitle`
- `referralCodeUsed`

**Relations** :
- N:1 avec Opportunity
- N:1 avec User (candidate)

### 6. Message (Message)
**Champs** :
- `id` (PK)
- `content`
- `senderId` (FK → User)
- `receiverId` (FK → User, nullable)
- `privateDiscussionId` (FK → PrivateDiscussion, nullable)
- `publicDiscussionId` (FK → PublicDiscussion, nullable)
- `createdAt`

**Relations** :
- N:1 avec User (sender, receiver)
- N:1 avec PrivateDiscussion
- N:1 avec PublicDiscussion

### 7. PrivateDiscussion (Discussion Privée)
**Champs** :
- `id` (PK)
- `lastMessageAt`
- `unreadCount`

**Relations** :
- N:M avec User (via Participant)
- 1:N avec Message

### 8. PublicDiscussion (Discussion Publique)
**Champs** :
- `id` (PK)
- `title`, `description`, `image`
- `type` (OPEN_FORUM, OPPORTUNITY_RELATED)
- `ownerId` (FK → User)
- `opportunityId` (FK → Opportunity, nullable)
- `messagesCount`, `membersCount`, `likesCount`
- `lastMessageAt`

**Relations** :
- N:1 avec User (owner)
- N:1 avec Opportunity
- 1:N avec Message

### 9. Task (Tâche)
**Champs** :
- `id` (PK)
- `userId` (FK → User)
- `relatedItemId`, `relatedItemType`
- `name`, `description`
- `status` (TODO, WORKING_ON_IT, IDEA, DONE)
- `dueDate`, `url`

**Relations** :
- N:1 avec User

### 10. Rating (Note)
**Champs** :
- `id` (PK)
- `itemId` (string - peut être opportunity, user, etc.)
- `userId` (FK → User)
- `rating` (1-5)
- `createdAt`, `updatedAt`

**Relations** :
- N:1 avec User

### 11. ReferralCode (Code de Parrainage)
**Champs** :
- `id` (PK)
- `code` (unique)
- `ownerId` (FK → User)
- `opportunityId` (FK → Opportunity, nullable)
- `type` (NEW_USER, TALENT_HUNT, OPPORTUNITY_RELATED)
- `status` (PENDING, ACTIVE, COMPLETED, EXPIRED)
- `amount`
- `usesCount`, `potentialAmount`

**Relations** :
- N:1 avec User
- N:1 avec Opportunity

### 12. Follow (Suivi)
**Champs** :
- `id` (PK)
- `followerId` (FK → User)
- `followingId` (FK → User)
- `createdAt`

**Relations** :
- N:M avec User (self-referential)

### 13. SavedOpportunity / LikedOpportunity
**Champs** :
- `id` (PK)
- `userId` (FK → User)
- `opportunityId` (FK → Opportunity)
- `createdAt`

**Relations** :
- N:M avec User et Opportunity

### 14. ApplicationProcess (Processus de Candidature)
**Champs** :
- `id` (PK)
- `name` (unique)
- `description`, `candidateDescription`

**Relations** :
- 1:N avec Opportunity

### 15. Industry, Market, Feature (Référentiels)
**Champs standards** : `id`, `name`, `description`, etc.

---

## 🔗 Relations principales

### 1:N (One-to-Many)
- User → Opportunity (owner)
- User → Application (candidate)
- User → Message (sender/receiver)
- Opportunity → Application
- Opportunity → PublicDiscussion
- User → Task

### N:M (Many-to-Many)
- User ↔ User (Follow)
- User ↔ Opportunity (Saved, Liked)
- User ↔ PrivateDiscussion (via Participant)

### 1:1 (One-to-One)
- User ↔ BtoCProfile
- User ↔ BtoBProfile

---

## 🔑 Clés primaires et étrangères

### Clés primaires
Toutes les entités utilisent `id` (String, cuid())

### Clés étrangères principales
- `userId` → User.id
- `opportunityId` → Opportunity.id
- `applicationProcessId` → ApplicationProcess.id
- `featureId` → Feature.id
- `privateDiscussionId` → PrivateDiscussion.id
- `publicDiscussionId` → PublicDiscussion.id

---

##   Validation

### Cohérence avec parcours V1
-   User peut créer une Opportunity
-   User peut postuler (Application)
-   User peut suivre d'autres users
-   User peut sauvegarder/liker des opportunités
-   Messages privés et publics fonctionnels

### Évolutions futures anticipées
-   Support multi-langues (champ `languages[]`)
-   Système de rating extensible (`itemId` générique)
-   Tasks liées à différents items (`relatedItemType`)
-   Premium features (boosted, qualified)
-   AI generation (champs dédiés)

---

## 📦 Livrable

**Schéma Prisma complet**   (déjà créé dans `/prisma/schema.prisma`)

**Documentation des entités**   (ce document)

**Diagramme relationnel**   (à créer avec outil de diagramme)

