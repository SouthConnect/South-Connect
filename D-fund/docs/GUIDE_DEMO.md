# Guide de Démonstration - D-Fund

Ce guide contient toutes les commandes nécessaires pour tester les fonctionnalités de la plateforme D-Fund lors d'une démonstration.

---

## Préparation avant la démo

### 1. Vérifier l'environnement

```bash
# Vérifier que les dépendances sont installées
cd /home/arsene/D-fund/D-fund
npm run install:all

# Vérifier la connexion à la base de données
npm run db:test
```

### 2. Nettoyer les données de test existantes (optionnel)

```bash
# Nettoyer toutes les données de test
npm run cleanup:test
```

---

## Démarrage des serveurs

### Terminal 1 - Backend

```bash
cd /home/arsene/D-fund/D-fund
npm run backend:dev
```

**Vérification** : Le serveur doit démarrer sur http://localhost:3001  
**Message attendu** : "Backend running on http://localhost:3001"

### Terminal 2 - Frontend

```bash
cd /home/arsene/D-fund/D-fund
npm run frontend:dev
```

**Vérification** : L'interface doit être accessible sur http://localhost:3000

---

## Tests des fonctionnalités

### 1. Test de connexion base de données

```bash
npm run db:test
```

**Résultat attendu** : Connexion réussie, liste des tables affichée

---

### 2. Test complet POST /opportunities (avec nettoyage automatique)

```bash
npm run test:opportunities
```

**Ce que fait ce test** :
- Crée un utilisateur de test
- Se connecte avec cet utilisateur
- Crée une opportunité
- Vérifie que l'opportunité est bien créée
- Nettoie automatiquement toutes les données de test

**Résultat attendu** : Tous les tests passent, données nettoyées

---

### 3. Test manuel avec curl

#### Étape 1 : Inscription d'un utilisateur

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "Demo123!",
    "firstName": "Demo",
    "lastName": "User",
    "name": "Demo User"
  }'
```

**Résultat attendu** : Retourne un objet avec `user` et `token`

**Important** : Copier le `token` retourné pour les étapes suivantes

#### Étape 2 : Connexion

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "Demo123!"
  }'
```

**Résultat attendu** : Retourne un objet avec `user` et `token`

#### Étape 3 : Créer une opportunité

```bash
# Remplacer YOUR_TOKEN par le token obtenu à l'étape précédente
TOKEN="YOUR_TOKEN"

curl -X POST http://localhost:3001/api/v1/opportunities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Développeur Full Stack",
    "type": "JOB_OPPORTUNITY",
    "description": "Recherche d'un développeur Full Stack expérimenté pour rejoindre notre équipe.",
    "status": "ACTIVE",
    "city": "Paris",
    "country": "France",
    "remote": true,
    "tags": ["React", "Node.js", "TypeScript"],
    "industries": ["Tech", "SaaS"],
    "markets": ["Europe", "Afrique"]
  }'
```

**Résultat attendu** : Retourne l'opportunité créée avec un `id`

#### Étape 4 : Lister les opportunités

```bash
curl http://localhost:3001/api/v1/opportunities
```

**Résultat attendu** : Liste des opportunités avec pagination

#### Étape 5 : Consulter une opportunité spécifique

```bash
# Remplacer OPPORTUNITY_ID par l'id de l'opportunité créée
curl http://localhost:3001/api/v1/opportunities/OPPORTUNITY_ID
```

**Résultat attendu** : Détails complets de l'opportunité

#### Étape 6 : Mettre à jour un profil talent

```bash
# Remplacer USER_ID par l'id de l'utilisateur créé
curl -X PUT http://localhost:3001/api/v1/profiles/bto-c/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tags": ["React", "Node.js", "TypeScript"],
    "industries": ["Tech"],
    "seniorityLevel": "Senior",
    "lookingForOpportunities": true,
    "remote": true
  }'
```

**Résultat attendu** : Profil mis à jour avec les nouvelles informations

#### Étape 7 : Créer une candidature

```bash
# Remplacer OPPORTUNITY_ID par l'id de l'opportunité
curl -X POST http://localhost:3001/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "opportunityId": "OPPORTUNITY_ID",
    "message": "Je suis très intéressé par cette opportunité."
  }'
```

**Résultat attendu** : Candidature créée avec statut DRAFT

#### Étape 8 : Soumettre la candidature

```bash
# Remplacer APPLICATION_ID par l'id de la candidature créée
curl -X POST http://localhost:3001/api/v1/applications/APPLICATION_ID/submit \
  -H "Authorization: Bearer $TOKEN"
```

**Résultat attendu** : Candidature avec statut SUBMITTED

---

### 4. Test via l'interface Prisma Studio

```bash
npm run db:studio
```

**Utilisation** :
- Ouvre une interface graphique dans le navigateur
- Permet de visualiser toutes les tables
- Permet de voir les données créées lors des tests
- Utile pour vérifier que les données sont bien sauvegardées

---

### 5. Tests des endpoints publics (sans authentification)

#### Liste des talents

```bash
curl http://localhost:3001/api/v1/profiles/lists/talents
```

#### Liste des entreprises

```bash
curl http://localhost:3001/api/v1/profiles/lists/companies
```

#### Profil d'un utilisateur

```bash
# Remplacer USER_ID par un id d'utilisateur existant
curl http://localhost:3001/api/v1/profiles/USER_ID
```

---

## Scénario de démonstration complet

### Scénario 1 : Création d'opportunité par un entrepreneur

1. Démarrer les serveurs (backend + frontend)
2. Ouvrir http://localhost:3000 dans le navigateur
3. S'inscrire en tant qu'entrepreneur
4. Se connecter
5. Créer une opportunité via l'interface (ou utiliser curl)
6. Vérifier que l'opportunité apparaît dans la liste

### Scénario 2 : Candidature d'un talent

1. S'inscrire en tant que talent
2. Se connecter
3. Parcourir les opportunités disponibles
4. Créer une candidature pour une opportunité
5. Soumettre la candidature
6. Vérifier le statut de la candidature

### Scénario 3 : Mise à jour de profil

1. Se connecter avec un compte existant
2. Accéder à son profil
3. Mettre à jour les compétences, industries, etc.
4. Vérifier que les modifications sont sauvegardées

---

## Nettoyage après la démo

### Nettoyer les données de test

```bash
npm run cleanup:test
```

**Ce que fait cette commande** :
- Supprime les opportunités de test
- Supprime les utilisateurs de test
- Nettoie les candidatures orphelines

---

## Commandes de vérification rapide

### Vérifier que le backend répond

```bash
curl http://localhost:3001/api/v1/opportunities
```

**Résultat attendu** : Liste des opportunités (peut être vide)

### Vérifier que le frontend répond

```bash
curl http://localhost:3000
```

**Résultat attendu** : Code HTML de la page d'accueil

### Vérifier la connexion base de données

```bash
npm run db:test
```

**Résultat attendu** : Connexion réussie

---

## Dépannage rapide

### Le backend ne démarre pas

```bash
# Vérifier si le port 3001 est utilisé
lsof -i :3001

# Tuer le processus si nécessaire
pkill -f "nest start"
```

### Le frontend ne démarre pas

```bash
# Vérifier si le port 3000 est utilisé
lsof -i :3000

# Tuer le processus si nécessaire
pkill -f "next dev"
```

### Erreur de connexion base de données

```bash
# Vérifier la connexion
npm run db:test

# Vérifier le statut Supabase
npm run supabase:check
```

---

## Points à mettre en avant lors de la démo

1. **Architecture moderne** : Backend NestJS + Frontend Next.js
2. **Sécurité** : Authentification JWT sur toutes les routes sensibles
3. **Validation** : Validation automatique des données à chaque étape
4. **Base de données** : PostgreSQL hébergée sur Supabase (cloud)
5. **Tests** : Scripts automatisés avec nettoyage automatique
6. **Scalabilité** : Architecture prête pour la croissance
7. **Code propre** : Commentaires professionnels, structure modulaire

---

## Checklist avant la démo

- [ ] Backend démarré et accessible sur http://localhost:3001
- [ ] Frontend démarré et accessible sur http://localhost:3000
- [ ] Connexion base de données fonctionnelle (npm run db:test)
- [ ] Au moins un test complet réussi (npm run test:opportunities)
- [ ] Données de test nettoyées si nécessaire
- [ ] Token JWT prêt pour les tests manuels
- [ ] Prisma Studio accessible si besoin (npm run db:studio)

---

*Pour plus d'informations, consulter COMMANDES_ESSENTIELLES.md*
