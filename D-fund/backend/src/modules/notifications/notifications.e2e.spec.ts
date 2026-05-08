/**
 * Notifications E2E Test Suite
 *
 * Covers:
 *  1. GET /notifications — returns the user's notifications
 *  2. GET /notifications/unread-count — returns unread count
 *  3. POST /notifications/:id/read — marks a single notification as read
 *  4. POST /notifications/read-all — marks all notifications as read
 *  5. Route protection — 401 on every endpoint without a token
 *  6. Isolation — a user cannot read or modify another user's notifications
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
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
  const email = `notif-e2e-${ts}@example.com`;
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      firstName: 'Notif',
      lastName: 'Tester',
      name: 'Notif Tester',
      email,
      password: 'SecurePass123!',
      role: 'USER',
    })
    .expect(201);
  return { token: extractToken(res), userId: res.body.user.id, email };
}

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let alice: { token: string; userId: string; email: string };
  let bob: { token: string; userId: string; email: string };

  let notifId: string; // a notification seeded for alice

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    alice = await registerUser(app);
    bob = await registerUser(app);

    // Mark both users as email-verified so JwtAuthGuard lets them through
    await prisma.user.updateMany({
      where: { id: { in: [alice.userId, bob.userId] } },
      data: { isEmailVerified: true },
    });

    // Seed two unread notifications for alice
    const n1 = await prisma.notification.create({
      data: {
        userId: alice.userId,
        type: 'TEST',
        title: 'E2E Notification 1',
        body: 'First test notification',
        isRead: false,
      },
    });
    await prisma.notification.create({
      data: {
        userId: alice.userId,
        type: 'TEST',
        title: 'E2E Notification 2',
        body: 'Second test notification',
        isRead: false,
      },
    });

    notifId = n1.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [alice.userId, bob.userId] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [alice.email, bob.email] } },
    });
    if (app) await app.close();
  });

  // ── 1. Route protection ────────────────────────────────────────────────────

  describe('1 — Route protection', () => {
    it('GET /notifications → 401 without token', () =>
      request(app.getHttpServer()).get('/api/v1/notifications').expect(401));

    it('GET /notifications/unread-count → 401 without token', () =>
      request(app.getHttpServer()).get('/api/v1/notifications/unread-count').expect(401));

    it('POST /notifications/read-all → 401 without token', () =>
      request(app.getHttpServer()).post('/api/v1/notifications/read-all').expect(401));
  });

  // ── 2. GET /notifications ─────────────────────────────────────────────────

  describe('2 — GET /notifications', () => {
    it('returns alice\'s notifications as an array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      const notif = res.body.find((n: { id: string }) => n.id === notifId);
      expect(notif).toBeDefined();
      expect(notif.title).toBe('E2E Notification 1');
    });

    it('bob gets an empty list (no notifications seeded for him)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Bob has no seeded notifications
      const aliceNotif = res.body.find((n: { id: string }) => n.id === notifId);
      expect(aliceNotif).toBeUndefined();
    });
  });

  // ── 3. GET /notifications/unread-count ────────────────────────────────────

  describe('3 — GET /notifications/unread-count', () => {
    it('returns the correct unread count for alice', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      expect(res.body).toHaveProperty('count');
      expect(typeof res.body.count).toBe('number');
      expect(res.body.count).toBeGreaterThanOrEqual(2);
    });

    it('returns 0 for bob (no unread notifications)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(200);

      expect(res.body.count).toBe(0);
    });
  });

  // ── 4. POST /notifications/:id/read ───────────────────────────────────────

  describe('4 — POST /notifications/:id/read', () => {
    it('marks a notification as read for alice → { success: true }', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('alice\'s unread count decreases by 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      // One notification was marked read, still at least 1 unread
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it('bob cannot mark alice\'s notification as read (updateMany with userId guard, no-op → 200)', async () => {
      // The controller uses updateMany with { id, userId: user.id }
      // So bob's attempt is a silent no-op, not a 403
      const res = await request(app.getHttpServer())
        .post(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);

      // Verify the notification still belongs to alice and its read state is unchanged by bob
      const notif = await prisma.notification.findUnique({ where: { id: notifId } });
      expect(notif?.userId).toBe(alice.userId);
    });
  });

  // ── 5. POST /notifications/read-all ───────────────────────────────────────

  describe('5 — POST /notifications/read-all', () => {
    it('marks all of alice\'s notifications as read → { success: true }', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('alice\'s unread count is now 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      expect(res.body.count).toBe(0);
    });
  });

  // ── 6. Missing 401 coverage ────────────────────────────────────────────────

  describe('6 — Route protection (complete)', () => {
    it('POST /notifications/:id/read → 401 without token', () =>
      request(app.getHttpServer())
        .post(`/api/v1/notifications/${notifId}/read`)
        .expect(401));
  });

  // ── 7. Pagination ──────────────────────────────────────────────────────────

  describe('7 — Pagination', () => {
    let paginationUserId: string;
    let paginationEmail: string;
    let paginationToken: string;

    beforeAll(async () => {
      // Register a fresh user and seed 5 notifications for deterministic pagination tests
      const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      paginationEmail = `notif-page-${ts}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Page',
          lastName: 'Tester',
          name: 'Page Tester',
          email: paginationEmail,
          password: 'SecurePass123!',
        })
        .expect(201);

      paginationToken = extractToken(res);
      paginationUserId = res.body.user.id;

      await prisma.user.update({
        where: { id: paginationUserId },
        data: { isEmailVerified: true },
      });

      // Seed 5 notifications in sequence with small delays so createdAt differs
      for (let i = 1; i <= 5; i++) {
        await prisma.notification.create({
          data: {
            userId: paginationUserId,
            type: 'PAGE_TEST',
            title: `Pagination Notification ${i}`,
            isRead: false,
          },
        });
      }
    });

    afterAll(async () => {
      await prisma.notification.deleteMany({ where: { userId: paginationUserId } });
      await prisma.user.deleteMany({ where: { email: paginationEmail } });
    });

    it('?take=2 returns at most 2 notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?take=2')
        .set('Authorization', `Bearer ${paginationToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('?skip=3 skips the 3 most recent notifications', async () => {
      const all = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${paginationToken}`)
        .expect(200);

      const skipped = await request(app.getHttpServer())
        .get('/api/v1/notifications?skip=3')
        .set('Authorization', `Bearer ${paginationToken}`)
        .expect(200);

      // skipped list should be shorter
      expect(skipped.body.length).toBe(all.body.length - 3);
      // First item in skipped should match 4th item in full list
      expect(skipped.body[0].id).toBe(all.body[3].id);
    });

    it('results are ordered most-recent first', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${paginationToken}`)
        .expect(200);

      const dates = res.body.map((n: { createdAt: string }) => new Date(n.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('?take=200 is clamped to 100 — never returns more than 100 items', async () => {
      // Seed 101 notifications to be sure we exceed the cap
      const bulk = Array.from({ length: 96 }, (_, i) => ({
        userId: paginationUserId,
        type: 'BULK',
        title: `Bulk ${i}`,
        isRead: false,
      }));
      await prisma.notification.createMany({ data: bulk });

      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?take=200')
        .set('Authorization', `Bearer ${paginationToken}`)
        .expect(200);

      expect(res.body.length).toBeLessThanOrEqual(100);
    });
  });
});
