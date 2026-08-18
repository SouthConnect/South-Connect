/**
 * Referral E2E Test Suite
 *
 * Covers:
 *  1. GET /referral — returns codes + stats for authenticated user
 *  2. POST /referral — creates a referral code
 *  3. GET /referral/code/:code — resolves a referral code (requires JWT due to controller guard)
 *  4. Route protection — 401 without token
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
): Promise<{ token: string; userId: string; email: string }> {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const email = `referral-e2e-${ts}@example.com`;
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      firstName: 'Referral',
      lastName: 'Tester',
      name: 'Referral Tester',
      email,
      password: 'SecurePass123!',
      acceptTerms: true,
      role: 'USER',
    })
    .expect(201);
  return { token: extractToken(res), userId: res.body.user.id, email };
}

describe('Referral (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: { token: string; userId: string; email: string };
  let createdCode: string;

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
    user = await registerUser(app);

    // Mark user as email-verified so JwtAuthGuard lets them through
    await prisma.user.update({
      where: { id: user.userId },
      data: { isEmailVerified: true },
    });
  });

  afterAll(async () => {
    await prisma.referralCode.deleteMany({ where: { ownerId: user.userId } });
    await prisma.user.deleteMany({ where: { email: user.email } });
    if (app) await app.close();
  });

  // ── 1. Route protection ────────────────────────────────────────────────────

  describe('1 — Route protection', () => {
    it('GET /referral → 401 without token', () =>
      request(app.getHttpServer()).get('/api/v1/referral').expect(401));

    it('POST /referral → 401 without token', () =>
      request(app.getHttpServer()).post('/api/v1/referral').send({}).expect(401));
  });

  // ── 2. GET /referral (empty state) ────────────────────────────────────────

  describe('2 — GET /referral', () => {
    it('returns codes array and stats for a new user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/referral')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body).toHaveProperty('codes');
      expect(Array.isArray(res.body.codes)).toBe(true);
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('totalCodes');
      expect(res.body.stats).toHaveProperty('totalReferrals');
      expect(res.body.stats).toHaveProperty('totalPotentialAmount');
      expect(res.body.stats).toHaveProperty('totalEarned');
    });
  });

  // ── 3. POST /referral ─────────────────────────────────────────────────────

  describe('3 — POST /referral', () => {
    it('creates a referral code with default type NEW_USER', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/referral')
        .set('Authorization', `Bearer ${user.token}`)
        .send({})
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toHaveLength(10); // 5 random bytes → 10-char hex
      expect(res.body.ownerId).toBe(user.userId);
      expect(res.body.type).toBe('NEW_USER');
      expect(res.body.status).toBe('ACTIVE');

      createdCode = res.body.code;
    });

    it('creates a referral code with an explicit type', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/referral')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ type: 'OPPORTUNITY_RELATED' })
        .expect(201);

      expect(res.body.type).toBe('OPPORTUNITY_RELATED');
    });

    it('400 on an invalid enum value for type', () =>
      request(app.getHttpServer())
        .post('/api/v1/referral')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ type: 'INVALID_TYPE' })
        .expect(400));

    it('GET /referral now reflects the new codes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/referral')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.stats.totalCodes).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 4. GET /referral/code/:code ───────────────────────────────────────────

  describe('4 — GET /referral/code/:code', () => {
    it('resolves the code created above', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/referral/code/${createdCode}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.code).toBe(createdCode);
      expect(res.body).toHaveProperty('owner');
      expect(res.body.owner).toHaveProperty('id', user.userId);
    });

    it('404 for a code that does not exist', () =>
      request(app.getHttpServer())
        .get('/api/v1/referral/code/DOESNOTEXIST00')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(404));
  });
});
