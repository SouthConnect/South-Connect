#!/bin/bash
# Test de connexion directe avec psql si disponible

PROJECT_ID="eblxcvivlowdqfbhhple"
PASSWORD="[REDACTED]@"
DB_URL="postgresql://postgres:${PASSWORD}@db.${PROJECT_ID}.supabase.co:5432/postgres"

echo "🔍 Test de connexion directe à Supabase..."
echo ""

# Vérifier si psql est disponible
if command -v psql &> /dev/null; then
    echo "✅ psql trouvé, test de connexion..."
    echo ""
    PGPASSWORD="${PASSWORD}" psql -h "db.${PROJECT_ID}.supabase.co" -p 5432 -U postgres -d postgres -c "SELECT version();" 2>&1
else
    echo "⚠️  psql n'est pas installé"
    echo "   Installation: sudo apt-get install postgresql-client"
    echo ""
    echo "🔍 Test avec telnet/nc..."
    timeout 5 nc -zv "db.${PROJECT_ID}.supabase.co" 5432 2>&1 || echo "❌ Port 5432 non accessible"
fi
