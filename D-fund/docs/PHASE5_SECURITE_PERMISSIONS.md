# Phase 5 — Sécurité & permissions

> ⚠️ **Document de planification historique (janvier 2026), rédigé avant le développement.** Il décrit des intentions et options envisagées à l'époque, pas nécessairement l'état réel actuel — plusieurs points ici présentés comme "à choisir" ou "à intégrer" sont depuis longtemps tranchés et en production. Pour l'état technique réel et vérifié, voir [`ETAT_TECHNIQUE_ACTUEL.md`](./ETAT_TECHNIQUE_ACTUEL.md).

##   Rôles

### 1. USER (Utilisateur standard)
**Description** : Utilisateur de base de la plateforme

### 2. OWNER (Créateur d'opportunité)
**Description** : Utilisateur qui crée des opportunités  
**Note** : Peut être un USER avec des opportunités créées

### 3. ADMIN (Administrateur)
**Description** : Administrateur de la plateforme avec droits étendus

---

##   Permissions par rôle

### USER

#### Peut faire :
-   Créer son profil (BtoC ou BtoB)
-   Modifier son propre profil
-   Créer des opportunités
-   Modifier ses propres opportunités
-   Supprimer ses propres opportunités (si DRAFT)
-   Postuler à des opportunités
-   Modifier ses propres candidatures (si DRAFT)
-   Envoyer des messages
-   Créer des discussions publiques
-   Suivre/dé-suivre des users
-   Like/Save des opportunités
-   Voir les opportunités publiques
-   Voir les profils publics

#### Ne peut pas faire :
-  Modifier les profils d'autres users
-  Modifier les opportunités d'autres users
-  Voir les candidatures d'autres users (sauf owner)
-  Supprimer des opportunités actives d'autres users
-  Accéder aux données admin

### OWNER (implicite - USER avec opportunités)

#### Peut faire (en plus de USER) :
-   Voir toutes les candidatures de ses opportunités
-   Review des candidatures (ajouter feedback)
-   Changer le statut des candidatures (SUBMITTED → OWNER_REVIEW → SUCCESS/ARCHIVED)
-   Modifier ses opportunités même si ACTIVE (avec restrictions)
-   Archiver/fermer ses opportunités
-   Boost ses opportunités (si premium)

#### Ne peut pas faire :
-  Modifier les candidatures d'autres owners
-  Voir les candidatures d'autres opportunités

### ADMIN

#### Peut faire (en plus de USER) :
-   Voir tous les users
-   Modifier n'importe quel profil
-   Modifier n'importe quelle opportunité
-   Voir toutes les candidatures
-   Modérer le contenu
-   Supprimer des opportunités
-   Bannir/désactiver des users
-   Accéder aux analytics
-   Gérer les industries/markets/features
-   Voir les logs système

---

##   Données sensibles

### Données à protéger

1. **Passwords** : Jamais exposées, toujours hashées (bcrypt)
2. **Emails** : Accessibles seulement au user lui-même et admin
3. **Messages privés** : Seulement aux participants
4. **Candidatures** : Seulement au candidat et au owner
5. **Données financières** : Si ajoutées (paiements, etc.)

### Règles d'accès

#### Profils
- **Public** : Si `visibility = true`, visible par tous
- **Privé** : Si `visibility = false`, visible seulement par le user et admin

#### Opportunités
- **DRAFT** : Visible seulement par le owner
- **PENDING/ACTIVE** : Visible par tous
- **ARCHIVED/CLOSED** : Visible par tous mais marquées comme terminées

#### Candidatures
- **Candidat** : Peut voir ses propres candidatures
- **Owner** : Peut voir les candidatures de ses opportunités
- **Admin** : Peut voir toutes les candidatures

#### Messages
- **Privés** : Seulement aux participants de la discussion
- **Publics** : Visibles par tous

---

## 🛡  Sécurité technique

### Authentification
- **JWT tokens** : Expiration 7 jours
- **Refresh tokens** : À implémenter (post-V1)
- **OAuth** : Via Supabase (futur)

### Validation
- **Input validation** : class-validator sur tous les DTOs
- **SQL injection** : Prisma protège automatiquement
- **XSS** : Sanitization côté frontend

### Rate Limiting
- **À implémenter** : Limiter les requêtes par IP/user
- **Outils** : @nestjs/throttler

### CORS
- **Configuré** : Seulement frontend URL autorisée
- **Credentials** : Activé pour cookies (si nécessaire)

---

## 📦 Livrables

1. **Matrice des permissions**   (ce document)
2. **Guards NestJS**   (à implémenter)
   - JwtAuthGuard (déjà créé)
   - RolesGuard (à créer)
   - OwnerGuard (à créer)
3. **Tests de sécurité**   (à créer)

---

##   Actions requises

1. **Implémenter RolesGuard** pour ADMIN
2. **Implémenter OwnerGuard** pour vérifier ownership
3. **Ajouter rate limiting**
4. **Tests de permissions** pour chaque endpoint

