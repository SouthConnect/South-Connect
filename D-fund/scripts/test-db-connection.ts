#!/usr/bin/env tsx
/**
 * Script de test de connexion à Supabase
 * Vérifie que la base de données est accessible
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';

// Charger les variables d'environnement depuis la racine
dotenv.config({ path: path.join(__dirname, '../.env') });

function testConnection() {
  console.log('Test de connexion à Supabase...\n');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL n\'est pas défini dans .env');
    process.exit(1);
  }

  // Masquer le mot de passe dans l'URL pour l'affichage
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`URL de connexion: ${maskedUrl}\n`);

  try {
    console.log('Test de connexion avec Prisma...\n');
    
    // Utiliser Prisma pour tester la connexion
    const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
    const result = execSync(
      `cd ${path.join(__dirname, '../backend')} && npx prisma db execute --stdin --schema=${schemaPath}`,
      {
        input: 'SELECT version() as version;',
        env: { ...process.env, DATABASE_URL: dbUrl },
        encoding: 'utf-8',
      }
    );
    
    console.log('Connexion réussie !\n');
    console.log('Résultat:', result);
    
  } catch (error: any) {
    console.error('Erreur de connexion:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('P1001') || error.message.includes("Can't reach")) {
      console.log('Suggestions:');
      console.log('   1. Vérifiez que votre projet Supabase est actif');
      console.log('   2. Vérifiez votre connexion internet');
      console.log('   3. Vérifiez que le mot de passe dans DATABASE_URL est correct');
      console.log('   4. Essayez d\'utiliser le connection pooler (port 6543)');
      console.log('   5. Vérifiez les paramètres de firewall de Supabase');
      console.log('   6. Vérifiez dans Supabase Dashboard > Settings > Database\n');
    }
    
    // Test alternatif avec psql si disponible
    console.log('Tentative de test alternatif...\n');
    try {
      const testResult = execSync(
        `cd ${path.join(__dirname, '../backend')} && npx prisma db push --schema=${schemaPath} --skip-generate --accept-data-loss`,
        {
          env: { ...process.env, DATABASE_URL: dbUrl },
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );
      console.log('Test alternatif réussi !');
    } catch (altError: any) {
      console.log('Test alternatif également échoué');
      process.exit(1);
    }
  }
}

testConnection();
