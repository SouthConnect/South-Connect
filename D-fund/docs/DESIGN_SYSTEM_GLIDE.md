# Design System - Basé sur Glide

**Source** : https://d-fund.glide.page/dl/explore  
**Objectif** : Extraire et documenter les normes de design de la plateforme Glide pour aligner le frontend Next.js

---

## Analyse à effectuer sur Glide

### 1. Navigation (Navbar)
- [ ] Structure : Logo, menu items, actions
- [ ] Position : Fixe, sticky, ou normale
- [ ] Couleurs : Background, texte, hover states
- [ ] Responsive : Comportement mobile

### 2. Layout général
- [ ] Container : Largeur max, padding
- [ ] Grille : Colonnes, espacements
- [ ] Sidebar : Présence, contenu, position
- [ ] Footer : Structure, contenu

### 3. Couleurs
- [ ] Couleur principale (primary)
- [ ] Couleur secondaire (secondary)
- [ ] Couleurs de statut (success, warning, error)
- [ ] Couleurs de texte (headings, body, muted)
- [ ] Backgrounds (sections, cards)

### 4. Typographie
- [ ] Police principale
- [ ] Tailles : h1, h2, h3, h4, body, small
- [ ] Poids : regular, medium, semibold, bold
- [ ] Line heights
- [ ] Letter spacing

### 5. Composants

#### Cartes d'opportunités
- [ ] Structure : Image, titre, description, métadonnées
- [ ] Badges : Type, statut
- [ ] Actions : Like, save, share, apply
- [ ] Métriques : Vues, candidatures, likes
- [ ] Hover states
- [ ] Espacements internes

#### Formulaires
- [ ] Inputs : Style, labels, placeholders
- [ ] Selects : Style, dropdown
- [ ] Textareas : Style, resize
- [ ] Buttons : Primary, secondary, outline
- [ ] Validation : États error, success
- [ ] Grouping : Sections, étapes

#### Modals/Dialogs
- [ ] Structure : Header, body, footer
- [ ] Overlay : Opacité, couleur
- [ ] Animations : Ouverture, fermeture
- [ ] Actions : Boutons, fermeture

### 6. Espacements
- [ ] Scale : 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
- [ ] Padding sections
- [ ] Marges entre éléments
- [ ] Gap dans les grilles

### 7. Interactions
- [ ] Hover effects
- [ ] Active states
- [ ] Focus states
- [ ] Loading states
- [ ] Transitions : Durée, easing

---

## Plan d'action

### Phase 1 : Analyse
1. Examiner la plateforme Glide (https://d-fund.glide.page/dl/explore)
2. Analyser les captures d'écran dans `glide/`
3. Documenter les patterns identifiés

### Phase 2 : Design System
1. Créer un fichier de configuration Tailwind avec les couleurs exactes
2. Définir les composants de base (Button, Card, Input, etc.)
3. Créer un fichier de tokens de design (couleurs, espacements, typographie)

### Phase 3 : Refactoring
1. Mettre à jour `tailwind.config.js` avec les couleurs Glide
2. Refactorer les composants existants
3. Créer les composants manquants selon les normes Glide
4. Mettre à jour les pages pour respecter le layout Glide

---

## Éléments prioritaires à corriger

Basé sur les différences probables entre l'implémentation actuelle et Glide :

1. **Couleurs** : Palette de couleurs probablement différente
2. **Layout** : Structure de navigation et de contenu
3. **Cartes d'opportunités** : Format et éléments affichés
4. **Formulaires** : Style et structure
5. **Espacements** : Padding et marges

---

## Prochaines étapes

Une fois l'analyse de Glide effectuée, je créerai :
1. Un fichier `design-tokens.ts` avec toutes les valeurs
2. Un fichier `tailwind.config.js` mis à jour
3. Des composants de base alignés avec Glide
4. Un guide de migration pour refactorer les pages existantes
