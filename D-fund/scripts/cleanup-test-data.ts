#!/usr/bin/env tsx
/**
 * Script de nettoyage des données de test dans Supabase
 * Supprime les utilisateurs et opportunités de test
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const backendPath = path.join(__dirname, '../backend');

function executeSQL(sql: string) {
  try {
    execSync(
      `cd ${backendPath} && npx prisma db execute --stdin --schema=${schemaPath}`,
      {
        input: sql,
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        encoding: 'utf-8',
        stdio: 'pipe',
      }
    );
    return true;
  } catch (error: any) {
    console.log(`Erreur: ${error.message}`);
    return false;
  }
}

async function cleanupTestData() {
  console.log('Nettoyage des données de test...\n');
  
  // Supprimer les opportunités de test
  console.log('1. Suppression des opportunités de test...');
  const deleteOppsSQL = `
    DELETE FROM opportunities 
    WHERE name LIKE 'Test Opportunity%' 
       OR name LIKE 'Test%Auto Cleanup%'
       OR description LIKE '%test automatique%'
       OR description LIKE '%sera automatiquement supprimée%';
  `;
  if (executeSQL(deleteOppsSQL)) {
    console.log('   Opportunités de test supprimées');
  }
  
  // Supprimer les utilisateurs de test
  console.log('\n2. Suppression des utilisateurs de test...');
  const deleteUsersSQL = `
    DELETE FROM users 
    WHERE email LIKE 'test-opp-%@example.com'
       OR email LIKE 'test-opportunity%@example.com'
       OR (name LIKE 'Test User%' AND email LIKE '%@example.com');
  `;
  if (executeSQL(deleteUsersSQL)) {
    console.log('   Utilisateurs de test supprimés');
  }
  
  // Supprimer les applications orphelines
  console.log('\n3. Nettoyage des applications orphelines...');
  const deleteAppsSQL = `
    DELETE FROM applications 
    WHERE "opportunityId" NOT IN (SELECT id FROM opportunities)
       OR "candidateId" NOT IN (SELECT id FROM users);
  `;
  if (executeSQL(deleteAppsSQL)) {
    console.log('   Applications orphelines supprimées');
  }
  
  console.log('\nNettoyage terminé.');
}

cleanupTestData();
