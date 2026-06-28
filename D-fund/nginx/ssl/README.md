# SSL — Fichiers requis

Placer ici les 3 fichiers suivants (non committés en git) :

| Fichier         | Contenu                                      |
|-----------------|----------------------------------------------|
| `fullchain.pem` | Certificat + chaîne intermédiaire (Let's Encrypt) |
| `privkey.pem`   | Clé privée                                   |
| `dhparam.pem`   | Paramètres Diffie-Hellman 2048-bit            |

## Générer dhparam (une seule fois, ~2 min)

```bash
openssl dhparam -out nginx/ssl/dhparam.pem 2048
```

## Let's Encrypt avec Certbot (sur le serveur)

```bash
# Installer certbot
apt install certbot

# Générer le certificat (mode standalone, port 80 doit être libre)
certbot certonly --standalone -d votre-domaine.com -d www.votre-domaine.com

# Copier les fichiers
cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem   nginx/ssl/
chmod 600 nginx/ssl/privkey.pem
```

## Renouvellement automatique (crontab sur le serveur)

```cron
0 3 * * * certbot renew --quiet && docker compose exec nginx nginx -s reload
```
