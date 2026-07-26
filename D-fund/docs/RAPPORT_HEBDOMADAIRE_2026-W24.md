# Rapport hebdomadaire — Semaine W24 (9 – 12 juin 2026)

## Infrastructure & Déploiement

### Dockerisation complète
- Nginx configuré en reverse proxy SSL (TLS 1.2/1.3, HSTS, gzip, rate limiting par zone)
- `docker-compose.prod.yml` — overlay production avec resource limits (backend 1 Go, frontend 512 Mo, Redis 256 Mo)
- `docker-compose.dev.yml` — overlay dev avec ports exposés (backend 3001, frontend 3000)
- `scripts/deploy.sh` — script de déploiement automatisé (checks prérequis, build, migrate, start)
- `scripts/init-ssl.sh` — génération des certificats Let's Encrypt (à exécuter une seule fois sur le serveur)

### Domaine & DNS
- `southconnect.io` transféré sur Cloudflare (protection DDoS, CDN gratuit)
- Nameservers Hostinger → Cloudflare (`cruz.ns.cloudflare.com` + `devin.ns.cloudflare.com`)
- Sous-domaine `mail.southconnect.io` créé et vérifié sur Resend ✅
- 4 enregistrements DNS ajoutés sur Cloudflare : DKIM, MX (SES), SPF, DMARC
- Stratégie de séparation des réputations email :
  - App (transactionnel) → `noreply@mail.southconnect.io`
  - Commercial / outreach → `@southconnect.io`

---

## Sécurité

- **OAuth email enumeration** : message d'erreur générique `OAUTH_AUTH_REQUIRED` pour bloquer la fuite d'information
- **Endpoint `/share`** : protégé par `JwtAuthGuard` + déduplication Redis (1 share/user/opportunité/jour)
- **WebSocket rate limit** : events `typing` limités à 1/sec/user via Redis (`NX + EX 1`)
- **RLS Supabase** : activé et configuré sur toutes les tables (fait manuellement sur le dashboard)
- **Audit git** : aucun secret commité — `GOOGLE_CLIENT_SECRET` et `SUPABASE_SERVICE_ROLE_KEY` protégés par `.gitignore` depuis le début

---

## Performance

- **Pagination curseur** : feed (`/opportunities`) et notifications migrent de `OFFSET/COUNT` vers `cursor + take+1` — O(log n), élimine le `COUNT(*)` coûteux
- **Index GIN PostgreSQL** : migration créée pour le fulltext search sur `opportunities` (name, punchline, description), `users` (name, bio), `bto_b_profiles` (companyName)
- **BullMQ email queue** : queue Redis persistante avec 5 tentatives et backoff exponentiel — les emails ne sont plus perdus en cas de timeout Resend

---

## Configuration

| Variable | Avant | Après |
|----------|-------|-------|
| `DATABASE_URL` | ancien mot de passe | `JvT0ztIQsmwfoiWo` |
| `RESEND_API_KEY` | ancienne clé | `re_EoSZw1id_...` |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | `noreply@mail.southconnect.io` |
| `ENFORCE_EMAIL_VERIFICATION` | `false` | `true` |
| `FRONTEND_URL` / `BACKEND_URL` | `http://localhost` | `https://southconnect.io` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | `https://southconnect.io/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:3001` | `https://southconnect.io` |

---

## Ce qui reste avant le lancement

| Tâche | Responsable | Statut |
|-------|-------------|--------|
| Acheter / configurer un serveur (VPS) | Équipe | ⏳ À faire |
| Pointer DNS `southconnect.io` → IP serveur (Cloudflare A record) | Équipe | ⏳ À faire |
| Exécuter `sudo ./scripts/init-ssl.sh` sur le serveur | Équipe | ⏳ À faire |
| Exécuter `./scripts/deploy.sh` | Équipe | ⏳ À faire |
