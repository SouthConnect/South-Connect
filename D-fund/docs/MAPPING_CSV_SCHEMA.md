# Mapping CSV Glide → Schéma Prisma

##   Vue d'ensemble

**Objectif** : S'assurer que tous les CSV Glide sont bien mappés dans le schéma Prisma, même si condensés dans moins de tables.

---

##   CSV mappés dans le schéma Prisma

### 1. Users(1).csv → User + BtoCProfile + BtoBProfile
**Mapping** :
- Données utilisateur de base → `User`
- Profil BtoC (individu) → `BtoCProfile`
- Profil BtoB (entreprise) → `BtoBProfile`

**Champs mappés** :
- `Row ID` → `User.id`
- `Resume / Email` → `User.email`
- `Resume / First Name` → `User.firstName`
- `Resume / Last Name` → `User.lastName`
- `Resume / Profile Pic` → `User.profilePic`
- `BtoC Info / Header` → `User.headerImage`
- `Resume / City` → `User.city`
- `Resume / Country` → `User.country`
- `Resume / Linkedin Url` → `User.linkedinUrl`
- `Resume / Role` → `User.role` (USER, ADMIN)
- `Resume / date creation` → `User.createdAt`

**BtoC Profile** :
- `Profile / Bio` → `BtoCProfile.description`
- `Profile / Tags Displayed` → `BtoCProfile.tags[]`
- `Profile / Industries` → `BtoCProfile.industries[]`
- `Profile / Market Focus` → `BtoCProfile.marketFocus[]`
- `Profile / Languages` → `BtoCProfile.languages[]`
- `Profile / Business Skills` → `BtoCProfile.businessSkills[]`
- `Profile / Tech Skills` → `BtoCProfile.techSkills[]`
- `Profile / Seniority Level` → `BtoCProfile.seniorityLevel`
- `Communications / Remote?` → `BtoCProfile.remote`
- `Communications / Countries` → `BtoCProfile.countries[]`
- `Communications / Regions` → `BtoCProfile.regions[]`
- `Communications / Opportunity types` → `BtoCProfile.opportunityTypes[]`

**BtoB Profile** :
- `Profile / Company Name` → `BtoBProfile.companyName`
- `Visuals & Documents / Logo` → `BtoBProfile.logo`
- `Profile / Punchline` → `BtoBProfile.punchline`
- `Profile / Long Description` → `BtoBProfile.longDescription`
- `Profile / Industries` → `BtoBProfile.industries[]`
- `Profile / Market Focus` → `BtoBProfile.marketFocus[]`
- `Profile / Development Stage` → `BtoBProfile.developmentStage`
- `Profile / Website` → `BtoBProfile.website`
- `Profile / LinkedIn` → `BtoBProfile.linkedinUrl`
- `Profile / Fondation Date` → `BtoBProfile.foundationDate`

**Métriques** (calculées, pas stockées directement) :
- `Metrics / Opportunit count` → Calculé depuis `Opportunity[]`
- `Metrics / application` → Calculé depuis `Application[]`
- `Metrics / Sum Unread Messages` → Calculé depuis `Message[]`
- `Metrics / Count Notifications` → Calculé depuis notifications

### 2. Opportunities(1).csv → Opportunity
**Mapping complet** : Voir `docs/PHASE7_MIGRATION_GLIDE.md`

**Points clés** :
- `Row ID` → `Opportunity.id`
- `Offer / Opportunity Name` → `Opportunity.name`
- `Offer / Punchline` → `Opportunity.punchline`
- `Offer / Description` → `Opportunity.description`
- `Foreign Keys / BtoC Owner Email` → `Opportunity.ownerId` (via lookup User)
- `Foreign Keys / Feature ID` → `Opportunity.featureId`
- `Offer / Publication Status` → `Opportunity.status`
- `Foreign Keys / Application Process` → `Opportunity.applicationProcessId`
- `Referral / Is available?` → `Opportunity.referralAvailable`
- `Referral / Amount` → `Opportunity.referralAmount`
- `AI / Output` → `Opportunity.aiOutput` (hors V1 mais champs présents)

### 3. Applications(1).csv → Application
**Mapping complet** : Voir `docs/PHASE7_MIGRATION_GLIDE.md`

**Points clés** :
- `Row ID` → `Application.id`
- `Foreign Keys / Opportunity ID` → `Application.opportunityId`
- `Foreign Keys / email BtoC Candidate` → `Application.candidateId` (via lookup)
- `Application / Goal Letter` → `Application.goalLetter`
- `Application / Submission Date` → `Application.submissionDate`
- `Application Stage / Stage` → `Application.stage`
- `Application Stage / Is Closed?` → `Application.isClosed`
- `Navigation / Draft Slider` → `Application.isDraft`
- `Owner Review / Review` → `Application.reviewFeedback`
- `Referrals / Code Used` → `Application.referralCodeUsed`

### 4. BtoB.csv → BtoBProfile
**Mapping** : Intégré dans `BtoBProfile` (déjà mappé via Users(1).csv)

**Champs additionnels** :
- `Profile / Aggregator copy` → `BtoBProfile.description` (si différent)
- `Metrics / Followers Count` → `BtoBProfile.followersCount`
- `Metrics / Opportunities Count` → `BtoBProfile.opportunitiesCount`

### 5. BtoC.csv → BtoCProfile
**Mapping** : Intégré dans `BtoCProfile` (déjà mappé via Users(1).csv)

**Champs additionnels** :
- `Metrics / Opportunities` → `BtoCProfile.opportunitiesCount`
- `Metrics / Count of followers` → `BtoCProfile.followersCount`
- `Metrics / AVG RATES` → `BtoCProfile.avgRating`
- `Metrics / Rounded Rates` → `BtoCProfile.roundedRating`

### 6. Private Messages.csv → Message + PrivateDiscussion
**Mapping** :
- `Foreign Keys / Private Discussion ID` → `Message.privateDiscussionId`
- `Foreign Keys / User Email` → `Message.senderId` (via lookup)
- `Message` → `Message.content`
- `Admin / Create Date` → `Message.createdAt`

**Note** : Les discussions privées sont créées automatiquement lors du premier message entre 2 users.

### 7. Public Messages.csv → Message + PublicDiscussion
**Mapping** :
- `Foreign Keys / Public Discussion ID` → `Message.publicDiscussionId`
- `Foreign Keys / User Email` → `Message.senderId` (via lookup)
- `Message` → `Message.content`
- `Admin / Create Date` → `Message.createdAt`

### 8. Public Discussions.csv → PublicDiscussion
**Mapping** :
- `Row ID` → `PublicDiscussion.id`
- `Layout / Title` → `PublicDiscussion.title`
- `Layout / Description` → `PublicDiscussion.description`
- `Layout / Image` → `PublicDiscussion.image`
- `Logic / Discussion Type` → `PublicDiscussion.type`
- `Foreign Keys / BtoC email` → `PublicDiscussion.ownerId` (via lookup)
- `Foreign Keys / Opportunity ID` → `PublicDiscussion.opportunityId`
- `Metrics / Messages Count` → `PublicDiscussion.messagesCount`
- `Metrics / Members` → `PublicDiscussion.membersCount`
- `Dates / Last Message Date` → `PublicDiscussion.lastMessageAt`

### 9. Private Discussions.csv → PrivateDiscussion
**Mapping** :
- `Row ID` → `PrivateDiscussion.id`
- Les participants sont dans `Participant[]` (via `Private Messages.csv`)

### 10. Tasks(1).csv → Task
**Mapping** :
- `Row ID` → `Task.id`
- `Foreign Keys / User Email` → `Task.userId` (via lookup)
- `Foreign Keys / Related Item` → `Task.relatedItemId`
- `Task / Name` → `Task.name`
- `Task / Description` → `Task.description`
- `Task / Status` → `Task.status`
- `Task / Due Date` → `Task.dueDate`
- `Task / URL` → `Task.url`

### 11. Ratings.csv → Rating
**Mapping** :
- `Foreign Keys / Item ID` → `Rating.itemId` (peut être opportunity, user, etc.)
- `Foreign Keys / User Email` → `Rating.userId` (via lookup)
- `Rating` → `Rating.rating` (1-5)
- `Creation` → `Rating.createdAt`

### 12. Referral Codes.csv → ReferralCode
**Mapping** :
- `Row ID` → `ReferralCode.id`
- `FK / Owner Referral Code Email` → `ReferralCode.ownerId` (via lookup)
- `FK / Item ID` → `ReferralCode.opportunityId` (si lié à une opportunité)
- `Type` → `ReferralCode.type`
- `Status` → `ReferralCode.status`
- `Amount` → `ReferralCode.amount`
- `Count Code used in app` → `ReferralCode.usesCount`
- `Potential Amount` → `ReferralCode.potentialAmount`

### 13. Industries.csv → Industry
**Mapping** :
- `Row ID` → `Industry.id`
- `Name` → `Industry.name`
- `Description` → `Industry.description`
- `Metrics / Opportunity Count` → `Industry.opportunitiesCount`

### 14. Markets.csv → Market
**Mapping** :
- `Name` → `Market.name`
- `Images` → `Market.image`

### 15. Features.csv → Feature
**Mapping** :
- `Row ID` → `Feature.id`
- `Opportunity Name` → `Feature.name`
- `Creator / Description` → `Feature.description`
- `Foreign Keys / Main Category` → `Feature.category`
- `Category / Order` → `Feature.order`
- `AI / Prompt` → `Feature.aiPrompt`
- `Seeker / Name` → `Feature.seekerName`
- `Creator / Name` → `Feature.creatorName`
- `Navigation / Display Type` → `Feature.displayType`
- `Options / No application needed` → `Feature.noApplicationNeeded`

### 16. Application Process.csv → ApplicationProcess
**Mapping** :
- `Name` → `ApplicationProcess.name`
- `Description` → `ApplicationProcess.description`
- `Candidate Descritpion` → `ApplicationProcess.candidateDescription`

---

##   CSV de configuration (pas de tables dédiées)

Ces CSV contiennent de la configuration UI ou des métriques calculées, pas besoin de tables dédiées :

### 17. Offers.csv
**Contenu** : Limites AI (ex: Free = 10)
**Traitement** : Configuration système, peut être dans une table `SystemConfig` ou variables d'env

### 18. Metrics Users.csv
**Contenu** : Métriques utilisateurs
**Traitement** : Calculées depuis les données (opportunities, applications, messages)

### 19. Feedbacks.csv
**Contenu** : Feedbacks utilisateurs (ex: "plan upgrade", commentaires)
**Traitement** : Intégré dans `Application.reviewFeedback` ou système de feedbacks séparé (hors V1)
**Mapping** : Peut être ajouté comme champ `feedback` dans `Application` ou table séparée `Feedback` si nécessaire

### 20. Features Comments.csv
**Contenu** : Commentaires sur les features (ex: "yo", "Tu en penses quoi?")
**Traitement** : Système de commentaires sur les features (hors V1)
**Mapping** : Peut être ajouté comme table `FeatureComment` si nécessaire, ou intégré dans `PublicDiscussion` liée à une feature

### 21. Features Ideas.csv
**Contenu** : Idées de features
**Traitement** : Configuration produit, pas besoin de table

### 22. Home Page.csv
**Contenu** : Configuration de la page d'accueil
**Traitement** : Configuration UI, pas besoin de table

### 23. Containers & Components.csv
**Contenu** : Configuration UI
**Traitement** : Configuration frontend, pas besoin de table

### 24. Properties Categories.csv
**Contenu** : Catégories de propriétés (Core Information, Layout, Requirements, Location & Format, Timing, Access & Filters)
**Traitement** : Configuration UI pour les formulaires de création d'opportunité
**Mapping** : Configuration frontend, pas besoin de table dédiée (peut être dans `Feature.category` ou configuration JSON)

### 25. Choices General.csv, BtoC Choice.csv, BtoB Choice.csv, Chat Choice.csv, User Choice.csv
**Contenu** : Choix/options de configuration
**Traitement** : Configuration UI, peut être dans une table `UserPreference` ou configuration frontend

### 26. Targeted Profiles.csv
**Contenu** : Profils ciblés (For Individual Professionals & Aspiring Founders, For Startups & Growing Companies, etc.)
**Traitement** : Catégories de profils utilisateurs (configuration UI)
**Mapping** : Configuration frontend, peut être intégré dans `User.role` ou préférences utilisateur

### 27. Stacks Deals.csv
**Contenu** : Deals partenaires (Brevo, PipeDrive, CloudFlare, Hubspot, etc.) - 794 deals tech
**Traitement** : Deals/offres partenaires (hors V1)
**Mapping** : Peut être ajouté comme table `Deal` ou intégré dans `Opportunity` avec type `DEAL` si nécessaire

### 28. Urls.csv
**Contenu** : URLs (ex: Meeting Mart, calendrier Notion)
**Traitement** : URLs externes (peut être intégré dans `Opportunity.url` ou `User.website`)
**Mapping** : Déjà couvert par `Opportunity.url` et `User.website`

### 29. Important Tasks.csv
**Contenu** : Tâches importantes
**Traitement** : Intégré dans `Task` avec un flag `important`

### 30. Premium Space.csv
**Contenu** : Espace premium
**Traitement** : Intégré dans `User` ou `Opportunity` avec champs premium (boosted, qualified)

### 31. Private User Form Creation Profile.csv
**Contenu** : Formulaire de création de profil privé
**Traitement** : Configuration UI, pas besoin de table

### 32. Profil Settings.csv
**Contenu** : Paramètres de profil
**Traitement** : Intégré dans `User`, `BtoCProfile`, `BtoBProfile`

### 33. evanescent-street.csv
**Contenu** : Test data (Name, e, New Column)
**Traitement** : Données de test Glide, à ignorer lors de la migration

### 34. extracted_deals.csv
**Contenu** : Deals extraits (similaire à Stacks Deals.csv)
**Traitement** : Deals partenaires (hors V1)
**Mapping** : Même traitement que Stacks Deals.csv

### 35. AI Work.csv
**Contenu** : Travail AI (vide ou configuration)
**Traitement** : Configuration AI (hors V1)
**Mapping** : Intégré dans `Opportunity.aiGenerated`, `Opportunity.aiPrompt`, `Opportunity.aiOutput`

---

##   Validation du mapping

### CSV mappés dans des tables Prisma
-   Users(1).csv → User + BtoCProfile + BtoBProfile
-   Opportunities(1).csv → Opportunity
-   Applications(1).csv → Application
-   BtoB.csv → BtoBProfile (intégré)
-   BtoC.csv → BtoCProfile (intégré)
-   Private Messages.csv → Message + PrivateDiscussion
-   Public Messages.csv → Message + PublicDiscussion
-   Public Discussions.csv → PublicDiscussion
-   Private Discussions.csv → PrivateDiscussion
-   Tasks(1).csv → Task
-   Ratings.csv → Rating
-   Referral Codes.csv → ReferralCode
-   Industries.csv → Industry
-   Markets.csv → Market
-   Features.csv → Feature
-   Application Process.csv → ApplicationProcess

### CSV de configuration (pas de tables dédiées)
- ⚠  Offers.csv → Configuration système
- ⚠  Metrics Users.csv → Métriques calculées
- ⚠  Feedbacks.csv → À analyser (peut être intégré)
- ⚠  Features Comments.csv → À analyser
- ⚠  Features Ideas.csv → Configuration produit
- ⚠  Home Page.csv → Configuration UI
- ⚠  Containers & Components.csv → Configuration UI
- ⚠  Properties Categories.csv → À analyser
- ⚠  Choices*.csv → Configuration UI
- ⚠  Targeted Profiles.csv → À analyser
- ⚠  Stacks Deals.csv → À analyser
- ⚠  Urls.csv → À analyser
- ⚠  Important Tasks.csv → Intégré dans Task
- ⚠  Premium Space.csv → Intégré dans User/Opportunity
- ⚠  Private User Form Creation Profile.csv → Configuration UI
- ⚠  Profil Settings.csv → Intégré dans profils
- ⚠  evanescent-street.csv → À analyser
- ⚠  extracted_deals.csv → À analyser

---

##   CSV à analyser en détail

Ces CSV nécessitent une analyse plus approfondie pour déterminer leur mapping :

1. **Feedbacks.csv** : Peut être intégré dans `Rating` ou `Application.reviewFeedback` ?
2. **Features Comments.csv** : Système de commentaires séparé ou intégré ?
3. **Properties Categories.csv** : Intégré dans `Feature` ou `Industry` ?
4. **Targeted Profiles.csv** : Intégré dans préférences utilisateur ?
5. **Stacks Deals.csv** : Lié à `Opportunity` ou entité séparée ?
6. **Urls.csv** : Intégré dans `Opportunity.url` ou autres ?
7. **evanescent-street.csv** : Contenu à déterminer
8. **extracted_deals.csv** : Contenu à déterminer

---

##   Actions requises

1. **Analyser les CSV marqués "À analyser"** pour déterminer leur mapping
2. **Valider les CSV de configuration** (pas besoin de tables dédiées)
3. **Créer le script de migration** en tenant compte de tous les CSV

