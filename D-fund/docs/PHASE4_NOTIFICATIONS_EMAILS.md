# Phase 4 — Notifications & Emails

## 📧 Catalogue des notifications

### Notifications V1 (Indispensables)

#### 1. ApplicationSubmitted
**Déclencheur** : Application passe de DRAFT → SUBMITTED  
**Destinataire** : Owner de l'opportunité  
**Type** : Email + In-app  
**Fréquence** : Temps réel  
**Contenu** :
- Nom du candidat
- Nom de l'opportunité
- Lien vers l'application
- Date de soumission

#### 2. ApplicationReviewed
**Déclencheur** : Owner ajoute un feedback sur une application  
**Destinataire** : Candidat  
**Type** : Email + In-app  
**Fréquence** : Temps réel  
**Contenu** :
- Nom de l'opportunité
- Feedback du owner
- Lien vers l'application

#### 3. ApplicationAccepted
**Déclencheur** : Application passe à stage SUCCESS  
**Destinataire** : Candidat  
**Type** : Email + In-app  
**Fréquence** : Temps réel  
**Contenu** :
- Félicitations
- Nom de l'opportunité
- Contact du owner

#### 4. NewMessage
**Déclencheur** : Nouveau message dans une discussion  
**Destinataire** : Participant(s) de la discussion  
**Type** : Email (optionnel) + In-app  
**Fréquence** : Temps réel  
**Contenu** :
- Nom de l'expéditeur
- Aperçu du message
- Lien vers la discussion

#### 5. WelcomeEmail
**Déclencheur** : User s'inscrit  
**Destinataire** : Nouvel utilisateur  
**Type** : Email uniquement  
**Fréquence** : Temps réel  
**Contenu** :
- Message de bienvenue
- Guide de démarrage
- Lien vers le profil

### Notifications Hors V1

#### 6. OpportunityMatching
**Déclencheur** : Nouvelle opportunité correspond aux critères du user  
**Destinataire** : Users avec critères matching  
**Type** : Email digest (quotidien)  
**Fréquence** : Batch (1x/jour)  
**Note** : Complexe à implémenter, nécessite algorithme de matching

#### 7. FollowerActivity
**Déclencheur** : User suivi crée une opportunité  
**Destinataire** : Followers  
**Type** : Email digest  
**Fréquence** : Batch (1x/jour)  

#### 8. ReminderApplication
**Déclencheur** : Application en DRAFT depuis X jours  
**Destinataire** : Candidat  
**Type** : Email  
**Fréquence** : Batch (quotidien)  

#### 9. OpportunityExpiring
**Déclencheur** : Opportunité expire dans 7 jours  
**Destinataire** : Owner  
**Type** : Email  
**Fréquence** : Batch (quotidien)  

#### 10. WeeklyDigest
**Déclencheur** : Résumé hebdomadaire  
**Destinataire** : Tous les users  
**Type** : Email  
**Fréquence** : Batch (hebdomadaire)  

---

## ⚙  Règles de déclenchement

### Conditions d'envoi

#### ApplicationSubmitted
-   Application existe
-   Application.stage = SUBMITTED
-   Owner existe et a email valide
-   Owner n'a pas désactivé les notifications

#### ApplicationReviewed
-   Application existe
-   reviewFeedback non vide
-   Candidat existe et a email valide

#### ApplicationAccepted
-   Application.stage = SUCCESS
-   Candidat existe et a email valide

#### NewMessage
-   Message créé
-   Destinataire existe
-   Destinataire n'est pas l'expéditeur
- ⚠  Option : Seulement si discussion inactive depuis X heures (éviter spam)

### Fréquence

**Temps réel** :
- ApplicationSubmitted
- ApplicationReviewed
- ApplicationAccepted
- NewMessage (optionnel)

**Batch** :
- Matching opportunities (quotidien)
- Reminders (quotidien)
- Digests (hebdomadaire)

---

##    Choix techniques

### Provider Email : **Resend**
**Pourquoi** :
- Coûts maîtrisés (gratuit jusqu'à 3000 emails/mois)
- API simple
- Templates propres
- Tracking ouverture/clic
- Bonne délivrabilité

**Alternative** : SendGrid (plus cher mais plus de features)

### Orchestration

**V1** : Direct dans le code backend
- Simple
- Pas de queue nécessaire
- Suffisant pour V1

**Post-V1** : Queue system (Bull/BullMQ)
- Pour batch processing
- Retry automatique
- Meilleure scalabilité

### Découplage du core

**V1** : Service de notification dans backend
```typescript
// backend/src/modules/notifications/notifications.service.ts
class NotificationsService {
  async sendApplicationSubmittedEmail(...)
  async sendApplicationReviewedEmail(...)
}
```

**Post-V1** : Service externe ou queue
- Worker séparé pour emails
- Event-driven architecture

---

## 📦 Livrables

1. **Catalogue des notifications**   (ce document)
2. **Templates email**   (à créer avec Resend)
3. **Service de notifications**   (à implémenter dans backend)

---

##   Priorités V1

1. **ApplicationSubmitted** → Owner (critique)
2. **ApplicationAccepted** → Candidat (critique)
3. **WelcomeEmail** → Nouvel user (important)
4. **ApplicationReviewed** → Candidat (important)
5. **NewMessage** → Participant (optionnel V1)

