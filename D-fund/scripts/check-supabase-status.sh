#!/bin/bash
# Script pour vérifier le statut du projet Supabase

PROJECT_ID="eblxcvivlowdqfbhhple"
PROJECT_URL="https://${PROJECT_ID}.supabase.co"
HEALTH_URL="${PROJECT_URL}/auth/v1/health"

echo "🔍 Vérification du projet Supabase..."
echo "Project ID: $PROJECT_ID"
echo ""

# Vérifier si le projet répond via l'endpoint de santé Auth
echo "⏳ Test de connexion au projet (auth/v1/health)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Le projet Supabase répond (HTTP 200 sur /auth/v1/health)"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Le projet Supabase répond (HTTP 401: endpoint accessible mais sans clé API)"
    echo "   -> Ajoutez un header apikey pour tester l'authentification complète si besoin."
else
    echo "⚠️  Le projet ne répond pas comme attendu (code HTTP: $HTTP_CODE)"
    echo "   Allez sur https://supabase.com/dashboard pour vérifier le statut"
fi

echo ""
echo "📋 Informations de connexion:"
echo "   Dashboard: https://supabase.com/dashboard/project/$PROJECT_ID"
echo "   API URL: $PROJECT_URL"
echo "   Database: db.$PROJECT_ID.supabase.co:5432"
echo ""
echo "💡 Si le projet est en pause, activez-le depuis le dashboard"
echo "   Les projets gratuits peuvent être mis en pause après 7 jours d'inactivité"
