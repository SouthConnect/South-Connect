# Commandes Essentielles - D-Fund

## Démarrage de l'application

### Backend
```bash
npm run backend:dev
```
- Démarre le serveur API sur http://localhost:3001
- Mode watch activé (rechargement automatique)

### Frontend
```bash
npm run frontend:dev
```
- Démarre l'interface utilisateur sur http://localhost:3000
- Hot reload activé

## Tests

### Test de connexion base de données
```bash
npm run db:test
```
- Vérifie la connexion à Supabase
- Affiche les tables existantes

### Test POST /opportunities
```bash
npm run test:opportunities
```
- Crée un utilisateur de test
- Teste la création d'opportunité
- Nettoie automatiquement les données de test

### Nettoyage manuel des données de test
```bash
npm run cleanup:test
```
- Supprime les opportunités de test
- Supprime les utilisateurs de test
- Nettoie les applications orphelines

## Base de données

### Générer le client Prisma
```bash
npm run db:generate
```
- Génère le client TypeScript pour Prisma
- À exécuter après modification du schéma

### Synchroniser le schéma
```bash
npm run db:push
```
- Applique le schéma Prisma à Supabase
- Crée/modifie les tables si nécessaire

### Interface graphique
```bash
npm run db:studio
```
- Ouvre Prisma Studio dans le navigateur
- Permet de visualiser et modifier les données

### Ajouter des données de test
```bash
npm run db:seed
```
- Exécute le script de seed
- Ajoute des données initiales dans la base

## Utilitaires

### Vérifier le statut Supabase
```bash
npm run supabase:check
```
- Teste la connectivité au projet Supabase
- Affiche les informations de connexion

### Encoder un mot de passe
```bash
npm run encode-password "votre-mot-de-passe"
```
- Encode un mot de passe pour la connection string
- Utile si le mot de passe contient des caractères spéciaux

### Récupérer votre IP publique
```bash
npm run get-ip
```
- Affiche votre adresse IP publique
- Utile pour configurer les restrictions Supabase

## Build de production

### Backend
```bash
npm run backend:build
```
- Compile le backend pour la production
- Génère les fichiers dans `backend/dist/`

### Frontend
```bash
npm run frontend:build
```
- Build optimisé du frontend
- Génère les fichiers statiques dans `frontend/.next/`

## Installation

### Installer toutes les dépendances
```bash
npm run install:all
```
- Installe les dépendances de la racine
- Installe les dépendances du backend
- Installe les dépendances du frontend

## Endpoints API disponibles

### Authentification
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion

### Opportunities
- `GET /api/v1/opportunities` - Liste (filtres, recherche, pagination)
- `GET /api/v1/opportunities/:id` - Détails
- `GET /api/v1/opportunities/user/:userId` - Par utilisateur
- `POST /api/v1/opportunities` - Créer (auth requise)
- `PUT /api/v1/opportunities/:id` - Modifier (auth requise)
- `DELETE /api/v1/opportunities/:id` - Supprimer (auth requise)

### Applications
- `GET /api/v1/applications/opportunity/:opportunityId` - Candidatures d'une opportunité
- `GET /api/v1/applications/user/:userId` - Candidatures d'un utilisateur
- `POST /api/v1/applications` - Créer (auth requise)
- `PUT /api/v1/applications/:id` - Modifier (auth requise)
- `POST /api/v1/applications/:id/submit` - Soumettre (auth requise)
- `PUT /api/v1/applications/:id/review` - Review par owner (auth requise)

### Profiles
- `GET /api/v1/profiles/:userId` - Profil complet
- `GET /api/v1/profiles/lists/talents` - Liste des talents
- `GET /api/v1/profiles/lists/companies` - Liste des entreprises
- `PUT /api/v1/profiles/bto-c/:userId` - Mettre à jour profil talent (auth requise)
- `PUT /api/v1/profiles/bto-b/:userId` - Mettre à jour profil entreprise (auth requise)

### Messages
- `GET /api/v1/messages/public/:discussionId` - Messages publics
- `GET /api/v1/messages/private/:discussionId` - Messages privés

## Exemples d'utilisation

### Créer une opportunité (avec curl)
```bash
TOKEN="votre-token-jwt"
curl -X POST http://localhost:3001/api/v1/opportunities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Développeur Full Stack",
    "type": "JOB_OPPORTUNITY",
    "description": "Description...",
    "status": "ACTIVE"
  }'
```

### Mettre à jour un profil talent
```bash
TOKEN="votre-token-jwt"
curl -X PUT http://localhost:3001/api/v1/profiles/bto-c/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tags": ["React", "Node.js"],
    "industries": ["Tech"],
    "seniorityLevel": "Senior"
  }'
```

## Dépannage

### Le backend ne démarre pas
- Vérifier que le port 3001 n'est pas utilisé
- Vérifier que `.env` contient `DATABASE_URL`
- Vérifier les logs dans le terminal

### Le frontend ne démarre pas
- Vérifier que le port 3000 n'est pas utilisé
- Vérifier que `.env.local` existe
- Vérifier les logs dans le terminal

### Erreur de connexion base de données
- Exécuter `npm run db:test` pour diagnostiquer
- Vérifier que Supabase est actif
- Vérifier la connection string dans `.env`
