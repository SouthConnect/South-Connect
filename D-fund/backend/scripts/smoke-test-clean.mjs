import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env' });
config({ path: '../.env' });

const BASE = 'http://localhost:3001/api/v1';
const prisma = new PrismaClient();

async function http(method, path, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return { status: res.status, payload };
}

async function main() {
  const created = {
    userId: null,
    opportunityId: null,
    applicationId: null,
  };

  try {
    console.log('1) GET /opportunities');
    let res = await http('GET', '/opportunities?take=1');
    console.log('status', res.status);

    const stamp = Date.now();
    const email = `test.user.${stamp}@example.com`;
    const password = 'Password123!';

    console.log('2) POST /auth/register');
    res = await http('POST', '/auth/register', {
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
    });
    console.log('status', res.status);
    if (res.status !== 201 && res.status !== 200) {
      console.error('register failed', res.payload);
      process.exitCode = 1;
      return;
    }

    const user = res.payload.user;
    const token = res.payload.token;
    created.userId = user.id;

    console.log('3) POST /opportunities');
    res = await http(
      'POST',
      '/opportunities',
      {
        name: 'Test Opportunity',
        type: 'JOB_OPPORTUNITY',
        description: 'Opportunity created during smoke test',
        status: 'DRAFT',
      },
      token,
    );
    console.log('status', res.status);
    if (res.status !== 201 && res.status !== 200) {
      console.error('create opportunity failed', res.payload);
      process.exitCode = 1;
      return;
    }

    created.opportunityId = res.payload.id;

    console.log('4) POST /applications');
    res = await http(
      'POST',
      '/applications',
      {
        opportunityId: created.opportunityId,
        title: 'Candidature test',
        goalLetter: 'Je suis intéressé.',
      },
      token,
    );
    console.log('status', res.status);
    if (res.status !== 201 && res.status !== 200) {
      console.error('create application failed', res.payload);
      process.exitCode = 1;
      return;
    }

    created.applicationId = res.payload.id;

    console.log('5) POST /applications/:id/submit');
    res = await http('POST', `/applications/${created.applicationId}/submit`, null, token);
    console.log('status', res.status);

    console.log('6) PUT /applications/:id/review');
    res = await http(
      'PUT',
      `/applications/${created.applicationId}/review`,
      {
        stage: 'OWNER_REVIEW',
        feedbackTitle: 'En cours',
        reviewFeedback: 'Review initiale.',
      },
      token,
    );
    console.log('status', res.status);

    console.log('7) GET /applications/user/:userId');
    res = await http('GET', `/applications/user/${created.userId}`, null, token);
    console.log('status', res.status);

    console.log('8) GET /applications/opportunity/:opportunityId');
    res = await http('GET', `/applications/opportunity/${created.opportunityId}`, null, token);
    console.log('status', res.status);

    console.log('DONE');
  } finally {
    if (process.env.SMOKE_KEEP_DATA === 'true') {
      await prisma.$disconnect();
      return;
    }

    // Cleanup created records to avoid test data accumulation
    if (created.applicationId) {
      await prisma.application.delete({ where: { id: created.applicationId } }).catch(() => {});
    }
    if (created.opportunityId) {
      await prisma.opportunity.delete({ where: { id: created.opportunityId } }).catch(() => {});
    }
    if (created.userId) {
      await prisma.user.delete({ where: { id: created.userId } }).catch(() => {});
    }

    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Smoke test failed', err);
  process.exitCode = 1;
});
