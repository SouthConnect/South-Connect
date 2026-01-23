#!/bin/bash
# Script pour récupérer votre adresse IP publique

echo "🔍 Récupération de votre adresse IP publique..."
echo ""

IP1=$(curl -s ifconfig.me 2>/dev/null)
IP2=$(curl -s ipinfo.io/ip 2>/dev/null)
IP3=$(curl -s icanhazip.com 2>/dev/null)

if [ ! -z "$IP1" ]; then
    echo "✅ Votre adresse IP publique : $IP1"
    echo ""
    echo "📋 Ajoutez cette IP dans Supabase :"
    echo "   1. Allez sur https://supabase.com/dashboard/project/eblxcvivlowdqfbhhple"
    echo "   2. Settings > Database"
    echo "   3. Trouvez 'IP Restrictions' ou 'Allowed IPs'"
    echo "   4. Ajoutez : $IP1"
elif [ ! -z "$IP2" ]; then
    echo "✅ Votre adresse IP publique : $IP2"
    echo ""
    echo "📋 Ajoutez cette IP dans Supabase :"
    echo "   1. Allez sur https://supabase.com/dashboard/project/eblxcvivlowdqfbhhple"
    echo "   2. Settings > Database"
    echo "   3. Trouvez 'IP Restrictions' ou 'Allowed IPs'"
    echo "   4. Ajoutez : $IP2"
else
    echo "❌ Impossible de récupérer l'IP automatiquement"
    echo "   Allez sur https://whatismyipaddress.com/ pour la trouver manuellement"
fi
