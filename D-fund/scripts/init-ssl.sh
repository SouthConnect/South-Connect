#!/usr/bin/env bash
# init-ssl.sh — Génère les certificats Let's Encrypt pour southconnect.io
# À exécuter UNE SEULE FOIS sur le serveur, avant le premier deploy.sh
# Prérequis : ports 80 et 443 ouverts, domaine pointant sur ce serveur
set -euo pipefail

DOMAIN="southconnect.io"
EMAIL="danbetheliryivuze@gmail.com"
SSL_DIR="$(pwd)/nginx/ssl"

echo "==> Vérification de certbot..."
if ! command -v certbot &>/dev/null; then
  echo "Installation de certbot..."
  apt-get update -qq && apt-get install -y certbot
fi

echo "==> Génération du certificat Let's Encrypt pour $DOMAIN..."
certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo "==> Copie des certificats dans nginx/ssl/..."
mkdir -p "$SSL_DIR"
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem "$SSL_DIR/fullchain.pem"
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem   "$SSL_DIR/privkey.pem"
chmod 600 "$SSL_DIR/privkey.pem"

echo "==> Génération dhparam 2048 bits (1-2 min)..."
openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048

echo ""
echo "==> Certificats prêts dans nginx/ssl/"
echo "    Lance maintenant : ./scripts/deploy.sh"
