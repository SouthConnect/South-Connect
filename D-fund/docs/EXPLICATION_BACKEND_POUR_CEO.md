# Explication du Backend D-fund - Pour CEO

Objectif : comprendre l'architecture technique sans avoir besoin de savoir coder.

---

## Vue d'ensemble

Le backend de D-fund est un serveur d'API. Concrètement, il reçoit les requêtes du frontend quand un utilisateur clique quelque part ou remplit un formulaire, valide et traite ces données, les stocke dans une base PostgreSQL, puis renvoie des réponses structurées au frontend.

Technologies qu'on utilise :
- NestJS : c'est un framework backend, un peu comme Express mais avec une structure plus rigide qui facilite l'organisation du code
- PostgreSQL : notre base de données relationnelle
- Prisma : l'outil qui fait le lien entre notre code et la base de données
- JWT : le système de tokens qu'on utilise pour l'authentification

---

## Structure du Backend

Voici comment le code est organisé :

```
backend/
├── src/
│   ├── main.ts                    # Point d'entrée du serveur
│   ├── app.module.ts             # Configuration globale
│   └── modules/
│       ├── auth/                 # Authentification (login, register)
│       ├── opportunities/        # Gestion des opportunités
│       ├── applications/         # Gestion des candidatures
│       ├── users/                # Gestion des utilisateurs
│       ├── prisma/               # Connexion à la base de données
│       └── notifications/        # Envoi d'emails
└── prisma/
    └── schema.prisma             # Modèle de données (tables)
```

Chaque module contient généralement trois types de fichiers :
- Les controllers (fichiers `*.controller.ts`) : ce sont les routes API, les portes d'entrée
- Les services (fichiers `*.service.ts`) : c'est là qu'on met la logique métier, les règles
- Les DTOs (dans le dossier `dto/`) : les formats de données qu'on attend

---

## Les Routes API (Controllers)

Les Controllers définissent les endpoints, c'est-à-dire les URLs que le frontend va appeler.

### Exemple : Authentification

Voici le code du controller d'authentification (`auth.controller.ts`) :

```typescript
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    return user;
  }
}
```

Ce que ça veut dire :
- `@Controller('auth')` signifie que toutes les routes de ce controller commencent par `/api/v1/auth`
- `@Post('register')` crée la route `POST /api/v1/auth/register` pour créer un compte
- `@Get('me')` crée la route `GET /api/v1/auth/me` pour récupérer l'utilisateur connecté
- `@UseGuards(JwtAuthGuard)` protège la route : il faut être connecté pour y accéder

Comment ça fonctionne en pratique :
Quand le frontend envoie un formulaire d'inscription, il fait un appel à `POST /auth/register`. Le controller reçoit les données et délègue le travail au `AuthService`. Le service s'occupe du vrai boulot (hash du mot de passe, création en base, etc.), puis le controller retourne le résultat au frontend.

---

### Exemple : Opportunités

Voici le controller des opportunités (`opportunities.controller.ts`) :

```typescript
@Controller('opportunities')
export class OpportunitiesController {
  @Get()
  findAll(@Query() query: ListOpportunitiesDto) {
    return this.opportunitiesService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findOne(id);
  }
}
```

Les routes disponibles :
- `GET /opportunities` liste toutes les opportunités, avec des filtres optionnels
- `POST /opportunities` permet de créer une nouvelle opportunité, mais il faut être connecté
- `GET /opportunities/:id` récupère une opportunité spécifique

Quelques détails importants :
- `@UseGuards(JwtAuthGuard)` protège certaines routes : il faut être connecté
- `@CurrentUser() user` récupère automatiquement l'utilisateur connecté depuis le token
- `@Query()` récupère les paramètres dans l'URL, par exemple `?search=startup&orderBy=createdAt`
- `@Body()` récupère les données envoyées dans le corps de la requête, généralement du JSON

---

### Exemple : Candidatures

Le controller des candidatures (`applications.controller.ts`) :

```typescript
@Controller('applications')
export class ApplicationsController {
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findForUser(@Param('userId') userId: string, @CurrentUser() user: User) {
    // Sécurité : on ne permet pas de récupérer les candidatures d'un autre user
    if (user.id !== userId) {
      throw new ForbiddenException('You can only access your own applications');
    }
    return this.applicationsService.findForUser(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(user.id, dto);
  }

  @Put(':id/review')
  @UseGuards(JwtAuthGuard, ApplicationOwnerGuard)
  review(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: ReviewApplicationDto) {
    return this.applicationsService.review(id, user.id, dto);
  }
}
```

Ce qu'on peut faire :
- `GET /applications/user/:userId` récupère toutes les candidatures d'un utilisateur
- `POST /applications` crée une nouvelle candidature
- `PUT /applications/:id/review` met à jour le statut d'une candidature, par exemple passer de "In review" à "Success"

Côté sécurité :
On vérifie que l'utilisateur ne peut accéder qu'à ses propres candidatures. Le `ApplicationOwnerGuard` s'assure que seul le propriétaire de l'opportunité peut reviewer les candidatures.

---

## La Logique Métier (Services)

Les Services contiennent la logique métier : les règles, les calculs, les vérifications. C'est là qu'on met tout ce qui est spécifique à notre business.

### Exemple : Création de compte

Voici comment fonctionne la création d'un compte (`auth.service.ts`) :

```typescript
async register(dto: RegisterDto) {
  // 1. Hash du mot de passe (jamais stocké en clair)
  const hashedPassword = await bcrypt.hash(dto.password, 10);
  
  // 2. Création de l'utilisateur en base de données
  const user = await this.prisma.user.create({
    data: {
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      name: dto.name || `${dto.firstName} ${dto.lastName}`,
      role: UserRole.USER,
    },
  });

  // 3. Génération d'un token JWT (clé d'accès pour les prochaines requêtes)
  const token = this.jwtService.sign({ userId: user.id, email: user.email });

  // 4. Envoi d'un email de bienvenue (non bloquant)
  try {
    await this.notificationsService.sendWelcomeEmail(user);
  } catch (e) {
    // Si l'email échoue, on continue quand même
  }

  // 5. Retourne l'utilisateur (sans le mot de passe) + le token
  const { password, ...result } = user;
  return {
    user: result,
    token,
  };
}
```

Étape par étape :
1. Hash du mot de passe : on transforme "monMotDePasse123" en quelque chose comme "$2a$10$xyz..." qui est irréversible et sécurisé
2. Création en base : on insère l'utilisateur dans la table `users` avec toutes ses infos
3. Token JWT : on génère une clé unique qui servira à identifier l'utilisateur sur les prochaines requêtes
4. Email : on envoie un email de bienvenue, mais si ça échoue, ce n'est pas grave, l'inscription réussit quand même
5. Retour : on renvoie l'utilisateur créé (sans le mot de passe) plus le token

Pourquoi c'est important :
Le mot de passe n'est jamais stocké en clair, c'est une règle de sécurité de base. Le token permet au frontend de prouver qu'il est connecté sur les prochaines requêtes. Et si l'email échoue, l'inscription réussit quand même, ce qui rend le système plus résilient.

---

### Exemple : Création d'une candidature

Voici comment on crée une candidature (`applications.service.ts`) :

```typescript
async create(candidateId: string, dto: CreateApplicationDto) {
  // 1. Vérifier qu'il n'y a pas déjà une candidature pour cette opportunité
  const existing = await this.prisma.application.findUnique({
    where: {
      opportunityId_candidateId: {
        opportunityId: dto.opportunityId,
        candidateId,
      },
    },
  });

  if (existing) {
    throw new ConflictException('Application already exists');
  }

  // 2. Créer la candidature avec le statut "DRAFT"
  return this.prisma.application.create({
    data: {
      opportunityId: dto.opportunityId,
      candidateId,
      title: dto.title,
      goalLetter: dto.goalLetter,
      stage: 'DRAFT',
      isDraft: true,
      isClosed: false,
    },
  });
}
```

Ce qui se passe :
D'abord, on vérifie qu'un utilisateur ne peut pas candidater deux fois à la même opportunité. Ensuite, on crée la candidature avec le statut `DRAFT` (brouillon). On lie la candidature à l'opportunité via `opportunityId` et au candidat via `candidateId`.

Pourquoi c'est important :
Ça évite les doublons : une candidature = un utilisateur + une opportunité. Le statut `DRAFT` permet de sauvegarder sans soumettre. Et les relations garantissent l'intégrité des données : on ne peut pas créer une candidature pour une opportunité qui n'existe pas.

---

## Le Modèle de Données (Prisma Schema)

Le fichier `schema.prisma` définit toutes les tables de la base de données et leurs relations. C'est comme un plan de la base de données.

### Exemple : Modèle User

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  firstName     String?
  lastName      String?
  name          String?
  password      String?
  role          UserRole @default(USER)
  bio           String?
  profilePic    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  opportunities  Opportunity[]
  applications   Application[]
  sentMessages   Message[]
  receivedMessages Message[]
  
  @@index([email])
  @@map("users")
}
```

Ce que signifient les annotations :
- `@id` = c'est la clé primaire, l'identifiant unique
- `@unique` = l'email doit être unique, pas de doublon
- `String?` = le champ est optionnel, il peut être vide
- `@default(now())` = valeur par défaut = date actuelle
- `@updatedAt` = mise à jour automatique à chaque modification

Les relations :
- `opportunities Opportunity[]` signifie qu'un User peut avoir plusieurs Opportunités
- `applications Application[]` signifie qu'un User peut avoir plusieurs Candidatures
- `sentMessages Message[]` signifie qu'un User peut envoyer plusieurs Messages

---

### Exemple : Modèle Opportunity

```prisma
model Opportunity {
  id              String   @id @default(cuid())
  name            String
  punchline       String?
  description     String?   @db.Text
  type            OpportunityType
  status          OpportunityStatus @default(DRAFT)
  
  // Owner
  ownerId         String
  owner           User     @relation(fields: [ownerId], references: [id])
  
  // Location
  city            String?
  country         String?
  remote          Boolean?
  
  // Dates
  startDate       DateTime?
  endDate         DateTime?
  expirationDate  DateTime?
  
  // Relations
  applications    Application[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Ce qui est important ici :
- `ownerId` est l'ID de l'utilisateur qui a créé l'opportunité
- `owner User @relation(...)` crée la relation avec la table User : un Owner = un User
- `applications Application[]` signifie qu'une Opportunité peut avoir plusieurs Candidatures

Pourquoi c'est utile :
Les relations garantissent qu'une opportunité appartient toujours à un utilisateur existant. Si on supprime un User, on peut décider de supprimer ses opportunités aussi (cascade). Et on peut facilement récupérer toutes les candidatures d'une opportunité.

---

### Exemple : Modèle Application

```prisma
model Application {
  id              String   @id @default(cuid())
  
  // Relations
  opportunityId   String
  opportunity     Opportunity @relation(fields: [opportunityId], references: [id])
  
  candidateId     String
  candidate       User     @relation(fields: [candidateId], references: [id])
  
  // Contenu
  title           String?
  goalLetter      String?  @db.Text
  
  // Statut
  stage           ApplicationStage @default(DRAFT)
  isDraft         Boolean  @default(true)
  isClosed        Boolean  @default(false)
  
  // Dates
  submissionDate  DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([opportunityId, candidateId])
  @@map("applications")
}
```

Ce qu'il faut retenir :
- `opportunityId` + `candidateId` = une candidature lie un User à une Opportunity
- `@@unique([opportunityId, candidateId])` garantit qu'un utilisateur ne peut candidater qu'une fois par opportunité
- `stage` contient le statut de la candidature : DRAFT, SUBMITTED, OWNER_REVIEW, SUCCESS, ARCHIVED

Pourquoi c'est important :
La contrainte `@@unique` empêche les doublons au niveau de la base de données elle-même. Les relations garantissent qu'on ne peut pas créer une candidature pour une opportunité qui n'existe pas. Et le statut permet de suivre le workflow : brouillon → soumis → en review → accepté/refusé.

---

## Flux Complet : Exemple "Créer une Candidature"

Voici ce qui se passe quand un utilisateur crée une candidature depuis le frontend, étape par étape.

### Étape 1 : Frontend envoie la requête

Le frontend (Next.js) fait un appel API :

```typescript
// Frontend (Next.js)
const response = await fetch('http://localhost:3001/api/v1/applications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Token JWT récupéré au login
  },
  body: JSON.stringify({
    opportunityId: 'abc123',
    title: 'Ma candidature',
    goalLetter: 'Je suis intéressé par...'
  })
});
```

### Étape 2 : Controller reçoit la requête

Le controller reçoit la requête et vérifie le token :

```typescript
// Backend - applications.controller.ts
@Post()
@UseGuards(JwtAuthGuard)  // Vérifie que le token est valide
create(@CurrentUser() user: User, @Body() dto: CreateApplicationDto) {
  return this.applicationsService.create(user.id, dto);
}
```

Ce qui se passe :
- `JwtAuthGuard` vérifie le token. Si invalide, erreur 401
- `@CurrentUser() user` récupère l'utilisateur depuis le token
- `@Body() dto` récupère les données du formulaire

### Étape 3 : Service traite la logique

Le service vérifie les règles métier et crée la candidature :

```typescript
// Backend - applications.service.ts
async create(candidateId: string, dto: CreateApplicationDto) {
  // Vérifier qu'il n'y a pas déjà une candidature
  const existing = await this.prisma.application.findUnique({...});
  if (existing) throw new ConflictException('Application already exists');
  
  // Créer la candidature
  return this.prisma.application.create({
    data: {
      opportunityId: dto.opportunityId,
      candidateId,  // Récupéré automatiquement depuis le token
      title: dto.title,
      goalLetter: dto.goalLetter,
      stage: 'DRAFT',
    },
  });
}
```

Ce qui se passe :
- Vérification des règles métier (pas de doublon)
- Création en base de données via Prisma
- Retour de la candidature créée

### Étape 4 : Base de données stocke

Prisma génère automatiquement le SQL et insère les données :

```sql
-- Ce que Prisma génère automatiquement en SQL
INSERT INTO applications (
  id, opportunity_id, candidate_id, title, goal_letter, stage, is_draft, created_at
) VALUES (
  'xyz789', 'abc123', 'user456', 'Ma candidature', 'Je suis intéressé...', 'DRAFT', true, NOW()
);
```

### Étape 5 : Réponse au frontend

Le backend renvoie la candidature créée en JSON :

```json
{
  "id": "xyz789",
  "opportunityId": "abc123",
  "candidateId": "user456",
  "title": "Ma candidature",
  "goalLetter": "Je suis intéressé par...",
  "stage": "DRAFT",
  "isDraft": true,
  "createdAt": "2026-02-18T12:00:00Z"
}
```

---

## Sécurité et Validation

### Validation des données (DTO)

Avant même de traiter les données, on les valide. Voici un exemple avec le DTO d'inscription :

```typescript
// register.dto.ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;
}
```

Ce que ça fait :
- `@IsEmail()` vérifie que c'est un email valide
- `@MinLength(6)` vérifie que le mot de passe fait au moins 6 caractères
- Si les validations échouent, on renvoie une erreur 400 automatiquement

### Protection des routes (Guards)

Certaines routes nécessitent d'être connecté :

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)  // Nécessite d'être connecté
async me(@CurrentUser() user: User) {
  return user;
}
```

Comment ça marche :
- `JwtAuthGuard` vérifie le token JWT
- Si pas de token ou token invalide, erreur 401 (non autorisé)
- Si token valide, on récupère l'utilisateur automatiquement

### Vérifications métier

On vérifie aussi les droits d'accès dans le code :

```typescript
// Vérifier qu'un utilisateur ne peut accéder qu'à ses propres candidatures
if (user.id !== userId) {
  throw new ForbiddenException('You can only access your own applications');
}
```

Ce qui se passe :
Même si quelqu'un essaie d'accéder à `/applications/user/autreUserId`, le backend vérifie que l'ID dans l'URL correspond à l'utilisateur connecté. Sinon, erreur 403 (interdit).

---

## Ce qui est déjà en place

### Infrastructure technique

On a une API REST complète avec routes versionnées (`/api/v1/...`). L'authentification JWT fonctionne : login, register, protection des routes. La base de données PostgreSQL est en place avec Prisma et un modèle de données riche. La validation automatique des données entrantes est configurée. On gère les erreurs proprement (400, 401, 403, 404, 500). Et le CORS est configuré pour que le frontend puisse appeler le backend.

### Modules fonctionnels

Le module Auth gère la création de compte, le login, et la récupération du profil. Le module Opportunities permet un CRUD complet : créer, lire, modifier, supprimer. Le module Applications gère la création, le suivi des statuts, et le workflow complet (Draft → Submitted → Review → Success). Le module Users gère les profils utilisateurs. Et le module Notifications envoie des emails : bienvenue, notifications de candidature.

### Logique métier

Les relations entre entités sont en place : User ↔ Opportunity ↔ Application. On gère les statuts et workflows : DRAFT, SUBMITTED, etc. La sécurité est implémentée : vérification des droits d'accès, protection des routes. Et la validation inclut les règles métier : pas de doublon, champs requis, etc.

---

## Ce qui peut être ajouté facilement

Grâce à la fondation solide qu'on a mise en place, on peut facilement ajouter plusieurs choses.

### Matching automatique

On peut comparer les tags/industries d'une opportunité avec le profil d'un utilisateur et notifier automatiquement les utilisateurs des opportunités pertinentes.

### Analytics et Dashboards

On peut calculer le taux de conversion des candidatures, le temps moyen de réponse, identifier les top opportunités par nombre de candidatures, et faire des statistiques par industrie/marché.

### Scoring et Recommandations

On peut calculer un score de compatibilité entre un candidat et une opportunité et faire des recommandations personnalisées basées sur l'historique.

### Notifications avancées

On peut envoyer des emails automatiques lors des changements de statut, ajouter des notifications in-app, et envoyer des rappels pour les candidatures en brouillon.

---

## Points clés à retenir

1. Architecture modulaire : chaque fonctionnalité est dans son propre module (auth, opportunities, applications, etc.). Ça facilite la maintenance et l'évolution.

2. Séparation des responsabilités :
   - Les Controllers = routes API (ce que le frontend appelle)
   - Les Services = logique métier (les règles, les calculs)
   - Les DTOs = validation des données (format attendu)
   - Prisma = accès à la base de données

3. Sécurité :
   - Mots de passe hashés (jamais en clair)
   - Tokens JWT pour l'authentification
   - Vérification des droits d'accès
   - Validation des données entrantes

4. Base de données structurée :
   - Relations claires entre les entités
   - Contraintes d'intégrité (pas de doublon, références valides)
   - Prêt pour des requêtes complexes et des analytics

5. Scalabilité :
   - Code organisé et maintenable
   - API versionnée (on peut faire évoluer sans casser l'existant)
   - Base de données optimisée avec des index

---

## Questions fréquentes

**Q : Pourquoi utiliser NestJS plutôt qu'un simple Express ?**  
R : NestJS apporte une structure modulaire, de la validation automatique, et une meilleure organisation du code. C'est plus adapté pour une application qui va grandir.

**Q : Pourquoi Prisma plutôt que du SQL direct ?**  
R : Prisma génère automatiquement le code TypeScript à partir du schéma, garantit la cohérence des types, et évite les erreurs de requêtes SQL.

**Q : Est-ce que le backend peut gérer beaucoup d'utilisateurs ?**  
R : Oui, l'architecture est conçue pour scaler. On peut ajouter de la mise en cache, des load balancers, et optimiser les requêtes selon les besoins.

**Q : Comment on ajoute une nouvelle fonctionnalité ?**  
R : On crée un nouveau module (ex: `notifications/`), on définit les routes dans le controller, la logique dans le service, et on met à jour le schéma Prisma si besoin de nouvelles tables.

---

Document créé le : 18 février 2026  
Version : 1.0
