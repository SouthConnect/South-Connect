# Rapport hebdomadaire — Semaine W25 (15 – 21 juin 2026)

## Résumé

Semaine de finalisation silencieuse : aucun commit mergé, mais travail intensif sur l'audit de sécurité et la suite de tests e2e en préparation du premier déploiement en production.

---

## Sécurité — audit en cours

Travaux entamés sur la base du rapport W24 (Docker + DNS + Resend prêts) :

- Recensement exhaustif des endpoints sans rate-limiting → liste de 12 controllers à corriger
- Identification des failles critiques à traiter avant le go-live :
  - Soft-delete non filtré sur `forgotPassword` (fuite d'existence de compte)
  - Pas de `SESSION_SECRET` distinct du `JWT_SECRET`
  - Ownership check manquant sur le storage d'opportunités
  - `onDelete` absent sur 4 relations Prisma (orphelins possibles en DB)
  - Referral : route publique `GET /code/:code` bloquée par un guard mal placé
- Début d'écriture des tests e2e (cible : 200+ cas)

---

## Infrastructure

- Évaluation Railway vs VPS auto-hébergé : **décision prise de migrer vers Railway** (managed, pas de gestion SSL/Nginx manuelle, déploiements Git-based)
- Évaluation Vercel pour le frontend Next.js : **retenu** (Edge runtime natif, CDN mondial, variables d'env par branche)
- Stratégie finale : Railway (backend) + Vercel (frontend), abandon du `docker-compose.prod.yml` précédemment prévu

---

## Points bloquants identifiés

| Point | Impact | Solution planifiée |
|---|---|---|
| `@sentry/profiling-node` addon C++ | Potentiel crash au démarrage Docker | Try-catch à ajouter |
| `jose@6` incompatible Edge Runtime | Middleware Next.js ne compile pas | Rétrograder à v5 |
| Cookie sans `domain` entre subdomains | Pages authentifiées inaccessibles en prod | `COOKIE_DOMAIN=.southconnect.io` |
| `dist/main.js` vs `dist/src/main.js` | Entrypoint Docker incorrect | Corriger le CMD dans Dockerfile |

---

## Semaine suivante

- Appliquer tous les fixes de sécurité en un seul commit production-ready
- Premier déploiement Railway + Vercel
- Tester le flux complet (connexion, OAuth, pages authentifiées)
