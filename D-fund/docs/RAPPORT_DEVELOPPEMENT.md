# Rapport de Développement - D-Fund

**Date** : 22 janvier 2026

## Résumé des travaux effectués

### 1. Configuration de l'environnement

#### Connexion à Supabase
- Configuration de la connection string avec le Connection Pooler
- Format utilisé : `postgresql://postgres.eblxcvivlowdqfbhhple:[REDACTED]@aws-1-eu-north-1.pooler.supabase.com:5432/postgres`
- Port 5432 (Session Mode) pour compatibilité avec Prisma migrations
- Base de données synchronisée avec le schéma Prisma

#### Structure Prisma
- Schéma partagé à la racine : `/prisma/schema.prisma`
- Backend référence : `../prisma/schema.prisma`
- Client Prisma généré et fonctionnel

### 2. Implémentation POST /opportunities

#### Backend
- Endpoint `POST /api/v1/opportunities` implémenté
- Authentification JWT requise via `@UseGuards(JwtAuthGuard)`
- Validation complète via `CreateOpportunityDto`
- Statut par défaut : `DRAFT` si non spécifié
- Retourne l'opportunité créée avec les informations du owner
- Service `OpportunitiesService.create()` avec gestion complète des champs

#### Frontend
- Fonction `createOpportunity()` ajoutée dans `app/lib/api.ts`
- Types TypeScript pour `OpportunityType` et `OpportunityStatus`
- Interface `CreateOpportunityData` pour la création
- Gestion automatique de l'authentification via `apiJson()`

### 3. Scripts de test et nettoyage

#### Script de test avec nettoyage automatique
- `scripts/test-opportunities-clean.ts` : Test complet de POST /opportunities
- Crée un utilisateur de test, teste l'endpoint, puis nettoie automatiquement
- Gestion des signaux (SIGINT, SIGTERM) pour nettoyage même en cas d'interruption

#### Script de nettoyage manuel
- `scripts/cleanup-test-data.ts` : Nettoie les données de test existantes
- Supprime les opportunités et utilisateurs de test
- Nettoie les applications orphelines

## Commandes essentielles

### Démarrage des serveurs

```bash
# Backend (Terminal 1)
npm run backend:dev

# Frontend (Terminal 2)
npm run frontend:dev
```

### Tests

```bash
# Test de connexion à Supabase
npm run db:test

# Test POST /opportunities avec nettoyage automatique
npm run test:opportunities

# Nettoyage manuel des données de test
npm run cleanup:test
```

### Base de données

```bash
# Générer le client Prisma
npm run db:generate

# Synchroniser le schéma avec Supabase
npm run db:push

# Ouvrir Prisma Studio (interface graphique)
npm run db:studio

# Ajouter des données de seed
npm run db:seed
```

## Endpoints API disponibles

### Authentification
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion

### Opportunities
- `GET /api/v1/opportunities` - Liste des opportunités (filtres, recherche, pagination)
- `GET /api/v1/opportunities/:id` - Détails d'une opportunité
- `GET /api/v1/opportunities/user/:userId` - Opportunités d'un utilisateur
- `POST /api/v1/opportunities` - Créer une opportunité (authentification requise)
- `PUT /api/v1/opportunities/:id` - Modifier une opportunité (authentification requise)
- `DELETE /api/v1/opportunities/:id` - Supprimer une opportunité (authentification requise)

### Applications
- `GET /api/v1/applications` - Liste des candidatures
- `POST /api/v1/applications` - Créer une candidature
- `PUT /api/v1/applications/:id` - Modifier une candidature

### Profiles
- `GET /api/v1/profiles/:userId` - Profil d'un utilisateur
- `GET /api/v1/profiles/lists/talents` - Liste des talents
- `GET /api/v1/profiles/lists/companies` - Liste des entreprises

### Messages
- `GET /api/v1/messages/public/:discussionId` - Messages publics
- `GET /api/v1/messages/private/:discussionId` - Messages privés

## Utilisation dans le frontend

### Créer une opportunité

```typescript
import { createOpportunity } from '@/app/lib/api'

const opportunity = await createOpportunity({
  name: "Développeur Full Stack",
  type: "JOB_OPPORTUNITY",
  description: "Description de l'opportunité",
  status: "ACTIVE",
  city: "Paris",
  country: "France",
  remote: true,
  tags: ["React", "Node.js"],
  industries: ["Tech"],
  markets: ["Europe"]
})
```

### Authentification

```typescript
import { apiJson, setAuthToken } from '@/app/lib/api'

// Login
const { token, user } = await apiJson('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})
setAuthToken(token)

// Les appels suivants incluront automatiquement le token
```

## Configuration

### Variables d'environnement

**`.env` (racine)** - Backend :
```
DATABASE_URL="postgresql://postgres.eblxcvivlowdqfbhhple:[REDACTED]@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="d-fund-jwt-secret-key-change-in-production-2025"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**`.env.local` (racine)** - Frontend :
```
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

## Tests effectués

### POST /opportunities
- Création avec authentification : SUCCESS
- Validation des données : SUCCESS
- Protection sans authentification : SUCCESS (Unauthorized)
- Sauvegarde dans Supabase : SUCCESS
- Visibilité dans la liste : SUCCESS
- Nettoyage automatique : SUCCESS

## Prochaines étapes recommandées

1. Compléter les endpoints Applications (POST, PUT, submit, review)
2. Implémenter la mise à jour des profils (PUT /profiles)
3. Intégrer le frontend avec les endpoints backend
4. Ajouter l'upload d'images (Supabase Storage)
5. Implémenter les notifications email (Resend)

## Notes techniques

- Connection Pooler utilisé pour contourner les restrictions réseau sur le port 5432 direct
- Session Mode (port 5432) utilisé pour compatibilité avec Prisma migrations
- Tous les tests incluent un nettoyage automatique pour éviter la pollution de la base de données
- Structure monorepo avec Prisma partagé à la racine
