
## Weekly recap


#### 2. Nouvelles fonctionnalités

**Création d'opportunités**
- Les utilisateurs peuvent créer des opportunités depuis l'application
- Validation automatique des données, statut par défaut : Brouillon
- Endpoint : POST /api/v1/opportunities

**Mise à jour des profils**
- Talents : mise à jour compétences, industries, préférences
- Entreprises : modification description, logo, site web
- Protection : chaque utilisateur ne peut modifier que son propre profil
- Endpoints : PUT /api/v1/profiles/bto-c/:userId et PUT /api/v1/profiles/bto-b/:userId

#### 3. Qualité et sécurité
- Tests automatisés avec nettoyage automatique des données de test
- Protection par authentification sur les fonctionnalités sensibles
- Validation des données à chaque étape

#### 4. Récap des endpoints en place
- **Auth** : register (POST), login (POST), sessions JWT, routes protégées
- **Opportunities** : liste avec filtres/recherche (GET), détail (GET/:id), par user (GET/user/:userId), création (POST), modification (PUT), suppression (DELETE) — 19 types supportés
- **Applications** : liste par opportunité (GET/opportunity/:id), liste par user (GET/user/:userId), création (POST), modification (PUT), submit (POST/:id/submit), review (PUT/:id/review) — workflow Brouillon → Soumis → En review → Succès/Archivé
- **Profiles** : profil complet (GET), listes talents/entreprises (GET), mise à jour BtoC/BtoB (PUT)
- **Messages** : publics par discussion (GET), privés (GET)
- **Users** : consultation (GET/:id)

#### 5. Corrections backend
- Correction du bug "Internal server error" sur la création de compte : conflit `@IsEnum(UserRole)` avec class-validator au runtime dans `RegisterDto`
- RegisterDto : validation du rôle simplifiée (plus d’enum Prisma dans le DTO), typage du rôle géré dans `AuthService` avec cast explicite vers `UserRole`
- Build backend (Nest) OK ; image Docker backend rebuild correctement avec le point d’entrée `dist/main.js`



