# SouthConnect — brief technique express

*Le minimum à savoir pour une présentation rapide. Pour le détail complet, voir [`ETAT_TECHNIQUE_ACTUEL.md`](./ETAT_TECHNIQUE_ACTUEL.md). Mis à jour le 18 août 2026.*

---

## Le produit en une phrase

Une plateforme qui connecte des entrepreneurs africains à leurs ressources : talents, mentors, financement, opportunités professionnelles. En production sur [southconnect.io](https://southconnect.io).

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS — hébergé sur **Vercel** |
| Backend | NestJS 11, API REST + WebSocket (Socket.IO) — hébergé sur **Railway** |
| Base de données | PostgreSQL via **Supabase**, 22 modèles Prisma |
| Cache / sessions / files | **Redis** (Railway) |
| Email | **Resend** |
| Monitoring erreurs | **Sentry** (frontend + backend) |
| IA | **Anthropic** (génération assistée de brouillon d'opportunité, ne persiste rien) |
| Auth | JWT en cookies HttpOnly + Google OAuth |

## Architecture en un coup d'œil

```
Navigateur ── HTTP ────► Next.js (Vercel)
           └─ WebSocket ►  NestJS (Railway) ── PostgreSQL (Supabase)
                                            └── Redis (cache, sessions, verrous, files)
                                            └── Resend (emails)
```

Le frontend ne parle jamais directement à la base ou à Redis — tout passe par l'API NestJS.

## Chiffres clés

- **24 modules backend**, **44 routes frontend**, **22 modèles de données**
- **108 routes API auditées** — 0 mal protégée
- **456 tests automatiques** (337 backend + 119 frontend), tous verts
- Déploiement automatique sur chaque push vers `main` (Railway + Vercel)

## État actuel en un coup d'œil

| Axe | État |
|---|---|
| Sécurité des dépendances | 🟡 17/19 vulnérabilités corrigées cette semaine, 2 restantes liées à une montée de version majeure planifiée séparément |
| Autorisations | ✅ Un trou trouvé (upload de fichiers) et corrigé cette semaine, verrouillé par des tests |
| RGPD — technique | ✅ Export et suppression de compte fonctionnent, testés |
| RGPD — juridique | 🔴 Pages CGU/confidentialité sans contenu — bloquant, dépend d'une décision direction |
| Fiabilité | ✅ 3 modules à risque (comptes, tâches planifiées, stockage) passés de 0 à 69 tests cette semaine |

## Points de vigilance connus

- **CI verte mais non bloquante** — un test cassé n'empêche pas un déploiement en prod aujourd'hui.
- **Dépendance circulaire** entre les modules Messages et Notifications — maîtrisée, pas un bug actif.
- **Migration Next.js 14 → 16** à prévoir (changement majeur, session dédiée).

---

*Pour le détail (schéma de données, sécurité, dette technique complète) : [`ETAT_TECHNIQUE_ACTUEL.md`](./ETAT_TECHNIQUE_ACTUEL.md).*
