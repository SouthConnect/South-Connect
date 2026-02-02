# Rapport hebdomadaire — Semaine du 27 janvier 2026

*Backend = serveur et API (logique métier, base de données). Frontend = interface dans le navigateur (pages, formulaires, affichage).*

---

## 1. Sécurité et droits d’accès

**Backend**
- **Identification de l’utilisateur connecté** : le serveur expose une ressource permettant de récupérer de façon sécurisée les informations de la personne connectée (utilisée par l’interface pour afficher le bon profil, les bonnes candidatures, etc.).
- **Règles « qui voit quoi »** (appliquées côté serveur) :
  - Seul le créateur d’une opportunité peut consulter la liste des candidatures reçues pour cette opportunité.
  - Chaque utilisateur ne peut demander que la liste de ses propres candidatures (pas celles des autres).
  - Modifier une candidature, la soumettre ou la noter est autorisé uniquement pour le candidat ou le propriétaire de l’opportunité.

## 2. Notifications par email

**Backend**
- Mise en place d’un système d’envoi d’emails (via le prestataire Resend) pour les événements suivants :
  - Email de bienvenue à l’inscription.
  - Email au créateur de l’opportunité lorsqu’une nouvelle candidature est soumise.
  - Email au candidat lorsque sa candidature est examinée (avec feedback) ou acceptée.
- En cas de problème temporaire d’envoi d’email, l’action de l’utilisateur (inscription, soumission, etc.) est tout de même enregistrée ; l’email pourra être géré séparément.

## 3. Interface utilisateur (expérience type Glide)

**Frontend**
- **Navigation** : menu fixe à gauche (accueil, referral, chat, tableau de bord, profils, communauté, nouvelles fonctionnalités, exploration) avec connexion / déconnexion.
- **Connexion et inscription** : pages dédiées, style homogène, redirection automatique après connexion.
- **Page d’accueil** : bandeau de bienvenue, section « Explorer les opportunités » avec onglets (récentes, tendances, favoris), vues liste / carte / galerie, recherche et filtres.
- **Fiche opportunité** : image, description, tags, bouton « Postuler » (crée un brouillon de candidature puis redirige vers le formulaire), boutons like / sauvegarder (à brancher ensuite), infos sur le porteur.
- **Création d’opportunité** : formulaire (type, nom, punchline, description, lieu, télétravail, prix, secteurs, tags) envoyé au serveur.
- **Candidatures** :
  - Liste « Mes candidatures » avec filtres par statut (brouillon, envoyée, en cours d’examen, acceptée, archivée) et recherche.
  - Fiche candidature : onglets (infos principales, pièces jointes, parrainages), champs « Titre » et « Pourquoi vous ? », case « Prêt à soumettre », boutons « Enregistrer en brouillon » et « Soumettre la candidature ».
  - Depuis une opportunité, « Postuler » crée un brouillon puis redirige vers la fiche pour compléter et soumettre.
- **Tableau de bord** : message de bienvenue, cartes « Tâches importantes » (import, créer des opportunités, s’engager), aperçu des candidatures avec liens.
- **Communauté** : onglets profils talents / entreprises, liste avec recherche, alimentée par les données renvoyées par le serveur.
- **Profils** : page hub (accès profil individuel BtoC et profils entreprise BtoB) ; page « Mon profil » avec onglets Infos de base, Profil individuel (BtoC), Profil entreprise (BtoB), lecture et mise à jour.

## 4. Migration des données Glide vers Supabase

**Backend / Données**
- Script de migration prêt pour transférer les données depuis les exports Glide (fichiers CSV) vers la base de données Supabase :
  - Référentiels : industries, marchés, fonctionnalités.
  - Utilisateurs et profils (individuels et entreprises).
  - Opportunités (avec rattachement au bon créateur via email).
  - Candidatures (candidat et opportunité identifiés par email / identifiant).
- Le script gère les différences de format des colonnes Glide (ex. identifiant de ligne, noms de champs variables).

## 5. Qualité et préparation au déploiement

- **Backend** : vérification automatique du code (lint) prévue pour la chaîne d’intégration.
- **Frontend** : configuration prête pour un déploiement sur Vercel.
- **Documentation** : analyse du projet, plan V1, rapports de développement et précédent rapport hebdo disponibles dans le dossier `docs/`.

---

## État des tests et vérifications

**Tout n’a pas encore été testé et vérifié de façon systématique.** Synthèse :

| Domaine | Backend / Frontend | Test automatisé | Vérification actuelle |
|---------|--------------------|------------------|------------------------|
| Connexion à la base de données | Backend | Oui | Script dédié |
| Inscription et connexion utilisateur | Backend | Non | Procédures manuelles documentées |
| Récupération du profil connecté | Backend | Non | Non couvert par un script |
| Création et liste des opportunités | Backend | Oui | Script dédié (serveur en marche) |
| Candidatures, profils, social (API) | Backend | Non | Scénarios manuels documentés |
| Droits d’accès (qui voit quoi) | Backend | Non | Pas de tests automatisés |
| Envoi d’emails (bienvenue, candidature, etc.) | Backend | Non | Comportement prévu, pas de test automatisé |
| Interface (pages, formulaires, flux) | Frontend | Non | Tests manuels dans le navigateur uniquement |
| Script de migration Glide | Backend / Données | Non | Script vérifié en syntaxe, pas encore exécuté de bout en bout sur des données réelles |
| Chaîne d’intégration (vérifications à chaque commit) | Backend + Frontend | Non | Aucun pipeline configuré |

**En résumé :** des procédures manuelles et un script ciblé (opportunités) existent ; les nouveautés de la semaine (droits d’accès, profil connecté, notifications, flux interface) n’ont pas de couverture automatisée. Il n’y a pas encore de tests unitaires ni de pipeline de vérification automatique.

**Recommandation :** avant de considérer la V1 comme entièrement validée, prévoir : (1) des vérifications manuelles ciblées sur le profil connecté, les droits d’accès et les candidatures ; (2) un pipeline de vérification automatique (qualité du code + script opportunités) ; (3) quelques tests automatisés sur les parties critiques.

---

## Prochaines étapes

- **Vue porteur d’opportunité** (Frontend) : page « Candidatures reçues » pour une opportunité donnée, avec liste, examen et feedback. L’API côté serveur (Backend) est déjà prête.
- **Like et sauvegarder** (Frontend) : connecter les boutons des cartes et de la fiche opportunité aux fonctionnalités « j’aime » et « sauvegarder » (Backend déjà en place).
- **Upload d’images** (Backend + Frontend) : côté Backend, configurer le stockage d’images (Supabase) ; côté Frontend, permettre l’ajout d’images (logo, couverture) pour les opportunités et les profils.
- **Chaîne de vérification** (Backend + Frontend) : mettre en place un pipeline automatique (vérification du code serveur et interface, tests de base).
- **Déploiement** : Backend sur Railway, Frontend sur Vercel, avec les paramètres de production.

---

## Points d’attention

- Aucun blocage technique identifié.
- Interface et serveur sont alignés sur les flux V1 (connexion, opportunités, candidatures, profils, communauté, notifications).
- La migration Glide doit être exécutée d’abord sur un environnement de préproduction ; prévoir un contrôle des doublons et des champs manquants selon les fichiers CSV réels.
