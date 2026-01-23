#!/bin/bash

# Script de nettoyage - Supprime les anciens fichiers/dossiers à la racine
# qui ont été déplacés dans frontend/

echo "🧹 Nettoyage des anciens fichiers..."

# Supprimer les anciens dossiers
if [ -d "app" ]; then
  echo "❌ Suppression de app/ (maintenant dans frontend/app/)"
  rm -rf app
  echo "✅ app/ supprimé"
fi

if [ -d "components" ]; then
  echo "❌ Suppression de components/ (maintenant dans frontend/components/)"
  rm -rf components
  echo "✅ components/ supprimé"
fi

# Supprimer les anciens fichiers de config
if [ -f "next.config.js" ]; then
  echo "❌ Suppression de next.config.js (maintenant dans frontend/)"
  rm next.config.js
  echo "✅ next.config.js supprimé"
fi

if [ -f "tailwind.config.js" ]; then
  echo "❌ Suppression de tailwind.config.js (maintenant dans frontend/)"
  rm tailwind.config.js
  echo "✅ tailwind.config.js supprimé"
fi

if [ -f "postcss.config.js" ]; then
  echo "❌ Suppression de postcss.config.js (maintenant dans frontend/)"
  rm postcss.config.js
  echo "✅ postcss.config.js supprimé"
fi

if [ -f ".eslintrc.json" ]; then
  echo "❌ Suppression de .eslintrc.json (maintenant dans frontend/)"
  rm .eslintrc.json
  echo "✅ .eslintrc.json supprimé"
fi

# Vérifier si tsconfig.json est pour Next.js (à supprimer) ou partagé
if [ -f "tsconfig.json" ]; then
  if grep -q '"name": "next"' tsconfig.json 2>/dev/null || grep -q "next" tsconfig.json 2>/dev/null; then
    echo "❌ Suppression de tsconfig.json Next.js (maintenant dans frontend/)"
    rm tsconfig.json
    echo "✅ tsconfig.json supprimé"
  else
    echo "ℹ️  tsconfig.json conservé (fichier partagé)"
  fi
fi

# Supprimer package-lock.json à la racine si existe
if [ -f "package-lock.json" ]; then
  echo "❌ Suppression de package-lock.json (maintenant dans frontend/ et backend/)"
  rm package-lock.json
  echo "✅ package-lock.json supprimé"
fi

echo ""
echo "✅ Nettoyage terminé !"
echo ""
echo "📁 Structure actuelle :"
echo "  ✅ backend/     - API NestJS"
echo "  ✅ frontend/    - Frontend Next.js"
echo "  ✅ prisma/      - Schéma partagé"
echo "  ✅ scripts/     - Scripts utilitaires"
echo ""
