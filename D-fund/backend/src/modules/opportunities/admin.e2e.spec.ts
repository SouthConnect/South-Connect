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

async function pollForNotification(
  check: () => Promise<any>,
  maxAttempts = 15,
  delayMs = 150,
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await check();
    if (result) return result;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

/**
 * Admin routes E2E suite.
 *
 * Covers:
 *  1. RolesGuard enforcement — 401 without token, 403 for non-admin
 *  2. GET /opportunities/admin/all — admin reads all statuses
 *  3. PUT /opportunities/admin/:id/status — admin approves / rejects
 *  4. Notification side-effect — in-app notification created on ACTIVE
 *  5. 404 — acting on a non-existent opportunity
 */
describe('Admin — opportunity moderation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminCredentials = {
    email: `admin.test.${Date.now()}@example.com`,
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
    acceptTerms: true,
  };

  const ownerCredentials = {
    email: `owner.test.${Date.now()}@example.com`,
    password: 'OwnerPassword123!',
    firstName: 'Owner',
    lastName: 'User',
    acceptTerms: true,
  };

  let adminToken: string;
  let adminUserId: string;
  let ownerToken: string;
  let ownerUserId: string;
  let opportunityId: string;

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

    // Register admin and owner
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...adminCredentials, name: 'Admin User' });
    adminToken = extractToken(adminRes);
    adminUserId = adminRes.body.user.id;

    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...ownerCredentials, name: 'Owner User' });
    ownerToken = extractToken(ownerRes);
    ownerUserId = ownerRes.body.user.id;

    // Verify emails and elevate admin to ADMIN role directly in DB
    await prisma.user.updateMany({
      where: { id: { in: [adminUserId, ownerUserId] } },
      data: { isEmailVerified: true },
    });
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'ADMIN' },
    });

    // Re-login so the JWT reflects the ADMIN role
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminCredentials.email, password: adminCredentials.password });
    adminToken = extractToken(loginRes);

    // Owner creates a PENDING opportunity
    const oppRes = await request(app.getHttpServer())
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Admin Test Opportunity', type: 'JOB_OPPORTUNITY' });
    opportunityId = oppRes.body.id;

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { status: 'PENDING' },
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: ownerUserId } });
    if (opportunityId) {
      await prisma.opportunity.deleteMany({ where: { id: opportunityId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [adminCredentials.email, ownerCredentials.email] } },
    });
    if (app) await app.close();
  });

  // ── 1. RolesGuard enforcement ──────────────────────────────────────────────

  describe('1 — RolesGuard enforcement', () => {
    it('GET /admin/all → 401 without token', () =>
      request(app.getHttpServer()).get('/api/v1/opportunities/admin/all').expect(401));

    it('PUT /admin/:id/status → 401 without token', () =>
      request(app.getHttpServer())
        .put(`/api/v1/opportunities/admin/${opportunityId}/status`)
        .send({ status: 'ACTIVE' })
        .expect(401));

    it('GET /admin/all → 403 for non-admin authenticated user', () =>
      request(app.getHttpServer())
        .get('/api/v1/opportunities/admin/all')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403));

    it('PUT /admin/:id/status → 403 for non-admin authenticated user', () =>
      request(app.getHttpServer())
        .put(`/api/v1/opportunities/admin/${opportunityId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'ACTIVE' })
        .expect(403));
  });

  // ── 2. GET /admin/all ──────────────────────────────────────────────────────

  describe('2 — GET /opportunities/admin/all', () => {
    it('returns all opportunities for admin (including PENDING)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities/admin/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((o: { id: string }) => o.id === opportunityId);
      expect(found).toBeDefined();
      expect(found.status).toBe('PENDING');
    });

    it('filters by status when ?status=PENDING', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities/admin/all?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const hasNonPending = res.body.some((o: { status: string }) => o.status !== 'PENDING');
      expect(hasNonPending).toBe(false);
    });

    it('includes owner info on each opportunity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities/admin/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const found = res.body.find((o: { id: string }) => o.id === opportunityId);
      expect(found).toHaveProperty('owner');
      expect(found.owner).toHaveProperty('email');
    });
  });

  // ── 3. PUT /admin/:id/status — approve ────────────────────────────────────

  describe('3 — approve (PENDING → ACTIVE)', () => {
    it('rejects an invalid status value', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/opportunities/admin/${opportunityId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('admin approves the opportunity → status becomes ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/opportunities/admin/${opportunityId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(res.body.status).toBe('ACTIVE');
    });

    it('approval creates an in-app notification for the owner', async () => {
      const notif = await pollForNotification(() =>
        prisma.notification.findFirst({
          where: { userId: ownerUserId, type: 'OPPORTUNITY_APPROVED' },
        }),
      );
      expect(notif).not.toBeNull();
      expect(notif?.link).toBe(`/opportunities/${opportunityId}`);
    });
  });

  // ── 4. PUT /admin/:id/status — reject ─────────────────────────────────────

  describe('4 — reject (ACTIVE → ARCHIVED)', () => {
    it('admin archives (rejects) the opportunity → status becomes ARCHIVED', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/opportunities/admin/${opportunityId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ARCHIVED' })
        .expect(200);

      expect(res.body.status).toBe('ARCHIVED');
    });

    it('rejection creates an in-app notification for the owner', async () => {
      const notif = await pollForNotification(() =>
        prisma.notification.findFirst({
          where: { userId: ownerUserId, type: 'OPPORTUNITY_REJECTED' },
        }),
      );
      expect(notif).not.toBeNull();
    });
  });

  // ── 5. 404 on non-existent opportunity ────────────────────────────────────

  describe('5 — 404 on non-existent opportunity', () => {
    it('returns 404 when updating status of a non-existent opportunity', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/opportunities/admin/cm00000000000000000000000/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' })
        .expect(404);
    });
  });
});
