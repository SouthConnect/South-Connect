# Rapport — Stabilisation D-Fund

**Contexte :** l'app ralentissait et affichait des erreurs après une période d'inactivité, et certaines actions utilisateur (like, follow, messages) ne s'affichaient pas de façon cohérente partout dans l'app. Un audit complet a été mené pour trouver les causes racines, puis les corriger.

---

## 🐢 Problème 1 — Lenteurs et erreurs après inactivité

- **Cause principale trouvée :** la base de données n'acceptait qu'**une seule connexion à la fois** pour toute l'application. Au réveil (plusieurs utilisateurs/pages en même temps), tout le monde faisait la queue → lenteurs, erreurs.
- **Autre cause :** après une pause, l'app essayait de renouveler la session utilisateur plusieurs fois en même temps depuis différents onglets, ce qui provoquait de fausses déconnexions.
- **Corrigé :**
  - Base de données : passage à plusieurs connexions simultanées (validé sans risque de surcharge).
  - Session : un seul renouvellement à la fois, même avec plusieurs onglets ouverts.
  - Limite de requêtes ("trop de requêtes") : seuil ajusté pour ne plus bloquer les utilisateurs légitimes.

**Résultat attendu :** plus de lenteurs ni de déconnexions surprises après une période d'inactivité.

---

## 🔄 Problème 2 — Incohérences dans l'app (likes, abonnements, messages)

- **Cause principale trouvée :** chaque action (liker, suivre, sauvegarder) était codée séparément à chaque endroit où elle apparaît dans l'app, avec des règles de mise à jour différentes à chaque fois. Résultat : une action faite à un endroit ne se reflétait pas toujours ailleurs.
- **Corrigé :**
  - Likes, sauvegardes et abonnements : unifiés pour se mettre à jour partout dans l'app en même temps.
  - Messagerie : les messages arrivent maintenant de façon fiable même après une coupure réseau ou une mise en veille de l'ordinateur.
  - Compteurs de notifications non-lues : corrigés (ils pouvaient rester bloqués sur un mauvais chiffre).
  - Nettoyage de code dupliqué (mêmes règles de sécurité/validation réécrites à plusieurs endroits) pour réduire le risque qu'un futur correctif en oublie une copie.

**Résultat attendu :** une expérience cohérente, où une action faite à un endroit se reflète immédiatement partout ailleurs.

- ***

## ✅ État actuel

- Toutes les corrections listées ci-dessus sont **en ligne, en production**.
- Compilation et tests automatisés vérifiés à chaque étape — aucune fonctionnalité cassée.
- Deux tâches mineures de nettoyage restent ouvertes (historique git, outil de détection de secrets), sans urgence.
