# Phase 7 — Migration depuis Glide

##   Tables Glide identifiées

Les CSV exportés de Glide sont désormais archivés dans `data/glide/raw/` (et ignorés par Git).  
Ils ne doivent plus être utilisés comme source de vérité en production : la source officielle est la base Supabase.

Les principaux fichiers sont :

1. **Users(1).csv** → `User` + `BtoCProfile` / `BtoBProfile`
2. **Opportunities(1).csv** → `Opportunity`
3. **Applications(1).csv** → `Application`
4. **BtoB.csv** → `BtoBProfile`
5. **BtoC.csv** → `BtoCProfile`
6. **Private Messages.csv** → `Message` + `PrivateDiscussion`
7. **Public Discussions.csv** → `PublicDiscussion`
8. **Public Messages.csv** → `Message` (public)
9. **Ratings.csv** → `Rating`
10. **Tasks(1).csv** → `Task`
11. **Referral Codes.csv** → `ReferralCode`
12. **Industries.csv** → `Industry`
13. **Markets.csv** → `Market`
14. **Features.csv** → `Feature`
15. **Application Process.csv** → `ApplicationProcess`
16. **Offers.csv** → (à analyser - semble être des limites)
17. **Feedbacks.csv** → (à analyser)
18. **Features Comments.csv** → (à analyser)
19. **Features Ideas.csv** → (à analyser)
20. **Metrics Users.csv** → (métriques - à intégrer dans User)
21. **Urls.csv** → (à analyser)
22. **Home Page.csv** → (configuration - hors scope)
23. **Containers & Components.csv** → (configuration UI - hors scope)

---

##    Mapping Glide → DB cible

### Users(1).csv → User + Profiles

**Mapping** :
- `Row ID` → `id` (garder l'ID Glide ou générer nouveau)
- `Resume / First Name` → `firstName`
- `Resume / Last Name` → `lastName`
- `Resume / Email` → `email`
- `Resume / Profile Pic` → `profilePic`
- `BtoC Info / Header` → `headerImage`
- `BtoC Info` → `bio`
- `Resume / City` → `city`
- `Resume / Country` → `country`
- `Resume / Linkedin Url` → `linkedinUrl`
- `Resume / Role` → `role` (USER, ADMIN)
- `Resume / date creation` → `createdAt`

**BtoC Profile** :
- `Profile / Bio` → `description`
- `Profile / Tags Displayed` → `tags[]`
- `Profile / Industries` → `industries[]`
- `Profile / Market Focus` → `marketFocus[]`
- `Profile / Languages` → `languages[]`
- `Profile / Business Skills` → `businessSkills[]`
- `Profile / Tech Skills` → `techSkills[]`
- `Profile / Seniority Level` → `seniorityLevel`

**BtoB Profile** :
- `Profile / Company Name` → `companyName`
- `Profile / Logo` → `logo`
- `Profile / Punchline` → `punchline`
- `Profile / Long Description` → `longDescription`
- `Profile / Industries` → `industries[]`
- `Profile / Market Focus` → `marketFocus[]`
- `Profile / Development Stage` → `developmentStage`

### Opportunities(1).csv → Opportunity

**Mapping** :
- `Row ID` → `id`
- `Offer / Opportunity Name` → `name`
- `Offer / Punchline` → `punchline`
- `Offer / Description` → `description`
- `Foreign Keys / BtoC Owner Email` → `ownerId` (via lookup User)
- `Foreign Keys / Feature ID` → `featureId`
- `Offer / Publication Status` → `status` (DRAFT, ACTIVE, etc.)
- `Offer / City, Country` → `city`, `country`
- `Offer / Remote?` → `remote`
- `Dates / Expiration Date` → `expirationDate`
- `Images / Image` → `image`
- `Images / Background` → `backgroundImage`
- `Overview / Tags` → `tags[]`
- `Foreign Keys / Industries ID` → `industries[]`
- `Offer / Market` → `markets[]`
- `Pricing / Price` → `price`
- `Pricing / Currency` → `currency`
- `Referral / Is available?` → `referralAvailable`
- `Referral / Amount` → `referralAmount`

### Applications(1).csv → Application

**Mapping** :
- `Row ID` → `id`
- `Foreign Keys / Opportunity ID` → `opportunityId`
- `Foreign Keys / email BtoC Candidate` → `candidateId` (via lookup)
- `Application / Goal Letter` → `goalLetter`
- `Application / Submission Date` → `submissionDate`
- `Application Stage / Stage` → `stage`
- `Application Stage / Is Closed?` → `isClosed`
- `Navigation / Draft Slider` → `isDraft`
- `Owner Review / Review Date` → `reviewDate`
- `Owner Review / Review` → `reviewFeedback`
- `Referrals / Code Used` → `referralCodeUsed`

---

##   Données à nettoyer

### Problèmes identifiés

1. **Duplicatas** :
   - Users avec emails dupliqués (à merger)
   - Opportunities avec mêmes noms (à vérifier)

2. **Données manquantes** :
   - Emails vides (à exclure ou générer)
   - Passwords manquants (à générer temporairement)

3. **Formats** :
   - Dates en format texte (nécessite parsing)
   - Arrays en format string (nécessite split)
   - URLs relatives (nécessite normalisation)

4. **Relations** :
   - Foreign keys invalides (à vérifier)
   - Orphelins (à nettoyer)

---

##   Stratégie de migration

### Phase 1 : Préparation
1.   Analyser tous les CSV
2.   Créer script de parsing
3.   Identifier et nettoyer les données
4.   Valider les relations

### Phase 2 : Migration
1.   Migrer les référentiels (Industries, Markets, Features)
2.   Migrer les Users
3.   Migrer les Profiles (BtoC/BtoB)
4.   Migrer les Opportunities
5.   Migrer les Applications
6.   Migrer les Messages
7.   Migrer les Tasks, Ratings, Referrals

### Phase 3 : Validation
1.   Vérifier les comptes
2.   Vérifier les relations
3.   Tester les fonctionnalités

---

## 📦 Livrables

1. **Mapping complet**   (ce document)
2. **Script de migration**   (à créer dans `/scripts/migrate.ts`)
3. **Rapport de migration**   (après exécution)

---

##   Script de migration

**Structure prévue** :
```typescript
// scripts/migrate.ts
1. Parse CSV files
2. Clean data
3. Transform formats
4. Validate relations
5. Insert into DB via Prisma
6. Generate report
```

**À créer** : Script complet avec gestion d'erreurs et logging

