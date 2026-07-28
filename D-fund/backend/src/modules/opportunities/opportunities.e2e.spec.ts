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

describe('Opportunities module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const ownerCredentials = {
    email: `opp.owner.${Date.now()}@example.com`,
    password: 'OwnerPassword123!',
    firstName: 'Opp',
    lastName: 'Owner',
  };

  const otherCredentials = {
    email: `opp.other.${Date.now()}@example.com`,
    password: 'OtherPassword123!',
    firstName: 'Other',
    lastName: 'User',
  };

  let ownerToken: string;
  let ownerUserId: string;
  let otherToken: string;
  let opportunityId: string | null;

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

    // Register owner — tokens are now in HttpOnly cookies, not body
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...ownerCredentials, name: 'Opp Owner' });
    ownerToken = extractToken(ownerRes);
    ownerUserId = ownerRes.body.user.id;

    // Register other user
    const otherRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...otherCredentials, name: 'Other User' });
    otherToken = extractToken(otherRes);
    const otherUserId = otherRes.body.user.id;

    // Mark all users as email-verified so JwtAuthGuard lets them through
    await prisma.user.updateMany({
      where: { id: { in: [ownerUserId, otherUserId] } },
      data: { isEmailVerified: true },
    });
  });

  afterAll(async () => {
    if (opportunityId) {
      await prisma.opportunity.deleteMany({ where: { id: opportunityId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [ownerCredentials.email, otherCredentials.email] } },
    });
    if (app) await app.close();
  });

  // ── 1. Create ────────────────────────────────────────────────────────────────

  describe('1 — create', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .send({ name: 'Test', type: 'JOB_OPPORTUNITY' })
        .expect(401);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test' }) // missing type
        .expect(400);
    });

    it('should default to ACTIVE status when none is specified (direct-publish model)', async () => {
      // Product decision (7628c89): opportunities publish immediately by default,
      // like LinkedIn — no admin review step. Verified here, then reset to DRAFT
      // below so the rest of this suite can exercise draft-visibility rules.
      const res = await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Auto-published Offer',
          type: 'JOB_OPPORTUNITY',
          description: 'Default status check',
        })
        .expect(201);

      expect(res.body.status).toBe('ACTIVE');

      await prisma.opportunity.delete({ where: { id: res.body.id } });
    });

    it('should create an opportunity in DRAFT status when explicitly requested', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'My Job Offer',
          type: 'JOB_OPPORTUNITY',
          description: 'Looking for devs',
          status: 'DRAFT',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('My Job Offer');
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.ownerId).toBe(ownerUserId);

      opportunityId = res.body.id;
    });
  });

  // ── 2. Public listing ────────────────────────────────────────────────────────

  describe('2 — public listing', () => {
    it('should return a paginated response without authentication', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/opportunities').expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      // Public feed intentionally omits `total` (skips an expensive COUNT query) —
      // only owner/admin views (filtered by ownerId) return it. See findAll().
      expect(res.body).toHaveProperty('hasMore');
    });

    it('should not include DRAFT opportunities in the public feed', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/opportunities').expect(200);

      const found = res.body.data.find((o: { id: string }) => o.id === opportunityId);
      expect(found).toBeUndefined();
    });

    it('should NOT expose DRAFT opportunities even when ?status=DRAFT is passed', async () => {
      // Regression test: the public feed must ignore explicit ?status=DRAFT requests
      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities?status=DRAFT')
        .expect(200);

      const hasDraft = res.body.data.some((o: { status: string }) => o.status === 'DRAFT');
      expect(hasDraft).toBe(false);
    });

    it('should accept pagination parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities?take=5&skip=0')
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject invalid pagination values', async () => {
      await request(app.getHttpServer()).get('/api/v1/opportunities?take=999').expect(400);
    });

    it('should filter results by type', async () => {
      // Publish a JOB_OPPORTUNITY to ensure there is something to search
      const activeOpp = await prisma.opportunity.create({
        data: {
          ownerId: ownerUserId,
          name: 'Active Job For Filter Test',
          type: 'JOB_OPPORTUNITY',
          status: 'ACTIVE',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/opportunities?type=JOB_OPPORTUNITY')
        .expect(200);

      const hasOtherType = res.body.data.some(
        (o: { type: string }) => o.type !== 'JOB_OPPORTUNITY',
      );
      expect(hasOtherType).toBe(false);

      await prisma.opportunity.delete({ where: { id: activeOpp.id } });
    });

    it('should return matching results for a search query', async () => {
      const uniqueName = `UniqueSearchTerm_${Date.now()}`;
      const searchOpp = await prisma.opportunity.create({
        data: {
          ownerId: ownerUserId,
          name: uniqueName,
          type: 'JOB_OPPORTUNITY',
          status: 'ACTIVE',
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities?search=${uniqueName}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toBe(uniqueName);

      await prisma.opportunity.delete({ where: { id: searchOpp.id } });
    });
  });

  // ── 3. Find by owner ─────────────────────────────────────────────────────────

  describe('3 — find by owner', () => {
    it("should return the owner's opportunities including drafts when authenticated as owner", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/user/${ownerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((o: { id: string }) => o.id === opportunityId);
      expect(found).toBeDefined();
      expect(found.status).toBe('DRAFT');
    });

    it('should hide draft opportunities from other users', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/user/${ownerUserId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const draft = res.body.data.find(
        (o: { id: string; status: string }) => o.id === opportunityId && o.status === 'DRAFT',
      );
      expect(draft).toBeUndefined();
    });

    it('should NOT expose drafts when non-owner passes ?status=DRAFT explicitly', async () => {
      // Regression test: same DRAFT leak bug that existed on the public feed
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/user/${ownerUserId}?status=DRAFT`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      const hasDraft = res.body.data.some((o: { status: string }) => o.status === 'DRAFT');
      expect(hasDraft).toBe(false);
    });

    it('should allow the owner to filter by ?status=DRAFT to see only their drafts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/user/${ownerUserId}?status=DRAFT`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Every result in the response must be a DRAFT
      const allAreDraft = res.body.data.every((o: { status: string }) => o.status === 'DRAFT');
      expect(allAreDraft).toBe(true);
    });
  });

  // ── 4. Find one ──────────────────────────────────────────────────────────────

  describe('4 — find one', () => {
    it('should return a 404 for a non-existent opportunity', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/opportunities/cm00000000000000000000000')
        .expect(404);
    });

    it('should return 404 when a non-owner accesses a DRAFT opportunity directly', async () => {
      // opportunityId is still DRAFT at this point
      await request(app.getHttpServer())
        .get(`/api/v1/opportunities/${opportunityId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should return 404 for unauthenticated access to a DRAFT opportunity', async () => {
      await request(app.getHttpServer()).get(`/api/v1/opportunities/${opportunityId}`).expect(404);
    });

    it('should allow the owner to access their own DRAFT opportunity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/${opportunityId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.id).toBe(opportunityId);
      expect(res.body.status).toBe('DRAFT');
    });

    it('should return the opportunity when found and ACTIVE', async () => {
      // Make the opportunity active so it is publicly accessible
      await prisma.opportunity.update({
        where: { id: opportunityId! },
        data: { status: 'ACTIVE' },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/opportunities/${opportunityId}`)
        .expect(200);

      expect(res.body.id).toBe(opportunityId);
      expect(res.body.name).toBe('My Job Offer');
      expect(res.body).toHaveProperty('isLiked');
      expect(res.body).toHaveProperty('isSaved');
    });
  });

  // ── 5. Update ────────────────────────────────────────────────────────────────

  describe('5 — update', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/opportunities/${opportunityId}`)
        .send({ name: 'Updated' })
        .expect(401);
    });

    it('should reject updates from non-owners', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/opportunities/${opportunityId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hijacked' })
        .expect(403);
    });

    it('should allow the owner to update their opportunity', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/opportunities/${opportunityId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Job Offer', description: 'Updated description' })
        .expect(200);

      expect(res.body.name).toBe('Updated Job Offer');
    });

    it('should return 404 when updating a non-existent opportunity', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/opportunities/cm00000000000000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Ghost update' })
        .expect(404);
    });
  });

  // ── 6. Admin routes ──────────────────────────────────────────────────────────

  describe('6 — admin routes', () => {
    it('should reject GET /admin/all for non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/opportunities/admin/all')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('should reject PUT /admin/:id/status for non-admin users', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/opportunities/admin/${opportunityId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'ACTIVE' })
        .expect(403);
    });

    it('should reject unauthenticated admin routes', async () => {
      await request(app.getHttpServer()).get('/api/v1/opportunities/admin/all').expect(401);
    });
  });

  // ── 7. Delete ────────────────────────────────────────────────────────────────

  describe('7 — delete', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/opportunities/${opportunityId}`)
        .expect(401);
    });

    it('should reject deletion by non-owners', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/opportunities/${opportunityId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('should return 404 when deleting a non-existent opportunity', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/opportunities/cm00000000000000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('should allow the owner to delete their opportunity', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/opportunities/${opportunityId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      opportunityId = null; // prevent afterAll cleanup from running again
    });
  });
});
