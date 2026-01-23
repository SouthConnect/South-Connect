#!/bin/bash
# Script pour vérifier le statut du projet Supabase

PROJECT_ID="eblxcvivlowdqfbhhple"
PROJECT_URL="https://${PROJECT_ID}.supabase.co"

echo "🔍 Vérification du projet Supabase..."
echo "Project ID: $PROJECT_ID"
echo ""

# Vérifier si le projet répond
echo "⏳ Test de connexion au projet..."
if curl -s -o /dev/null -w "%{http_code}" "$PROJECT_URL" | grep -q "200\|301\|302"; then
    echo "✅ Le projet Supabase répond (HTTP OK)"
else
    echo "⚠️  Le projet ne répond pas ou est en pause"
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
