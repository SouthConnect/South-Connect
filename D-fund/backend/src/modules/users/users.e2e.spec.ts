/**
 * Users E2E Test Suite
 *
 * Priorité RGPD — ce module n'avait aucun test avant cette suite, alors qu'il
 * porte l'anonymisation (art. 17) et l'export (art. 20) des données personnelles.
 *
 * Covers:
 *  1. GET /users/:id — self or admin only
 *  2. PUT /users/me — update own profile
 *  3. POST /users/me/export — RGPD art. 20, data portability
 *  4. DELETE /users/me — RGPD art. 17, self-service anonymisation
 *  5. Admin routes — list, role change, ban/unban, admin-initiated deletion
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
  prisma: PrismaService,
  overrides: Partial<{ email: string; firstName: string; password: string }> = {},
): Promise<{ token: string; userId: string; email: string; password: string }> {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const email = overrides.email ?? `users-e2e-${ts}@example.com`;
  const password = overrides.password ?? 'SecurePass123!';
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      firstName: overrides.firstName ?? 'Test',
      lastName: 'User',
      name: `${overrides.firstName ?? 'Test'} User`,
      email,
      password,
      role: 'USER',
      acceptTerms: true,
    })
    .expect(201);
  const userId = res.body.user.id;
  await prisma.user.update({ where: { id: userId }, data: { isEmailVerified: true } });
  // Re-login so the JWT reflects isEmailVerified (JwtAuthGuard checks the token claim)
  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return { token: extractToken(loginRes), userId, email, password };
}

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let alice: { token: string; userId: string; email: string; password: string };
  let bob: { token: string; userId: string; email: string; password: string };
  const cleanupEmails: string[] = [];

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

    alice = await registerUser(app, prisma, { firstName: 'Alice' });
    bob = await registerUser(app, prisma, { firstName: 'Bob' });
    cleanupEmails.push(alice.email, bob.email);
  });

  afterAll(async () => {
    // Anonymised accounts have their email rewritten to deleted_<id>@deleted.invalid,
    // so cleanup by id covers both anonymised and untouched test users.
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: { in: cleanupEmails } }, { id: { in: [alice.userId, bob.userId] } }],
      },
    });
    if (app) await app.close();
  });

  // ── 1. GET /users/:id ───────────────────────────────────────────────────────

  describe('1 — GET /users/:id', () => {
    it('401 without token', () =>
      request(app.getHttpServer()).get(`/api/v1/users/${alice.userId}`).expect(401));

    it('200 for own profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${alice.userId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);
      expect(res.body).toHaveProperty('id', alice.userId);
    });

    it("403 when reading another user's profile via this endpoint", () =>
      request(app.getHttpServer())
        .get(`/api/v1/users/${alice.userId}`)
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(403));
  });

  // ── 2. PUT /users/me ────────────────────────────────────────────────────────

  describe('2 — PUT /users/me', () => {
    it('401 without token', () =>
      request(app.getHttpServer()).put('/api/v1/users/me').send({ bio: 'Hi' }).expect(401));

    it('updates own profile and recomputes the composite name', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ firstName: 'Alicia', lastName: 'Wonderland', bio: 'Updated via e2e' })
        .expect(200);

      expect(res.body.firstName).toBe('Alicia');
      expect(res.body.name).toBe('Alicia Wonderland');
      expect(res.body.bio).toBe('Updated via e2e');
    });

    it('rejects fields not in the DTO whitelist (e.g. role escalation attempt)', () =>
      request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ role: 'ADMIN' })
        .expect(400));
  });

  // ── 3. POST /users/me/export ────────────────────────────────────────────────

  describe('3 — POST /users/me/export (RGPD art. 20)', () => {
    it('401 without token', () =>
      request(app.getHttpServer()).post('/api/v1/users/me/export').expect(401));

    it("exports the caller's own data, never another user's", async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/me/export')
        .set('Authorization', `Bearer ${bob.token}`)
        // NestJS defaults POST routes to 201, and this handler bypasses the
        // normal @Res({ passthrough: true }) flow — the platform-set 201 leaks
        // through even though it manually calls res.json().
        .expect(201);

      expect(res.body).toHaveProperty('exportedAt');
      expect(res.body.data).toHaveProperty('id', bob.userId);
      expect(res.body.data).toHaveProperty('email', bob.email);
      expect(res.body.data.id).not.toBe(alice.userId);
    });

    it('never includes the password hash or internal tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/me/export')
        .set('Authorization', `Bearer ${bob.token}`)
        // NestJS defaults POST routes to 201, and this handler bypasses the
        // normal @Res({ passthrough: true }) flow — the platform-set 201 leaks
        // through even though it manually calls res.json().
        .expect(201);

      expect(res.body.data).not.toHaveProperty('password');
      expect(res.body.data).not.toHaveProperty('passwordResetToken');
      expect(res.body.data).not.toHaveProperty('emailVerificationToken');
    });

    it('sets a downloadable attachment content-disposition header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/me/export')
        .set('Authorization', `Bearer ${bob.token}`)
        // NestJS defaults POST routes to 201, and this handler bypasses the
        // normal @Res({ passthrough: true }) flow — the platform-set 201 leaks
        // through even though it manually calls res.json().
        .expect(201);

      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="dfund-export-/);
    });
  });

  // ── 4. DELETE /users/me (RGPD art. 17) ──────────────────────────────────────

  describe('4 — DELETE /users/me (RGPD art. 17)', () => {
    it('401 without token', () =>
      request(app.getHttpServer()).delete('/api/v1/users/me').expect(401));

    it('self-deletion anonymises every PII field and preserves referential integrity', async () => {
      const carol = await registerUser(app, prisma, { firstName: 'Carol' });
      cleanupEmails.push(carol.email);

      // Carol creates an opportunity — the record must survive anonymisation
      // (comment in users.service.ts: "conservés avec un userId anonymisé").
      const oppRes = await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${carol.token}`)
        .send({ name: 'Carol Opportunity — pre-deletion', type: 'JOB_OPPORTUNITY' })
        .expect(201);
      const opportunityId = oppRes.body.id;

      const res = await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${carol.token}`)
        .expect(200);

      expect(res.body).toEqual({ success: true });

      // Auth cookies must be cleared immediately on self-deletion
      const setCookie: string[] = (res.headers['set-cookie'] as unknown as string[]) ?? [];
      expect(setCookie.some((c) => c.startsWith('access_token=;'))).toBe(true);
      expect(setCookie.some((c) => c.startsWith('refresh_token=;'))).toBe(true);

      // Every PII field must be scrubbed — checked directly against the DB,
      // not just the API response, since this is the actual RGPD obligation.
      const dbUser = await prisma.user.findUnique({ where: { id: carol.userId } });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.email).toBe(`deleted_${carol.userId}@deleted.invalid`);
      expect(dbUser!.name).toBe('Compte supprimé');
      expect(dbUser!.firstName).toBe('');
      expect(dbUser!.lastName).toBe('');
      expect(dbUser!.bio).toBeNull();
      expect(dbUser!.phone).toBeNull();
      expect(dbUser!.profilePic).toBeNull();
      expect(dbUser!.city).toBeNull();
      expect(dbUser!.country).toBeNull();
      expect(dbUser!.linkedinUrl).toBeNull();
      expect(dbUser!.website).toBeNull();
      expect(dbUser!.googleId).toBeNull();
      expect(dbUser!.password).toBeNull();
      expect(dbUser!.deletedAt).not.toBeNull();

      // Referential integrity: the opportunity Carol created must still exist,
      // still owned by her (now-anonymised) user id — not cascade-deleted.
      const survivingOpp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
      expect(survivingOpp).not.toBeNull();
      expect(survivingOpp!.ownerId).toBe(carol.userId);

      // A deleted account can no longer authenticate with its original credentials.
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: carol.email, password: carol.password })
        .expect(401);
    });

    it("a deleted account's own token is rejected on the next request (live re-check, not just cookie clearing)", async () => {
      const dave = await registerUser(app, prisma, { firstName: 'Dave' });
      cleanupEmails.push(dave.email);

      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${dave.token}`)
        .expect(200);

      // JwtAuthGuard re-validates against the DB on every request (AuthService.validateUser
      // checks deletedAt live), not just at login — so the same still-unexpired token is
      // now rejected. Stronger than relying on cookie-clearing alone.
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${dave.token}`)
        .expect(401);
    });
  });

  // ── 5. Admin routes ──────────────────────────────────────────────────────────

  describe('5 — Admin routes', () => {
    let admin: { token: string; userId: string; email: string; password: string };
    let target: { token: string; userId: string; email: string; password: string };

    beforeAll(async () => {
      admin = await registerUser(app, prisma, { firstName: 'AdminUser' });
      target = await registerUser(app, prisma, { firstName: 'Target' });
      cleanupEmails.push(admin.email, target.email);

      await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: admin.email, password: admin.password })
        .expect(200);
      admin.token = extractToken(loginRes);
    });

    describe('GET /users/admin/list', () => {
      it('401 without token', () =>
        request(app.getHttpServer()).get('/api/v1/users/admin/list').expect(401));

      it('403 for a non-admin user', () =>
        request(app.getHttpServer())
          .get('/api/v1/users/admin/list')
          .set('Authorization', `Bearer ${target.token}`)
          .expect(403));

      it('200 for an admin, with pagination shape', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/users/admin/list?take=5')
          .set('Authorization', `Bearer ${admin.token}`)
          .expect(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeLessThanOrEqual(5);
      });
    });

    describe('PUT /users/admin/:id/ban and /unban', () => {
      it('403 for a non-admin user', () =>
        request(app.getHttpServer())
          .put(`/api/v1/users/admin/${target.userId}/ban`)
          .set('Authorization', `Bearer ${target.token}`)
          .expect(403));

      it('a banned user is flagged in DB and can no longer log in', async () => {
        await request(app.getHttpServer())
          .put(`/api/v1/users/admin/${target.userId}/ban`)
          .set('Authorization', `Bearer ${admin.token}`)
          .expect(200);

        const dbUser = await prisma.user.findUnique({ where: { id: target.userId } });
        expect(dbUser!.isBanned).toBe(true);

        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: target.email, password: target.password })
          .expect(401);
      });

      it('unban restores login access', async () => {
        await request(app.getHttpServer())
          .put(`/api/v1/users/admin/${target.userId}/unban`)
          .set('Authorization', `Bearer ${admin.token}`)
          .expect(200);

        const dbUser = await prisma.user.findUnique({ where: { id: target.userId } });
        expect(dbUser!.isBanned).toBe(false);

        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: target.email, password: target.password })
          .expect(200);
      });
    });

    describe('PUT /users/admin/:id/role', () => {
      it('403 for a non-admin user', () =>
        request(app.getHttpServer())
          .put(`/api/v1/users/admin/${target.userId}/role`)
          .set('Authorization', `Bearer ${target.token}`)
          .send({ role: 'ADMIN' })
          .expect(403));

      it('promotes a user and records an audit log entry', async () => {
        await request(app.getHttpServer())
          .put(`/api/v1/users/admin/${target.userId}/role`)
          .set('Authorization', `Bearer ${admin.token}`)
          .send({ role: 'ADMIN' })
          .expect(200);

        const dbUser = await prisma.user.findUnique({ where: { id: target.userId } });
        expect(dbUser!.role).toBe('ADMIN');

        const auditEntry = await prisma.adminAuditLog.findFirst({
          where: { adminId: admin.userId, targetId: target.userId, action: 'CHANGE_ROLE' },
          orderBy: { createdAt: 'desc' },
        });
        expect(auditEntry).not.toBeNull();

        // Revert so it doesn't affect other tests relying on target being a plain USER
        await prisma.user.update({ where: { id: target.userId }, data: { role: 'USER' } });
      });
    });

    describe('DELETE /users/admin/:id', () => {
      it('403 for a non-admin user', () =>
        request(app.getHttpServer())
          .delete(`/api/v1/users/admin/${target.userId}`)
          .set('Authorization', `Bearer ${target.token}`)
          .expect(403));

      it('admin-initiated deletion applies the same anonymisation as self-service', async () => {
        const erin = await registerUser(app, prisma, { firstName: 'Erin' });
        cleanupEmails.push(erin.email);

        await request(app.getHttpServer())
          .delete(`/api/v1/users/admin/${erin.userId}`)
          .set('Authorization', `Bearer ${admin.token}`)
          .expect(200);

        const dbUser = await prisma.user.findUnique({ where: { id: erin.userId } });
        expect(dbUser!.email).toBe(`deleted_${erin.userId}@deleted.invalid`);
        expect(dbUser!.deletedAt).not.toBeNull();
        expect(dbUser!.password).toBeNull();

        const auditEntry = await prisma.adminAuditLog.findFirst({
          where: { adminId: admin.userId, targetId: erin.userId, action: 'DELETE_USER' },
        });
        expect(auditEntry).not.toBeNull();
      });

      it('404 when the target user does not exist', () =>
        request(app.getHttpServer())
          .delete('/api/v1/users/admin/nonexistent-id-000')
          .set('Authorization', `Bearer ${admin.token}`)
          .expect(404));

      it('anonymising an already-anonymised account is safe to re-apply (service-level idempotency)', async () => {
        // The admin's own token stays valid across both calls (unlike the target's),
        // so this exercises anonymizeUser() being re-applied to an already-deleted
        // user without throwing or corrupting state.
        const frank = await registerUser(app, prisma, { firstName: 'Frank' });
        cleanupEmails.push(frank.email);

        await request(app.getHttpServer())
          .delete(`/api/v1/users/admin/${frank.userId}`)
          .set('Authorization', `Bearer ${admin.token}`)
          .expect(200);

        await request(app.getHttpServer())
          .delete(`/api/v1/users/admin/${frank.userId}`)
          .set('Authorization', `Bearer ${admin.token}`)
          .expect(200);

        const dbUser = await prisma.user.findUnique({ where: { id: frank.userId } });
        expect(dbUser!.email).toBe(`deleted_${frank.userId}@deleted.invalid`);
      });
    });
  });
});
