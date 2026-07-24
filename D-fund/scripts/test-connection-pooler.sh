#!/bin/bash
# Test de connexion avec le connection pooler Supabase

PROJECT_ID="eblxcvivlowdqfbhhple"
PASSWORD="${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD (URL-encoded) before running this script}"

echo "🔍 Test de connexion avec le Connection Pooler (port 6543)..."
echo ""

# URL avec connection pooler (port 6543)
POOLER_URL="postgresql://postgres.${PROJECT_ID}:${PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

echo "📍 URL Pooler: postgresql://postgres.${PROJECT_ID}:****@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
echo ""

# Tester avec Prisma
cd backend
export DATABASE_URL="$POOLER_URL"
npx prisma db execute --stdin --schema=../prisma/schema.prisma <<< "SELECT version();" 2>&1 | head -20
