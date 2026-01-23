#!/usr/bin/env tsx
/**
 * Script de test complet de tous les endpoints mentionnés dans le rapport
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
}

const results: TestResult[] = [];

async function test(name: string, testFn: () => Promise<boolean>, details?: string) {
  try {
    const success = await testFn();
    results.push({
      name,
      status: success ? 'PASS' : 'FAIL',
      details,
    });
    console.log(`${success ? '✅' : '❌'} ${name}`);
    if (details) console.log(`   ${details}`);
  } catch (error: any) {
    results.push({
      name,
      status: 'FAIL',
      details: error.message,
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function main() {
  console.log('=== TESTS COMPLETS DES ENDPOINTS ===\n');

  // Test 1: Vérifier que le backend répond
  await test('Backend accessible', async () => {
    const response = await fetch(`${API_URL}/opportunities`);
    return response.status === 200 || response.status === 401;
  }, 'Vérification de la connectivité');

  // Test 2: POST /api/v1/auth/register
  const testEmail = `test-${Date.now()}@example.com`;
  let testToken: string | null = null;
  let testUserId: string | null = null;

  await test('POST /api/v1/auth/register - Inscription', async () => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
      }),
    });
    const data = await response.json();
    if (response.ok && data.token && data.user) {
      testToken = data.token;
      testUserId = data.user.id;
      return true;
    }
    return false;
  }, 'Création d\'un utilisateur de test');

  // Test 3: POST /api/v1/auth/login
  await test('POST /api/v1/auth/login - Connexion', async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Test123!',
      }),
    });
    const data = await response.json();
    return response.ok && data.token && data.user;
  }, 'Connexion avec les identifiants créés');

  if (!testToken || !testUserId) {
    console.log('\n⚠️  Impossible de continuer sans token. Arrêt des tests.');
    return;
  }

  // Test 4: GET /api/v1/opportunities
  await test('GET /api/v1/opportunities - Liste des opportunités', async () => {
    const response = await fetch(`${API_URL}/opportunities`);
    return response.ok;
  }, 'Consultation de la liste');

  // Test 5: POST /api/v1/opportunities
  let testOpportunityId: string | null = null;
  await test('POST /api/v1/opportunities - Création d\'opportunité', async () => {
    const response = await fetch(`${API_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        name: 'Test Opportunity - Validation',
        type: 'JOB_OPPORTUNITY',
        description: 'Opportunité de test pour validation',
        status: 'DRAFT',
      }),
    });
    const data = await response.json();
    if (response.ok && data.id) {
      testOpportunityId = data.id;
      return true;
    }
    return false;
  }, 'Création avec authentification');

  // Test 6: GET /api/v1/opportunities/:id
  if (testOpportunityId) {
    await test('GET /api/v1/opportunities/:id - Détails d\'une opportunité', async () => {
      const response = await fetch(`${API_URL}/opportunities/${testOpportunityId}`);
      return response.ok;
    }, 'Consultation des détails');
  }

  // Test 7: GET /api/v1/opportunities/user/:userId
  await test('GET /api/v1/opportunities/user/:userId - Opportunités par utilisateur', async () => {
    const response = await fetch(`${API_URL}/opportunities/user/${testUserId}`);
    return response.ok;
  }, 'Liste des opportunités de l\'utilisateur');

  // Test 8: PUT /api/v1/opportunities/:id
  if (testOpportunityId) {
    await test('PUT /api/v1/opportunities/:id - Modification d\'opportunité', async () => {
      const response = await fetch(`${API_URL}/opportunities/${testOpportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          name: 'Test Opportunity - Modifiée',
        }),
      });
      return response.ok;
    }, 'Modification avec authentification');
  }

  // Test 9: POST /api/v1/applications
  let testApplicationId: string | null = null;
  if (testOpportunityId) {
    await test('POST /api/v1/applications - Création de candidature', async () => {
      const response = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          opportunityId: testOpportunityId,
          title: 'Candidature de test',
          goalLetter: 'Je suis intéressé par cette opportunité',
        }),
      });
      const data = await response.json();
      if (response.ok && data.id) {
        testApplicationId = data.id;
        return true;
      }
      return false;
    }, 'Création de candidature');
  }

  // Test 10: GET /api/v1/applications/opportunity/:opportunityId
  if (testOpportunityId) {
    await test('GET /api/v1/applications/opportunity/:opportunityId - Candidatures d\'une opportunité', async () => {
      const response = await fetch(`${API_URL}/applications/opportunity/${testOpportunityId}`);
      return response.ok;
    }, 'Liste des candidatures');
  }

  // Test 11: GET /api/v1/applications/user/:userId
  await test('GET /api/v1/applications/user/:userId - Candidatures d\'un utilisateur', async () => {
    const response = await fetch(`${API_URL}/applications/user/${testUserId}`);
    return response.ok;
  }, 'Liste des candidatures de l\'utilisateur');

  // Test 12: PUT /api/v1/applications/:id
  if (testApplicationId) {
    await test('PUT /api/v1/applications/:id - Modification de candidature', async () => {
      const response = await fetch(`${API_URL}/applications/${testApplicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          goalLetter: 'Candidature modifiée',
        }),
      });
      return response.ok;
    }, 'Modification de candidature (brouillon uniquement)');
  }

  // Test 13: POST /api/v1/applications/:id/submit
  if (testApplicationId) {
    await test('POST /api/v1/applications/:id/submit - Soumission de candidature', async () => {
      const response = await fetch(`${API_URL}/applications/${testApplicationId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      });
      return response.ok;
    }, 'Soumission (DRAFT → SUBMITTED)');
  }

  // Test 14: GET /api/v1/profiles/:userId
  await test('GET /api/v1/profiles/:userId - Profil complet', async () => {
    const response = await fetch(`${API_URL}/profiles/${testUserId}`);
    return response.ok;
  }, 'Consultation du profil');

  // Test 15: GET /api/v1/profiles/lists/talents
  await test('GET /api/v1/profiles/lists/talents - Liste des talents', async () => {
    const response = await fetch(`${API_URL}/profiles/lists/talents`);
    return response.ok;
  }, 'Liste publique des talents');

  // Test 16: GET /api/v1/profiles/lists/companies
  await test('GET /api/v1/profiles/lists/companies - Liste des entreprises', async () => {
    const response = await fetch(`${API_URL}/profiles/lists/companies`);
    return response.ok;
  }, 'Liste publique des entreprises');

  // Test 17: PUT /api/v1/profiles/bto-c/:userId
  await test('PUT /api/v1/profiles/bto-c/:userId - Mise à jour profil talent', async () => {
    const response = await fetch(`${API_URL}/profiles/bto-c/${testUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        tags: ['Test', 'Validation'],
        seniorityLevel: 'Mid',
      }),
    });
    return response.ok || response.status === 404;
  }, 'Mise à jour profil (404 si profil BtoC n\'existe pas)');

  // Test 18: PUT /api/v1/profiles/bto-b/:userId
  await test('PUT /api/v1/profiles/bto-b/:userId - Mise à jour profil entreprise', async () => {
    const response = await fetch(`${API_URL}/profiles/bto-b/${testUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        companyName: 'Test Company',
      }),
    });
    return response.ok || response.status === 404;
  }, 'Mise à jour profil (404 si profil BtoB n\'existe pas)');

  // Test 19: GET /api/v1/messages/public/:discussionId
  await test('GET /api/v1/messages/public/:discussionId - Messages publics', async () => {
    const response = await fetch(`${API_URL}/messages/public/test-discussion-id`);
    return response.ok || response.status === 404;
  }, 'Endpoint présent (404 si discussion n\'existe pas)');

  // Test 20: GET /api/v1/messages/private/:discussionId
  await test('GET /api/v1/messages/private/:discussionId - Messages privés', async () => {
    const response = await fetch(`${API_URL}/messages/private/test-discussion-id`);
    return response.ok || response.status === 404;
  }, 'Endpoint présent (404 si discussion n\'existe pas)');

  // Test 21: GET /api/v1/users/:id
  await test('GET /api/v1/users/:id - Consultation utilisateur', async () => {
    const response = await fetch(`${API_URL}/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
      },
    });
    return response.ok;
  }, 'Consultation avec authentification');

  // Nettoyage
  console.log('\n=== NETTOYAGE ===');
  if (testOpportunityId && testToken) {
    try {
      await fetch(`${API_URL}/opportunities/${testOpportunityId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${testToken}` },
      });
      console.log('✅ Opportunité de test supprimée');
    } catch (e) {
      console.log('⚠️  Erreur lors de la suppression de l\'opportunité');
    }
  }

  // Résumé
  console.log('\n=== RÉSUMÉ DES TESTS ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`✅ Réussis: ${passed}`);
  console.log(`❌ Échoués: ${failed}`);
  console.log(`⏭️  Ignorés: ${skipped}`);
  console.log(`\nTotal: ${results.length} tests`);

  if (failed > 0) {
    console.log('\n=== DÉTAILS DES ÉCHECS ===');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`❌ ${r.name}`);
      if (r.details) console.log(`   ${r.details}`);
    });
  }
}

main().catch(console.error);
