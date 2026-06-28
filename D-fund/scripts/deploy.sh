#!/usr/bin/env bash
# deploy.sh — Déploiement production D-Fund
# Usage : ./scripts/deploy.sh [--no-build]
set -euo pipefail

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
NO_BUILD=${1:-""}

echo "==> Vérification des prérequis..."

if [ ! -f .env ]; then
  echo "ERREUR : fichier .env manquant à la racine (voir .env.example)"
  exit 1
fi

if [ ! -f backend/.env ]; then
  echo "ERREUR : fichier backend/.env manquant (voir backend/.env.example)"
  exit 1
fi

if [ ! -f nginx/ssl/fullchain.pem ] || [ ! -f nginx/ssl/privkey.pem ]; then
  echo "ERREUR : certificats SSL manquants dans nginx/ssl/"
  echo "         Voir nginx/ssl/README.md pour les générer"
  exit 1
fi

if [ ! -f nginx/ssl/dhparam.pem ]; then
  echo "==> Génération dhparam (peut prendre 1-2 min)..."
  openssl dhparam -out nginx/ssl/dhparam.pem 2048
fi

echo "==> Pull des images de base..."
$COMPOSE pull redis nginx

if [ "$NO_BUILD" != "--no-build" ]; then
  echo "==> Build des images backend + frontend..."
  $COMPOSE build --no-cache backend frontend
fi

echo "==> Arrêt des anciens conteneurs..."
$COMPOSE down --remove-orphans

echo "==> Démarrage Redis..."
$COMPOSE up -d redis
$COMPOSE run --rm migrate

echo "==> Démarrage backend + frontend + nginx..."
$COMPOSE up -d

echo "==> Statut des services..."
$COMPOSE ps

echo ""
echo "==> Déploiement terminé."
echo "    Logs : docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
