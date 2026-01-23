# Phase 3 — Architecture fonctionnelle

##    Découpage Frontend / Backend / DB

### Frontend (Next.js)
**Responsabilités** :
- UI/UX
- Affichage des données
- Formulaires et interactions
- Navigation
- Gestion d'état client (React Query)
- Authentification côté client (tokens JWT)

**Technologies** :
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query (appels API)

### Backend (NestJS)
**Responsabilités** :
- Logique métier
- Validation des données
- Authentification (JWT)
- Permissions et autorisations
- Workflows métier
- Génération de contenu AI (futur)
- Orchestration des notifications

**Technologies** :
- NestJS
- TypeScript
- Prisma ORM
- JWT (Passport)

### Base de données (PostgreSQL via Supabase)
**Responsabilités** :
- Stockage des données
- Relations et contraintes
- Index pour performance
- Triggers (si nécessaire)

**Technologies** :
- PostgreSQL
- Prisma (ORM)
- Supabase (managed)

---

##   Flux principaux

### 1. Flux d'authentification
```
User → Frontend (Login Form)
  → Backend POST /auth/login
  → Backend vérifie credentials
  → Backend génère JWT
  → Frontend stocke token
  → Frontend utilise token pour requêtes suivantes
```

### 2. Flux de création d'opportunité
```
Owner → Frontend (Create Form)
  → Backend POST /opportunities (avec JWT)
  → Backend valide données
  → Backend crée Opportunity (status: DRAFT)
  → Backend peut générer AI content (optionnel)
  → Backend retourne Opportunity
  → Frontend affiche confirmation
```

### 3. Flux de candidature
```
User → Frontend (Apply Button)
  → Backend POST /applications (avec JWT)
  → Backend crée Application (stage: DRAFT)
  → Backend envoie notification email à Owner
  → Frontend affiche statut "Application créée"
  → User peut compléter et soumettre
  → Backend POST /applications/:id/submit
  → Backend met à jour stage: SUBMITTED
  → Backend envoie notification à Owner
```

### 4. Flux de review (Owner)
```
Owner → Frontend (Applications list)
  → Backend GET /opportunities/:id/applications
  → Owner sélectionne application
  → Backend GET /applications/:id
  → Owner ajoute feedback
  → Backend PUT /applications/:id/review
  → Backend met à jour stage: OWNER_REVIEW
  → Backend envoie notification au candidat
```

### 5. Flux de messagerie
```
User A → Frontend (Message form)
  → Backend POST /messages (avec discussionId)
  → Backend crée Message
  → Backend met à jour lastMessageAt de Discussion
  → Backend envoie notification (email/push) à User B
  → Frontend affiche message en temps réel (futur: WebSocket)
```

### 6. Flux de recherche
```
User → Frontend (Search form)
  → Backend GET /opportunities?search=...&filters=...
  → Backend interroge DB avec Prisma
  → Backend retourne résultats paginés
  → Frontend affiche résultats
```

---

##   Events métier clés

### User Events
1. **UserRegistered** : Nouvel utilisateur inscrit
   - Déclenche : Email de bienvenue
   - Déclenche : Création profil BtoC/BtoB si nécessaire

2. **UserLoggedIn** : Connexion utilisateur
   - Déclenche : Mise à jour lastLoginAt (futur)

3. **ProfileUpdated** : Profil modifié
   - Déclenche : Notification aux followers (optionnel)

### Opportunity Events
4. **OpportunityCreated** : Nouvelle opportunité créée
   - Déclenche : Notification aux users matching (futur)
   - Déclenche : Indexation pour recherche (futur)

5. **OpportunityPublished** : Opportunité publiée (DRAFT → ACTIVE)
   - Déclenche : Notification aux followers du owner
   - Déclenche : Email de confirmation au owner

6. **OpportunityBoosted** : Opportunité boostée
   - Déclenche : Mise en avant dans les résultats
   - Déclenche : Notification (si premium)

### Application Events
7. **ApplicationCreated** : Candidature créée (DRAFT)
   - Déclenche : Aucune notification (brouillon)

8. **ApplicationSubmitted** : Candidature soumise (DRAFT → SUBMITTED)
   - Déclenche : **Email au Owner** (priorité)
   - Déclenche : Notification in-app au Owner
   - Déclenche : Email de confirmation au Candidat

9. **ApplicationReviewed** : Candidature reviewée par Owner
   - Déclenche : **Email au Candidat** avec feedback
   - Déclenche : Notification in-app au Candidat

10. **ApplicationAccepted** : Candidature acceptée (SUCCESS)
    - Déclenche : **Email au Candidat** (priorité)
    - Déclenche : Notification in-app
    - Déclenche : Email au Owner (confirmation)

### Message Events
11. **MessageSent** : Message envoyé
    - Déclenche : Notification email/push au destinataire
    - Déclenche : Mise à jour unreadCount

12. **DiscussionCreated** : Nouvelle discussion créée
    - Déclenche : Notification aux participants

### Social Events
13. **UserFollowed** : User A suit User B
    - Déclenche : Notification à User B (optionnel)

14. **OpportunityLiked** : Opportunité likée
    - Déclenche : Notification au Owner (optionnel)

---

## 📦 Livrables

1. **Document d'architecture**   (ce document)
2. **Diagramme de flux**   (à créer avec outil)
3. **Liste des events métier**   (ci-dessus)

---

##   Intégrations futures

- **Supabase Realtime** : Pour messages en temps réel
- **Supabase Storage** : Pour upload de fichiers
- **Resend** : Pour emails transactionnels
- **AI Service** : Pour génération de contenu (futur)

