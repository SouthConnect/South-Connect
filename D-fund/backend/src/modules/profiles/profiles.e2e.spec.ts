/**
 * Profiles E2E Test Suite
 *
 * Covers:
 *  1. GET /profiles/:userId — public read (no auth), visibility gating
 *  2. GET /profiles/lists/talents — paginated BtoC talent list
 *  3. GET /profiles/lists/companies — paginated BtoB company list
 *  4. GET /profiles/lists/members — paginated public members list
 *  5. PUT /profiles/bto-c/:userId — update BtoC profile (auth + ownership)
 *  6. PUT /profiles/bto-b/:userId — update BtoB profile (auth + ownership)
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserAwareThrottlerGuard } from '../../common/guards/user-aware-throttler.guard';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../prisma/prisma.service';

function extractToken(res: any): string {
  const cookies: string[] = (res.headers['set-cookie'] as string[]) ?? [];
  const cookie = cookies.find((c: string) => c.startsWith('access_token='));
  return cookie?.split(';')[0]?.split('=')[1] ?? '';
}

async function registerUser(
  app: INestApplication,
  overrides: Partial<{ email: string; firstName: string }> = {},
): Promise<{ token: string; userId: string; email: string }> {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const email = overrides.email ?? `profiles-e2e-${ts}@example.com`;
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      firstName: overrides.firstName ?? 'Profile',
      lastName: 'Tester',
      name: `${overrides.firstName ?? 'Profile'} Tester`,
      email,
      password: 'SecurePass123!',
      acceptTerms: true,
      role: 'USER',
    })
    .expect(201);
  return { token: extractToken(res), userId: res.body.user.id, email };
}

describe('Profiles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let alice: { token: string; userId: string; email: string };
  let bob: { token: string; userId: string; email: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(UserAwareThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    alice = await registerUser(app, { firstName: 'Alice' });
    bob = await registerUser(app, { firstName: 'Bob' });

    // Mark both users as email-verified so JwtAuthGuard lets them through
    await prisma.user.updateMany({
      where: { id: { in: [alice.userId, bob.userId] } },
      data: { isEmailVerified: true },
    });

    // Ensure both users have BtoC and BtoB profiles (created by auth service on register if applicable,
    // otherwise seed them directly via Prisma)
    await prisma.btoCProfile.upsert({
      where: { userId: alice.userId },
      create: { userId: alice.userId },
      update: {},
    });
    await prisma.btoBProfile.upsert({
      where: { userId: alice.userId },
      create: { userId: alice.userId, companyName: 'Alice Corp' },
      update: {},
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [alice.email, bob.email] } },
    });
    if (app) await app.close();
  });

  // ── 1. GET /profiles/:userId ───────────────────────────────────────────────

  describe('1 — GET /profiles/:userId', () => {
    it('returns a public profile without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/profiles/${alice.userId}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', alice.userId);
      expect(res.body).toHaveProperty('name');
      // email and phone are stripped from public responses (PII protection)
      expect(res.body).not.toHaveProperty('email');
    });

    it('returns a profile with authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/profiles/${alice.userId}`)
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', alice.userId);
    });

    it('returns empty body / 200 for a non-existent user id', async () => {
      // findByUserId returns null for unknown ids — NestJS serialises null as empty body
      const res = await request(app.getHttpServer())
        .get('/api/v1/profiles/nonexistent-id-000')
        .expect(200);

      // null serialised by NestJS → supertest parses empty body as {}
      expect(res.body == null || Object.keys(res.body).length === 0).toBe(true);
    });

    it('hides a private profile from unrelated users → 404', async () => {
      // Make alice's profile private
      await prisma.user.update({
        where: { id: alice.userId },
        data: { visibility: false },
      });

      await request(app.getHttpServer())
        .get(`/api/v1/profiles/${alice.userId}`)
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(404);

      // Restore visibility for subsequent tests
      await prisma.user.update({
        where: { id: alice.userId },
        data: { visibility: true },
      });
    });

    it('owner can still read their own private profile → 200', async () => {
      await prisma.user.update({
        where: { id: alice.userId },
        data: { visibility: false },
      });

      await request(app.getHttpServer())
        .get(`/api/v1/profiles/${alice.userId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      await prisma.user.update({
        where: { id: alice.userId },
        data: { visibility: true },
      });
    });
  });

  // ── 2. GET /profiles/lists/talents ────────────────────────────────────────

  describe('2 — GET /profiles/lists/talents', () => {
    it('returns an array of BtoC profiles without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profiles/lists/talents')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('respects the take query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profiles/lists/talents?take=1')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(1);
    });
  });

  // ── 3. GET /profiles/lists/companies ──────────────────────────────────────

  describe('3 — GET /profiles/lists/companies', () => {
    it('returns an array of BtoB profiles without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profiles/lists/companies')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── 4. GET /profiles/lists/members ────────────────────────────────────────

  describe('4 — GET /profiles/lists/members', () => {
    it('returns an array of visible members without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profiles/lists/members')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── 5. PUT /profiles/bto-c/:userId ────────────────────────────────────────

  describe('5 — PUT /profiles/bto-c/:userId', () => {
    it('401 without token', () =>
      request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-c/${alice.userId}`)
        .send({ description: 'No auth' })
        .expect(401));

    it("403 when updating another user's profile", () =>
      request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-c/${alice.userId}`)
        .set('Authorization', `Bearer ${bob.token}`)
        .send({ description: 'Bob pretending to be Alice' })
        .expect(403));

    it('updates own BtoC profile → 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-c/${alice.userId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          description: 'Updated bio from E2E test',
          tags: ['nodejs', 'typescript'],
          lookingForOpportunities: true,
        })
        .expect(200);

      expect(res.body).toHaveProperty('userId', alice.userId);
      expect(res.body.description).toBe('Updated bio from E2E test');
      expect(res.body.tags).toContain('nodejs');
    });
  });

  // ── 6. PUT /profiles/bto-b/:userId ────────────────────────────────────────

  describe('6 — PUT /profiles/bto-b/:userId', () => {
    it('401 without token', () =>
      request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-b/${alice.userId}`)
        .send({ companyName: 'Hack Corp' })
        .expect(401));

    it("403 when updating another user's BtoB profile", () =>
      request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-b/${alice.userId}`)
        .set('Authorization', `Bearer ${bob.token}`)
        .send({ companyName: 'Hack Corp' })
        .expect(403));

    it('updates own BtoB profile → 200', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/profiles/bto-b/${alice.userId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          companyName: 'Alice Corp E2E',
          punchline: 'Building the future',
          industries: ['tech', 'fintech'],
        })
        .expect(200);

      expect(res.body).toHaveProperty('userId', alice.userId);
      expect(res.body.companyName).toBe('Alice Corp E2E');
    });
  });
});
