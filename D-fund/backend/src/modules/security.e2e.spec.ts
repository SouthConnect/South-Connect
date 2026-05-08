/**
 * Security E2E Test Suite — D-Fund
 *
 * Covers:
 *  1. Authentication — invalid/missing tokens always return 401
 *  2. Authorization — users cannot access or modify other users' resources
 *  3. DRAFT opportunity visibility — hidden from everyone except the owner
 *  4. Private profile visibility — 404 for non-owners
 *  5. Admin-only routes — reject regular users with 403
 *  6. Application data — no password hash exposure
 *  7. Storage upload — requires authentication
 *  8. JWT tampering — forged tokens are rejected
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import helmet from 'helmet';
import { AppModule } from '../app.module';
import { PrismaService } from './prisma/prisma.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractToken(res: any): string {
  const cookies: string[] = (res.headers['set-cookie'] as string[]) ?? [];
  const cookie = cookies.find((c: string) => c.startsWith('access_token='));
  return cookie?.split(';')[0]?.split('=')[1] ?? '';
}

/** Register a user and return its token + id */
async function registerUser(
  app: INestApplication,
  overrides: Partial<{ email: string; firstName: string; lastName: string; role: string }> = {},
): Promise<{ token: string; userId: string; email: string }> {
  const ts = Date.now() + Math.random().toString(36).slice(2, 8);
  const email = overrides.email ?? `security-test-${ts}@example.com`;
  const body = {
    firstName: overrides.firstName ?? 'Sec',
    lastName: overrides.lastName ?? 'Test',
    name: `${overrides.firstName ?? 'Sec'} ${overrides.lastName ?? 'Test'}`,
    email,
    password: 'SecurePass123!',
    role: overrides.role ?? 'USER',
  };

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(body)
    .expect(201);

  return { token: extractToken(res), userId: res.body.user.id as string, email };
}

/** Create an opportunity and return its id */
async function createOpportunity(
  app: INestApplication,
  token: string,
  overrides: Partial<{ status: string; name: string }> = {},
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/opportunities')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: overrides.name ?? 'Test Opportunity',
      punchline: 'A test opportunity',
      description: 'Security test opportunity',
      type: 'JOB_OPPORTUNITY',
      status: overrides.status ?? 'ACTIVE',
    })
    .expect(201);
  return res.body.id as string;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Shared test actors
  let userA: { token: string; userId: string; email: string };
  let userB: { token: string; userId: string; email: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet({ crossOriginEmbedderPolicy: false }));
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create two independent users used across tests
    userA = await registerUser(app, { firstName: 'Alice', lastName: 'Sec' });
    userB = await registerUser(app, { firstName: 'Bob', lastName: 'Sec' });

    // Mark both users as email-verified so JwtAuthGuard lets them through
    await prisma.user.updateMany({
      where: { id: { in: [userA.userId, userB.userId] } },
      data: { isEmailVerified: true },
    });
  });

  afterAll(async () => {
    // Clean up test users so the database stays tidy across runs
    await prisma.user.deleteMany({
      where: {
        email: { in: [userA.email, userB.email] },
      },
    });
    if (app) await app.close();
  });

  // ── 1. Authentication ─────────────────────────────────────────────────────

  describe('1 — Authentication guards', () => {
    it('GET /auth/me without token → 401', () =>
      request(app.getHttpServer()).get('/api/v1/auth/me').expect(401));

    it('POST /opportunities without token → 401', () =>
      request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .send({ name: 'X', punchline: 'X', description: 'X', type: 'JOB' })
        .expect(401));

    it('POST /applications without token → 401', () =>
      request(app.getHttpServer())
        .post('/api/v1/applications')
        .send({ opportunityId: 'fake-id' })
        .expect(401));

    it('POST /storage/upload without token → 401', () =>
      request(app.getHttpServer()).post('/api/v1/storage/upload').expect(401));

    it('PUT /profiles/bto-c/:userId without token → 401', () =>
      request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-c/${userA.userId}`)
        .send({})
        .expect(401));

    it('GET /applications/user/:userId without token → 401', () =>
      request(app.getHttpServer())
        .get(`/api/v1/applications/user/${userA.userId}`)
        .expect(401));
  });

  // ── 2. JWT tampering ───────────────────────────────────────────────────────

  describe('2 — JWT tampering', () => {
    it('completely fake token → 401', () =>
      request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer this.is.not.a.jwt')
        .expect(401));

    it('valid JWT with altered payload (signature mismatch) → 401', async () => {
      // Take userA's valid token and corrupt the payload segment
      const parts = userA.token.split('.');
      const fakePayload = Buffer.from(
        JSON.stringify({ sub: userB.userId, email: userB.email }),
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${fakePayload}.${parts[2]}`;

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('Authorization header without Bearer scheme → 401', () =>
      request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', userA.token)
        .expect(401));
  });

  // ── 3. DRAFT opportunity visibility ───────────────────────────────────────

  describe('3 — DRAFT opportunity visibility', () => {
    let draftId: string;

    beforeAll(async () => {
      draftId = await createOpportunity(app, userA.token, { status: 'DRAFT', name: 'My Secret Draft' });
    });

    afterAll(async () => {
      await prisma.opportunity.deleteMany({ where: { id: draftId } });
    });

    it('public feed (GET /opportunities) does NOT return DRAFTs', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/opportunities').expect(200);
      // Response is now { data: [...], total: number, hasMore: boolean }
      const ids: string[] = res.body.data.map((o: any) => o.id);
      expect(ids).not.toContain(draftId);
    });

    it('anonymous GET /opportunities/:id for a DRAFT → 404', async () => {
      await request(app.getHttpServer()).get(`/api/v1/opportunities/${draftId}`).expect(404);
    });

    it('authenticated non-owner GET /opportunities/:id for a DRAFT → 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/opportunities/${draftId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(404);
    });

    it('owner CAN see their own DRAFT', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/${draftId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);
      expect(res.body.id).toBe(draftId);
      expect(res.body.status).toBe('DRAFT');
    });

    it('GET /opportunities/user/:userId does NOT expose DRAFTs to non-owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/user/${userA.userId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);
      const ids: string[] = res.body.map((o: any) => o.id);
      expect(ids).not.toContain(draftId);
    });

    it('owner sees their own DRAFTs in /opportunities/user/:userId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/user/${userA.userId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);
      const ids: string[] = res.body.map((o: any) => o.id);
      expect(ids).toContain(draftId);
    });
  });

  // ── 4. Opportunity ownership — CRUD authorization ─────────────────────────

  describe('4 — Opportunity ownership (CRUD)', () => {
    let oppId: string;

    beforeAll(async () => {
      oppId = await createOpportunity(app, userA.token, { status: 'ACTIVE', name: 'UserA Opportunity' });
    });

    afterAll(async () => {
      await prisma.opportunity.deleteMany({ where: { id: oppId } });
    });

    it('UserB cannot update UserA\'s opportunity → 403', () =>
      request(app.getHttpServer())
        .put(`/api/v1/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ name: 'Hacked Name' })
        .expect(403));

    it('UserB cannot delete UserA\'s opportunity → 403', () =>
      request(app.getHttpServer())
        .delete(`/api/v1/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(403));

    it('Owner (UserA) can update their own opportunity → 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ name: 'Updated Name' })
        .expect(200);
      expect(res.body.name).toBe('Updated Name');
    });
  });

  // ── 5. Profile visibility ─────────────────────────────────────────────────

  describe('5 — Private profile visibility', () => {
    it('public profile is visible to anyone', async () => {
      // Profiles default to public (visibility=true)
      const res = await request(app.getHttpServer())
        .get(`/api/v1/profiles/${userA.userId}`)
        .expect(200);
      expect(res.body).toHaveProperty('id', userA.userId);
      // Password must never be exposed
      expect(res.body).not.toHaveProperty('password');
    });

    it('profile response never contains password hash', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/profiles/${userA.userId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);
      expect(res.body).not.toHaveProperty('password');
    });

    it('private profile returns 404 for non-owner (set via Prisma directly)', async () => {
      // Make userB's profile private
      await prisma.user.update({
        where: { id: userB.userId },
        data: { visibility: false },
      });

      await request(app.getHttpServer())
        .get(`/api/v1/profiles/${userB.userId}`)
        .expect(404);

      // Restore for subsequent tests
      await prisma.user.update({
        where: { id: userB.userId },
        data: { visibility: true },
      });
    });

    it('private profile owner can still see it', async () => {
      await prisma.user.update({
        where: { id: userB.userId },
        data: { visibility: false },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/profiles/${userB.userId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      expect(res.body.id).toBe(userB.userId);

      await prisma.user.update({
        where: { id: userB.userId },
        data: { visibility: true },
      });
    });
  });

  // ── 6. Profile update ownership ───────────────────────────────────────────

  describe('6 — Profile update ownership', () => {
    it('UserB cannot update UserA\'s BtoC profile → 403', () =>
      request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-c/${userA.userId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ description: 'Hacked description' })
        .expect(403));

    it('UserB cannot update UserA\'s BtoB profile → 403', () =>
      request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-b/${userA.userId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ description: 'Hacked' })
        .expect(403));
  });

  // ── 7. Application scoping — users only see their own applications ─────────

  describe('7 — Application scoping', () => {
    it('UserA cannot read UserB\'s applications → 403', () =>
      request(app.getHttpServer())
        .get(`/api/v1/applications/user/${userB.userId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(403));

    it('UserA can read their own applications', () =>
      request(app.getHttpServer())
        .get(`/api/v1/applications/user/${userA.userId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200));
  });

  // ── 8. Admin-only routes ──────────────────────────────────────────────────

  describe('8 — Admin-only routes', () => {
    it('regular user calling GET /opportunities/admin/all → 403', () =>
      request(app.getHttpServer())
        .get('/api/v1/opportunities/admin/all')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(403));

    it('regular user calling PUT /opportunities/admin/:id/status → 403', async () => {
      // We need a real opportunity id; the exact id doesn't matter here because
      // the role check runs before the DB lookup
      const fakeId = 'cluuuuuuuuuuuuuuuuuuuuuu';
      await request(app.getHttpServer())
        .put(`/api/v1/opportunities/admin/${fakeId}/status`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ status: 'ACTIVE' })
        .expect(403);
    });

    it('unauthenticated request to admin routes → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/opportunities/admin/all')
        .expect(401);
    });
  });

  // ── 9. Storage — auth required, file type & size validation ───────────────

  describe('9 — Storage security', () => {
    it('upload without authentication → 401', () =>
      request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .attach('file', Buffer.from('fake'), { filename: 'test.png', contentType: 'image/png' })
        .expect(401));

    it('upload with invalid MIME type → 400', () =>
      request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Authorization', `Bearer ${userA.token}`)
        .field('prefix', 'avatars')
        .field('resourceId', userA.userId)
        .attach('file', Buffer.from('<script>alert(1)</script>'), {
          filename: 'evil.html',
          contentType: 'text/html',
        })
        .expect(400));

    it('upload with oversized file → 400', () => {
      // Create a 6 MB buffer (limit is 5 MB)
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 0);
      return request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Authorization', `Bearer ${userA.token}`)
        .field('prefix', 'avatars')
        .field('resourceId', userA.userId)
        .attach('file', bigBuffer, { filename: 'big.jpg', contentType: 'image/jpeg' })
        .expect(400);
    });

    it('delete file without authentication → 401', () =>
      request(app.getHttpServer())
        .delete('/api/v1/storage/file')
        .send({ bucket: 'images', path: 'avatars/test/image.jpg' })
        .expect(401));
  });

  // ── 10. Auth response — no password in register/login ────────────────────

  describe('10 — Auth response sanity', () => {
    it('register response does not contain password hash', async () => {
      const ts = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Pwd',
          lastName: 'Test',
          name: 'Pwd Test',
          email: `pwd-check-${ts}@example.com`,
          password: 'SecurePass123!',
          role: 'USER',
        })
        .expect(201);

      expect(res.body.user).not.toHaveProperty('password');

      // Cleanup
      await prisma.user.deleteMany({ where: { email: `pwd-check-${ts}@example.com` } });
    });

    it('login response does not contain password hash', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userA.email, password: 'SecurePass123!' })
        .expect(200);

      expect(res.body.user).not.toHaveProperty('password');
    });

    it('GET /auth/me response does not contain password hash', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(res.body).not.toHaveProperty('password');
    });
  });

  // ── 11. Validation — endpoint rejects malformed/extra fields ─────────────

  describe('11 — Input validation (whitelist)', () => {
    it('extra unknown fields on register are stripped or rejected', async () => {
      const ts = Date.now();
      // forbidNonWhitelisted is ON — unknown fields should produce 400
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Val',
          lastName: 'Test',
          name: 'Val Test',
          email: `val-test-${ts}@example.com`,
          password: 'SecurePass123!',
          role: 'USER',
          isAdmin: true, // injected extra field
          __proto__: { isAdmin: true }, // prototype pollution attempt
        });

      // Either 400 (rejected) or 201 without the extra field being honoured
      if (res.status === 201) {
        expect((res.body.user as any).isAdmin).toBeUndefined();
        await prisma.user.deleteMany({ where: { email: `val-test-${ts}@example.com` } });
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('SQL injection string in query param is handled safely', async () => {
      // The route must not crash — it should return 200 with an empty or filtered list
      const res = await request(app.getHttpServer())
        .get("/api/v1/opportunities?search=' OR '1'='1")
        .expect(200);
      // Response must have a data array (even if empty) — no 500
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('extremely long search string does not crash the API (no 500)', async () => {
      const longStr = 'A'.repeat(10_000);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities?search=${longStr}`);
      // Le serveur doit rejeter proprement (400 validation) ou répondre — jamais planter (500)
      expect(res.status).not.toBe(500);
    });
  });

  // ── 12. CORS / security headers ───────────────────────────────────────────

  describe('12 — Security headers (Helmet)', () => {
    it('response includes X-Content-Type-Options: nosniff', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/opportunities').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('response includes X-Frame-Options', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/opportunities').expect(200);
      // Helmet sets either DENY or SAMEORIGIN
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });
});
