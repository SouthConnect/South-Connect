# Point d'équipe — SouthConnect en production
**Juillet 2026 — Bilan des deux dernières semaines + prochaines étapes**

---

## Vue d'ensemble

Depuis mi-juin, on a travaillé à mettre SouthConnect en ligne pour de vrai — pas juste en local sur un ordinateur, mais accessible à n'importe qui dans le monde via `southconnect.io`.

Ce document retrace tout ce qui a été fait, les problèmes rencontrés, comment on les a résolus, et ce qui vient ensuite.

---

## Comment l'app est structurée (version simple)

SouthConnect, c'est deux grandes parties qui se parlent :

```
Utilisateur (navigateur)
       │
       ▼
  southconnect.io         ← ce que l'utilisateur voit (Vercel)
       │
       ▼
  api.southconnect.io     ← le moteur derrière (Railway)
       │
       ▼
  Base de données          ← où les données sont stockées (Supabase)
```

| Service | Rôle | Plateforme |
|---|---|---|
| Frontend | Pages que l'utilisateur voit | Vercel |
| Backend (API) | Logique, sécurité, données | Railway |
| Base de données | Stockage permanent | Supabase |
| Cache temps réel | Chat, sessions | Redis (Railway) |
| Emails | Mot de passe oublié, vérification | Resend |
| Surveillance erreurs | Alertes si bug en prod | Sentry |

**Pourquoi Railway + Vercel plutôt qu'un serveur classique ?**
Le plan initial était de louer un serveur (VPS) et de tout gérer manuellement (SSL, mises à jour de sécurité, redémarrages…). On a choisi à la place des plateformes gérées : zéro maintenance serveur, déploiement automatique à chaque modification du code, et plus fiable pour notre stade actuel.

---

## Semaine 1 (15–21 juin) — Préparation & audit de sécurité

Avant de mettre quoi que ce soit en ligne, on a passé une semaine entière à **auditer l'application de fond en comble** pour s'assurer qu'elle était prête à recevoir de vrais utilisateurs.

### Ce qu'on a vérifié et corrigé avant le lancement

**Sécurité des comptes**
- Un utilisateur qui oublie son mot de passe ne pouvait pas être sûr que personne d'autre ne peut l'utiliser pour deviner si un email est enregistré → corrigé
- Les identifiants de session (côté serveur) n'étaient pas suffisamment isolés les uns des autres → corrigé
- Un fichier lié à une opportunité pouvait théoriquement être accédé par quelqu'un d'autre que son propriétaire → corrigé

**Protection contre les abus**
- 12 points d'entrée de l'API n'avaient aucune limite de tentatives → quelqu'un pouvait essayer des milliers de mots de passe sans être bloqué → corrigé (limite automatique, blocage temporaire après trop de tentatives)

**Intégrité des données**
- Certaines relations entre données n'avaient pas de règle de suppression → si un compte est supprimé, certaines données liées pouvaient rester "en suspens" dans la base de données → corrigé

**Fonctionnalités bloquées**
- Le système de parrainage : un lien de parrainage public était bloqué par erreur par une protection réservée aux utilisateurs connectés → corrigé

**Tests automatisés**
- Écriture de **233 tests automatisés** (17 tests unitaires + 216 tests de bout en bout) qui vérifient automatiquement que les fonctionnalités marchent correctement à chaque modification du code

---

## Semaine 2 (22–29 juin) — Premier déploiement & résolution de bugs

### Le déploiement initial

Le 28 juin, on a fait le **premier déploiement en production** sur Railway et Vercel. Ça, c'est la partie visible. Ce qu'on ne voit pas, c'est que derrière ce déploiement, on a dû résoudre **9 bugs bloquants** qui n'apparaissaient qu'en conditions réelles — des problèmes qui n'existaient pas en développement local et qui ont nécessité plusieurs heures d'investigation et de corrections.

### Les 9 bugs résolus

---

**Bug 1 — L'application ne démarrait pas du tout**

Le fichier de démarrage du serveur était mal configuré : le système cherchait le programme principal à un endroit, mais le compilateur le plaçait ailleurs. Résultat : le serveur tentait de démarrer, ne trouvait rien, et s'arrêtait immédiatement sans aucun message d'erreur.

→ *Correction : ajuster le chemin du fichier de démarrage.*

---

**Bug 2 — Crash silencieux lié au système d'exploitation**

Notre outil de surveillance d'erreurs (Sentry) inclut un composant écrit en langage bas niveau (C++) qui est incompatible avec le système d'exploitation qu'on utilisait initialement dans nos conteneurs Docker (Alpine Linux). L'application démarrait, puis s'arrêtait silencieusement — sans aucun log, sans aucun message — ce qui rendait le diagnostic très difficile.

→ *Correction : changer le système de base (Alpine → Debian), compatible avec tous nos composants.*

---

**Bug 3 — Les données disparaissaient au démarrage**

Lors du démarrage du serveur en production, une étape d'installation réinitialisait un dossier de données que l'étape précédente venait de préparer. Résultat : des rôles utilisateurs ("administrateur", "membre", etc.) étaient introuvables au chargement → l'application plantait.

→ *Correction : réordonner les étapes d'installation pour que rien ne soit écrasé.*

---

**Bug 4 — Incompatibilité de version base de données**

L'application utilise un outil (Prisma) pour parler à la base de données. Cet outil génère un "pilote" adapté à la version du système de chiffrement (OpenSSL) installé sur le serveur. La version générée ne correspondait pas à celle installée sur Railway → le premier appel à la base de données faisait planter l'application.

→ *Correction : forcer la génération du pilote pour la bonne version d'OpenSSL.*

---

**Bug 5 — Le frontend ne pouvait pas parler au backend (CORS)**

Le navigateur web bloque par défaut les communications entre deux adresses différentes, sauf si le serveur donne explicitement son accord. Notre backend n'acceptait les requêtes que depuis `southconnect.io`, mais Vercel sert aussi le site depuis `www.southconnect.io` — avec le "www". Ces deux adresses sont considérées comme différentes → toutes les requêtes étaient bloquées avec une erreur 500.

→ *Correction : ajouter explicitement les deux adresses (avec et sans "www") dans la liste des origines autorisées.*

---

**Bug 6 — Pages blanches sur le frontend (variables manquantes)**

Le frontend avait besoin de savoir à quelle adresse se connecter pour appeler le backend. Ces informations (variables d'environnement) étaient présentes sur Vercel mais leurs valeurs étaient vides → le frontend appelait littéralement `undefined/api/...` → pages blanches.

→ *Correction : remplir les valeurs + redéployer (ces variables sont "gravées" dans le code au moment du déploiement, un simple redémarrage ne suffit pas).*

---

**Bug 7 — La connexion Google renvoyait une erreur serveur**

Après l'authentification sur Google, notre serveur construit une adresse de redirection pour renvoyer l'utilisateur vers SouthConnect. Cette adresse était construite à partir d'une variable qui contenait deux URLs séparées par une virgule (pour gérer www et non-www). Le résultat était une URL invalide du type `https://southconnect.io,https://www.southconnect.io/auth/...` → erreur serveur immédiate.

→ *Correction : n'utiliser que la première URL de la liste pour la redirection.*

---

**Bug 8 — La connexion Google renvoyait une erreur 401**

Deuxième problème sur la connexion Google, distinct du précédent : lors de la redirection depuis Google vers notre serveur, le navigateur refusait d'envoyer un cookie de sécurité temporaire (celui qui protège contre les attaques CSRF lors du flow OAuth). Ce cookie était configuré en mode "strict" — ce mode bloque l'envoi du cookie lors des navigations venant d'un autre site (comme Google). Sans ce cookie, notre serveur ne pouvait pas valider la requête → 401.

→ *Correction : passer ce cookie en mode "lax" (moins strict, mais suffisant pour ce cas d'usage ; les cookies d'authentification principaux restent en mode strict).*

---

**Bug 9 — Toutes les pages après connexion étaient blanches**

C'est le bug le plus subtil. Quand un utilisateur se connecte, notre serveur pose un "cookie" dans son navigateur (un petit jeton d'identité). Ce cookie avait un problème : il était associé uniquement à `api.southconnect.io`. Le frontend, lui, tourne sur `www.southconnect.io`. Le navigateur considère ces deux adresses comme distinctes et ne transmettait donc pas le cookie de l'un à l'autre → à chaque visite sur une page protégée (dashboard, profil, chat…), le système ne voyait aucun cookie → redirection vers la page de connexion → page blanche.

En local, ça marchait parfaitement car frontend et backend tournent tous les deux sur la même adresse (`localhost`).

→ *Correction : configurer le cookie pour qu'il soit valable sur tout le domaine `.southconnect.io` (y compris tous les sous-domaines).*

---

### Résultat final de la semaine

| Fonctionnalité | Statut |
|---|---|
| Connexion email / mot de passe | ✅ Fonctionne |
| Connexion avec Google | ✅ Fonctionne |
| Dashboard, Profil, Chat, Notifications | ✅ Fonctionne |
| Parrainage, Analytiques | ✅ Fonctionne |
| Pages publiques (Communauté, Explorer, Opportunités) | ✅ Fonctionne |
| 233 tests automatisés | ✅ Tous verts |
| Sécurité (anti-brute-force, sessions, ownership) | ✅ En place |
| Surveillance des erreurs (Sentry) | ✅ Actif |
| Emails (mot de passe oublié, inscription) | ⚠️ À débloquer |
| Version mobile | ⚠️ À vérifier |

---

## Ce qui vient ensuite

### Court terme — priorités immédiates

**1. Débloquer les emails** *(priorité haute, ~30 min de configuration)*

Les emails (mot de passe oublié, confirmation d'inscription) ne partent pas encore. Le domaine d'envoi `mail.southconnect.io` doit être validé auprès de notre prestataire (Resend) via quelques enregistrements DNS dans Cloudflare.

Tant que ce n'est pas fait : un utilisateur qui oublie son mot de passe ne peut pas le récupérer, et l'email de confirmation à l'inscription ne part pas.

**2. Tester le parcours d'inscription complet**

Créer un compte test avec un vrai email et suivre chaque étape de A à Z pour vérifier que tout fonctionne bien pour un nouvel utilisateur.

**3. Révision mobile**

L'application a été développée et testée principalement sur ordinateur. Il faut vérifier et ajuster l'affichage sur téléphone avant de communiquer largement.

**4. Rotation des accès (sécurité)**

Renouveler certains identifiants techniques (clés d'API, mots de passe) maintenant qu'on est en production — bonne pratique de sécurité.

---

### Moyen terme — améliorations prévues

Ces points n'empêchent pas l'app de fonctionner aujourd'hui, mais sont dans la feuille de route :

- **Recherche plus rapide et plus pertinente** : les index de recherche plein texte sont déjà préparés en base de données, il reste à les activer
- **File d'attente emails avec retry automatique** : déjà développé (BullMQ), à activer — garantit qu'aucun email ne soit perdu même si Resend est momentanément indisponible
- **Alertes automatiques** si l'application tombe ou ralentit
- **Sauvegardes base de données** vérifiées et testées
- Fonctionnalités en cours : notifications push, analytics enrichi, tableau de bord admin

---

## En résumé

En deux semaines : audit de sécurité complet, 233 tests écrits, 9 bugs de production identifiés et résolus, et SouthConnect est désormais en ligne et fonctionnel sur `southconnect.io`. Le travail visible (l'app qui tourne) repose sur un travail invisible conséquent (sécurité, stabilité, infrastructure) qui était indispensable pour ne pas ouvrir une application fragile à de vrais utilisateurs.

La prochaine priorité : débloquer les emails et valider le parcours mobile, pour être prêts à accueillir les premiers utilisateurs en confiance.
