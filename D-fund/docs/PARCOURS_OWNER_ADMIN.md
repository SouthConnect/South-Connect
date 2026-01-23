

## Parcours Owner (Créateur d'opportunité)

### 1. Création d'opportunité

#### Étape 1 : Sélection du type 
**Actions** :
- [ ] Liste des types d'opportunités disponibles
- [ ] Sélection d'un type
- [ ] Bouton "Créer" ou "Continuer"

**Types disponibles** (d'après Features.csv) :
- Job Opportunity
- Talent Profile
- Co-founder Opportunity
- Co-founder Profile
- Business Idea
- Service Listing
- Event
- Etc. (18 types au total)

#### Étape 2 : Formulaire de création 
**Champs visibles** (d'après Opportunities.csv) :
- [ ] Nom de l'opportunité (obligatoire)
- [ ] Punchline (optionnel)
- [ ] Description (obligatoire)
- [ ] Image/Background
- [ ] Localisation (City, Country, Remote)
- [ ] Dates (Start, End, Expiration)
- [ ] Industries
- [ ] Markets
- [ ] Tags
- [ ] Application Process (Paid, Check, Free Access)
- [ ] Pricing (si applicable)
- [ ] URL (optionnel)

**Options spéciales** :
- [ ] AI Generation (génération automatique de description)
- [ ] Preview avant publication
- [ ] Sauvegarder en brouillon

#### Étape 3 : Publication
**États possibles** :
- **DRAFT** : Brouillon, visible seulement par Owner
- **PENDING** : En attente de modération (si applicable)
- **ACTIVE** : Publiée et visible par tous
- **ARCHIVED** : Archivée
- **CLOSED** : Fermée

**Actions** :
- [ ] Publier (Draft → Active)
- [ ] Sauvegarder comme brouillon
- [ ] Preview
- [ ] Annuler

### 2. Gestion des opportunités créées

#### Liste des opportunités  
**Filtres** :
- [ ] Toutes
- [ ] Draft
- [ ] Active
- [ ] Archived
- [ ] Closed

**Actions par opportunité** :
- [ ] Voir détails
- [ ] Éditer
- [ ] Dupliquer
- [ ] Archiver
- [ ] Supprimer (si Draft)
- [ ] Boost (premium)

**Métriques affichées** :
- [ ] Nombre de vues
- [ ] Nombre de candidatures
- [ ] Nombre de likes
- [ ] Nombre de sauvegardes

### 3. Gestion des candidatures

#### Liste des candidatures 
**Filtres** :
- [ ] Toutes
- [ ] Draft (brouillons)
- [ ] Pending (soumises, en attente)
- [ ] Active (en cours de review)
- [ ] Archived (archivées)

**Informations affichées** :
- [ ] Nom du candidat
- [ ] Date de soumission
- [ ] Statut (Draft, Submitted, Review, Success, Archived)
- [ ] Aperçu de la candidature

#### Vue détaillée d'une candidature  
**Informations** :
- [ ] Profil du candidat (lien)
- [ ] Lettre de motivation (Goal Letter)
- [ ] Date de soumission
- [ ] Statut actuel
- [ ] Historique (si applicable)

**Actions Owner** :
- [ ] Voir le profil complet du candidat
- [ ] Ajouter un feedback
- [ ] Changer le statut :
  - Submitted → Owner Review
  - Owner Review → Success (acceptée)
  - Owner Review → Archived (refusée)
- [ ] Envoyer un message au candidat
- [ ] Créer une tâche liée

#### Workflow de review
**Étapes** :
1. **Application Submitted** : Candidature soumise
   - Owner reçoit notification
   - Peut voir la candidature
   
2. **Owner Review** : Owner en train de review
   - Peut ajouter feedback
   - Peut communiquer avec le candidat
   
3. **Success** : Candidature acceptée
   - Candidat reçoit notification
   - Communication peut commencer
   
4. **Archived** : Candidature refusée/archivée
   - Candidat reçoit notification avec feedback

### 4. Dashboard Owner  
**Métriques** :
- [ ] Nombre total d'opportunités créées
- [ ] Nombre de candidatures reçues
- [ ] Taux de conversion
- [ ] Opportunités actives
- [ ] Messages non lus

**Actions rapides** :
- [ ] Créer une nouvelle opportunité
- [ ] Voir les candidatures en attente
- [ ] Voir les messages

---

##  Parcours Admin

### 1. Dashboard Admin

**Métriques globales** :
- [ ] Nombre total d'utilisateurs
- [ ] Nombre total d'opportunités
- [ ] Nombre total de candidatures
- [ ] Activité récente
- [ ] Contenu à modérer

### 2. Modération

#### Modération des opportunités
**Actions** :
- [ ] Voir les opportunités en attente (PENDING)
- [ ] Approuver une opportunité
- [ ] Rejeter une opportunité (avec raison)
- [ ] Modifier une opportunité
- [ ] Supprimer une opportunité

#### Modération des utilisateurs
**Actions** :
- [ ] Voir tous les utilisateurs
- [ ] Désactiver/Bannir un utilisateur
- [ ] Modifier un profil
- [ ] Voir l'activité d'un utilisateur

#### Modération du contenu 
**Actions** :
- [ ] Modérer les messages publics
- [ ] Modérer les discussions
- [ ] Supprimer du contenu inapproprié

### 3. Configuration

#### Gestion des référentiels 
**Actions** :
- [ ] Gérer les Industries
- [ ] Gérer les Markets
- [ ] Gérer les Features (types d'opportunités)
- [ ] Gérer les Application Processes

#### Paramètres système  
**Actions** :
- [ ] Configuration générale
- [ ] Gestion des notifications
- [ ] Analytics et rapports

---

##   Workflows identifiés

### Workflow création opportunité (Owner)
```
1. Dashboard → "Créer une opportunité"
2. Sélectionner le type d'opportunité
3. Remplir le formulaire
   - Optionnel : Utiliser AI pour générer description
   - Optionnel : Preview
4. Sauvegarder en DRAFT ou Publier directement
5. Si publié : Opportunité devient ACTIVE
```

### Workflow candidature (Owner)
```
1. Owner voit notification "Nouvelle candidature"
2. Owner va dans "Mes candidatures"
3. Owner ouvre la candidature
4. Owner peut :
   - Voir le profil du candidat
   - Ajouter un feedback
   - Changer le statut (Submitted → Review → Success/Archived)
5. Candidat reçoit notification du changement
```

### Workflow modération (Admin)
```
1. Admin voit opportunité en PENDING
2. Admin review l'opportunité
3. Admin peut :
   - Approuver → Opportunité devient ACTIVE
   - Rejeter → Opportunité reste PENDING ou est supprimée
   - Modifier → Corriger puis approuver
```

