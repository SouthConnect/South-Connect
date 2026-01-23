#!/usr/bin/env tsx
/**
 * Script de test pour POST /opportunities avec nettoyage automatique
 * Crée des données de test, teste l'endpoint, puis nettoie tout
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const TEST_EMAIL = `test-opp-${Date.now()}@example.com`;
const TEST_PASSWORD = 'test123456';
let testUserId: string | null = null;
let testOpportunityId: string | null = null;
let testToken: string | null = null;

async function cleanup() {
  console.log('\nNettoyage des données de test...');
  
  if (testOpportunityId && testToken) {
    try {
      const response = await fetch(`${API_URL}/opportunities/${testOpportunityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      });
      if (response.ok) {
        console.log(`Opportunité de test supprimée: ${testOpportunityId}`);
      }
    } catch (error: any) {
      console.log(`Erreur lors de la suppression de l'opportunité: ${error.message}`);
    }
  }
  
  if (testUserId) {
    try {
      // Utiliser Prisma depuis le backend pour supprimer l'utilisateur
      const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
      execSync(
        `cd ${path.join(__dirname, '../backend')} && npx prisma db execute --stdin --schema=${schemaPath}`,
        {
          input: `DELETE FROM users WHERE id = '${testUserId}';`,
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );
      console.log(`Utilisateur de test supprimé: ${testUserId}`);
    } catch (error: any) {
      console.log(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
    }
  }
}

async function testOpportunities() {
  try {
    console.log('Test POST /opportunities avec nettoyage automatique\n');
    
    // 1. Créer un utilisateur de test via API
    console.log('1. Création utilisateur de test...');
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User Opportunity',
        role: 'USER',
      }),
    });
    
    if (!registerResponse.ok) {
      const error = await registerResponse.json();
      throw new Error(`Échec inscription: ${JSON.stringify(error)}`);
    }
    
    const registerData = await registerResponse.json();
    testUserId = registerData.user.id;
    testToken = registerData.token;
    console.log(`   Utilisateur créé: ${testUserId}`);
    console.log(`   Token obtenu`);
    
    // 3. Tester POST /opportunities via API
    console.log('\n3. Test POST /opportunities...');
    const response = await fetch(`${API_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        name: 'Test Opportunity - Auto Cleanup',
        type: 'JOB_OPPORTUNITY',
        punchline: 'Test automatique avec nettoyage',
        description: 'Cette opportunité sera automatiquement supprimée après le test',
        status: 'DRAFT',
        city: 'Paris',
        country: 'France',
        remote: true,
        tags: ['test', 'automated'],
        industries: ['Tech'],
        markets: ['Europe'],
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
    }
    
    const opportunity = await response.json();
    testOpportunityId = opportunity.id;
    console.log(`   Opportunité créée: ${opportunity.id}`);
    console.log(`   Nom: ${opportunity.name}`);
    console.log(`   Type: ${opportunity.type}`);
    console.log(`   Status: ${opportunity.status}`);
    
    // 4. Vérifier que l'opportunité est dans la liste
    console.log('\n4. Vérification dans la liste...');
    const listResponse = await fetch(`${API_URL}/opportunities?take=5`);
    const opportunities = await listResponse.json();
    const found = opportunities.find((opp: any) => opp.id === opportunity.id);
    
    if (found) {
      console.log(`   Opportunité trouvée dans la liste`);
    } else {
      throw new Error('Opportunité non trouvée dans la liste');
    }
    
    // 5. Test sans authentification (doit échouer)
    console.log('\n5. Test protection authentification...');
    const unauthResponse = await fetch(`${API_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test',
        type: 'JOB_OPPORTUNITY',
      }),
    });
    
    if (unauthResponse.status === 401) {
      console.log('   Protection active: Unauthorized sans token');
    } else {
      throw new Error(`Protection manquante: ${unauthResponse.status}`);
    }
    
    console.log('\nTous les tests sont passés !');
    
  } catch (error: any) {
    console.error(`\nErreur: ${error.message}`);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Gérer les signaux pour nettoyer même en cas d'interruption
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

testOpportunities();
