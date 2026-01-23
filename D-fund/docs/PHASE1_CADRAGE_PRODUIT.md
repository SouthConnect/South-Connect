# Phase 1 — Cadrage produit (V1)

##   Complété

### Features existantes dans Glide

D'après l'analyse des CSV, voici toutes les features identifiées :

#### 1. Job Matching
- **Talent Profile** : Profils de talents cherchant des opportunités
- **Job Opportunity** : Offres d'emploi postées par les entreprises

#### 2. Co-founder Matching
- **Co-founder Profile** : Profils de co-founders disponibles
- **Co-founder Opportunity** : Recherche de co-founders pour projets

#### 3. Business Ideas
- **Business Idea** : Partage d'idées business
- **Support Offer** : Offres de support pour des idées

#### 4. Services
- **Service Listing** : Listing de services professionnels
- **Service Request** : Demandes de services spécifiques

#### 5. BA & Mentors
- **Project Seeking Support** : Projets cherchant mentors/BA
- **Mentorship/BA Offer** : Offres de mentorat/investissement

#### 6. Investments
- **Investor Profile** : Profils d'investisseurs
- **Funding Opportunity** : Opportunités de financement

#### 7. Scouting
- **Deal Flow Listing** : Deal flows partagés
- **Investor Thesis** : Thèses d'investissement

#### 8. Events
- **Event** : Événements
- **Call for Startups** : Appels à candidatures startups

#### 9. Autres
- **Venture Program** : Programmes d'entrepreneuriat
- **Chill & Work Spot** : Lieux de coworking
- **Market Advisor** : Conseillers marché

### Features V1 vs Hors V1

####   V1 (Indispensables)
1. **Authentification** : Register, Login, Profils
2. **Opportunities Core** :
   - Créer une opportunité
   - Lister les opportunités
   - Voir une opportunité
   - Recherche basique
3. **Applications** :
   - Postuler à une opportunité
   - Workflow de candidature (Draft → Submitted → Review)
4. **Profils** :
   - Profil BtoC (individu)
   - Profil BtoB (entreprise)
5. **Messages** :
   - Messages privés (1-to-1)
   - Discussions publiques liées aux opportunités
6. **Social** :
   - Follow/Unfollow
   - Like/Save opportunités
7. **Notifications basiques** : Email pour applications

#### ⏸  Hors V1 (Post-MVP - À ajouter après)
**Note** : Ces features seront développées après V1, mais ne sont pas la première priorité.

1. **AI Generation** : Génération automatique de contenu
2. **Referral System** : Système de parrainage complet
3. **Premium Features** : Boost, qualification
4. **Tasks** : Gestion de tâches avancée
5. **Ratings** : Système de notation
6. **Real-time** : Chat en temps réel
7. **Analytics** : Tableaux de bord avancés
8. **Market Advisor** : Module spécialisé
9. **Venture Programs** : Programmes multi-jours
10. **Chill & Work Spots** : Annuaire de lieux

---

## Parcours utilisateurs

### Parcours Owner (Créateur d'opportunité)

**Documentation créée** : Voir `docs/PARCOURS_OWNER_ADMIN.md`

**Workflow identifié** (basé sur données CSV) :
1. **Création** : Sélection type → Formulaire → Publication (Draft/Active)
2. **Gestion** : Liste avec filtres (Draft/Active/Archived) → Édition/Suppression
3. **Candidatures** : Liste → Vue détaillée → Review → Feedback → Changement statut
4. **Dashboard** : Métriques (opportunités, candidatures, messages)

### Parcours Admin

**Documentation créée** : Voir `docs/PARCOURS_OWNER_ADMIN.md`

**Fonctionnalités identifiées** (basé sur données CSV) :
1. **Dashboard** : Métriques globales, activité récente
2. **Modération** : Opportunités (PENDING → ACTIVE), Utilisateurs, Contenu
3. **Configuration** : Industries, Markets, Features, Application Processes

---

## Livrables attendus

1. **Document des parcours utilisateurs** (User, Owner, Admin)
   - Diagrammes de flux
   - Wireframes ou captures d'écran annotées
   - Liste des actions possibles

2. **Liste des features V1 vs hors V1**   (ci-dessus)

3. **Arbitrages produits**
   - Décisions sur ce qui est dans V1
   - Justifications

---

##   Parcours documentés

**Documentation créée** : `docs/PARCOURS_SYNTHESE.md`

**Approche** : Documentation basée sur l'analyse des données CSV Glide, à valider par discussion plutôt que description d'images.

**Parcours identifiés** :
-   Parcours USER (Candidat) - 7 étapes principales
-   Parcours OWNER (Créateur) - 4 sections principales
-   Parcours ADMIN - 3 sections principales

**Voir** : `docs/PARCOURS_SYNTHESE.md` pour les détails complets

