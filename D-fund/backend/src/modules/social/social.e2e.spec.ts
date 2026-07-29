import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserAwareThrottlerGuard } from '../../common/guards/user-aware-throttler.guard';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Social module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userACredentials = {
    email: `social.a.${Date.now()}@example.com`,
    password: 'PasswordA123!',
    firstName: 'Social',
    lastName: 'UserA',
  };

  const userBCredentials = {
    email: `social.b.${Date.now()}@example.com`,
    password: 'PasswordB123!',
    firstName: 'Social',
    lastName: 'UserB',
  };

  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let userBId: string;
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

    // Register users — tokens are now in HttpOnly cookies, not body
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...userACredentials, name: 'Social UserA' });
    tokenA = extractToken(resA);
    userAId = resA.body.user.id;

    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...userBCredentials, name: 'Social UserB' });
    tokenB = extractToken(resB);
    userBId = resB.body.user.id;

    // Mark both users as email-verified so JwtAuthGuard lets them through
    await prisma.user.updateMany({
      where: { id: { in: [userAId, userBId] } },
      data: { isEmailVerified: true },
    });

    // Create an ACTIVE opportunity owned by userA
    const oppRes = await request(app.getHttpServer())
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Social Test Opportunity', type: 'JOB_OPPORTUNITY' });
    opportunityId = oppRes.body.id;

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    if (opportunityId) {
      await prisma.opportunity.deleteMany({ where: { id: opportunityId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [userACredentials.email, userBCredentials.email] } },
    });
    if (app) await app.close();
  });

  // ── 1. Follow / Unfollow ─────────────────────────────────────────────────────

  describe('1 — follow / unfollow', () => {
    it('should require authentication to follow', async () => {
      await request(app.getHttpServer()).post(`/api/v1/social/follow/${userAId}`).expect(401);
    });

    it('should allow userB to follow userA', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/social/follow/${userAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });

    it('should return following = true after following', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/social/is-following/${userAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body).toHaveProperty('following', true);
    });

    it("should list userB in userA's followers", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/social/followers/${userAId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((u: { id: string }) => u.id === userBId);
      expect(found).toBeDefined();
    });

    it("should list userA in userB's following list", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/social/following/${userBId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((u: { id: string }) => u.id === userAId);
      expect(found).toBeDefined();
    });

    it('should allow userB to unfollow userA', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/social/follow/${userAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });

    it('should return following = false after unfollowing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/social/is-following/${userAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body).toHaveProperty('following', false);
    });
  });

  // ── 2. Like / Unlike ─────────────────────────────────────────────────────────

  describe('2 — like / unlike opportunity', () => {
    it('should require authentication to like', async () => {
      await request(app.getHttpServer()).post(`/api/v1/social/like/${opportunityId}`).expect(401);
    });

    it('should allow userB to like an opportunity', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/social/like/${opportunityId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });

    it('should reject a duplicate like', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/social/like/${opportunityId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(409);
    });

    it('should allow userB to unlike an opportunity', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/social/like/${opportunityId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });
  });

  // ── 3. Save / Unsave ─────────────────────────────────────────────────────────

  describe('3 — save / unsave opportunity', () => {
    it('should require authentication to save', async () => {
      await request(app.getHttpServer()).post(`/api/v1/social/save/${opportunityId}`).expect(401);
    });

    it('should allow userB to save an opportunity', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/social/save/${opportunityId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });

    it('should return the saved opportunity in the bookmarks list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/social/saved')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((opp: { id: string }) => opp.id === opportunityId);
      expect(found).toBeDefined();
    });

    it('should allow userB to unsave an opportunity', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/social/save/${opportunityId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });

    it('should not return the opportunity in bookmarks after unsaving', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/social/saved')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const found = res.body.find((opp: { id: string }) => opp.id === opportunityId);
      expect(found).toBeUndefined();
    });
  });
});

// ── Helper ────────────────────────────────────────────────────────────────────

function extractToken(res: any): string {
  const cookies: string[] = (res.headers['set-cookie'] as string[]) ?? [];
  const cookie = cookies.find((c: string) => c.startsWith('access_token='));
  return cookie?.split(';')[0]?.split('=')[1] ?? '';
}
