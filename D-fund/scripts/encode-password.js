#!/usr/bin/env node
/**
 * Script pour encoder un mot de passe PostgreSQL pour l'URL
 * Usage: node scripts/encode-password.js "votre-mot-de-passe"
 */

const password = process.argv[2];

if (!password) {
  console.error('❌ Usage: node scripts/encode-password.js "votre-mot-de-passe"');
  process.exit(1);
}

const encoded = encodeURIComponent(password);
console.log('\n🔐 Encodage du mot de passe:\n');
console.log(`Mot de passe original: ${password}`);
console.log(`Mot de passe encodé:   ${encoded}\n`);
console.log('📋 Connection string complète:');
console.log(`DATABASE_URL="postgresql://postgres:${encoded}@db.eblxcvivlowdqfbhhple.supabase.co:5432/postgres"\n`);
