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

describe('Applications module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const ownerCredentials = {
    email: `app.owner.${Date.now()}@example.com`,
    password: 'OwnerPassword123!',
    firstName: 'App',
    lastName: 'Owner',
  };

  const candidateCredentials = {
    email: `app.candidate.${Date.now()}@example.com`,
    password: 'CandidatePassword123!',
    firstName: 'App',
    lastName: 'Candidate',
  };

  const otherCredentials = {
    email: `app.other.${Date.now()}@example.com`,
    password: 'OtherPassword123!',
    firstName: 'App',
    lastName: 'Other',
  };

  let ownerToken: string;
  let ownerUserId: string;
  let candidateToken: string;
  let otherToken: string;
  let opportunityId: string;
  let applicationId: string;

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
    const ownerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...ownerCredentials, name: 'App Owner' });
    ownerToken = extractToken(ownerRes);
    ownerUserId = ownerRes.body.user.id;

    const candidateRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...candidateCredentials, name: 'App Candidate' });
    candidateToken = extractToken(candidateRes);
    const candidateUserId = candidateRes.body.user.id;

    const otherRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...otherCredentials, name: 'Other User' });
    otherToken = extractToken(otherRes);
    const otherUserId = otherRes.body.user.id;

    // Mark all users as email-verified so JwtAuthGuard lets them through
    await prisma.user.updateMany({
      where: { id: { in: [ownerUserId, candidateUserId, otherUserId] } },
      data: { isEmailVerified: true },
    });

    // Create an ACTIVE opportunity owned by the owner
    const oppRes = await request(app.getHttpServer())
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Test Opportunity', type: 'JOB_OPPORTUNITY' });
    opportunityId = oppRes.body.id;

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { status: 'ACTIVE', needToCheckApplicant: true },
    });
  });

  afterAll(async () => {
    if (applicationId) {
      await prisma.application.deleteMany({ where: { id: applicationId } });
    }
    if (opportunityId) {
      await prisma.opportunity.deleteMany({ where: { id: opportunityId } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ownerCredentials.email, candidateCredentials.email, otherCredentials.email],
        },
      },
    });
    if (app) await app.close();
  });

  // ── 1. Create application ────────────────────────────────────────────────────

  describe('1 — create', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .send({ opportunityId })
        .expect(401);
    });

    it('should reject missing opportunityId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({})
        .expect(400);
    });

    it('should create a DRAFT application', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ opportunityId, title: 'My application' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.stage).toBe('DRAFT');
      expect(res.body.opportunityId).toBe(opportunityId);

      applicationId = res.body.id;
    });

    it('should prevent duplicate applications from the same candidate', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ opportunityId })
        .expect(409);
    });
  });

  // ── 2. Update application ────────────────────────────────────────────────────

  describe('2 — update', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}`)
        .send({ title: 'Updated' })
        .expect(401);
    });

    it('should reject updates from non-owners', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hijacked' })
        .expect(403);
    });

    it('should allow the candidate to update their DRAFT application', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ title: 'Updated title', goalLetter: 'I am very motivated.' })
        .expect(200);

      expect(res.body.title).toBe('Updated title');
    });
  });

  // ── 3. Submit application ────────────────────────────────────────────────────

  describe('3 — submit', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${applicationId}/submit`)
        .expect(401);
    });

    it('should reject submission from non-owners', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${applicationId}/submit`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('should submit the application and move it to SUBMITTED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/applications/${applicationId}/submit`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(201);

      expect(res.body.stage).toBe('SUBMITTED');
    });

    it('should reject resubmission of an already-submitted application', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${applicationId}/submit`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(400);
    });
  });

  // ── 4. List by opportunity ───────────────────────────────────────────────────

  describe('4 — list by opportunity', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/applications/opportunity/${opportunityId}`)
        .expect(401);
    });

    it('should reject non-owners viewing applications for an opportunity', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/applications/opportunity/${opportunityId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(403);
    });

    it('should return applications for the opportunity owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/opportunity/${opportunityId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── 5. List by user ──────────────────────────────────────────────────────────

  describe('5 — list by user', () => {
    it('should require authentication', async () => {
      const candidateUser = await prisma.user.findUnique({
        where: { email: candidateCredentials.email },
      });
      await request(app.getHttpServer())
        .get(`/api/v1/applications/user/${candidateUser!.id}`)
        .expect(401);
    });

    it("should reject users accessing other users' application lists", async () => {
      const candidateUser = await prisma.user.findUnique({
        where: { email: candidateCredentials.email },
      });
      await request(app.getHttpServer())
        .get(`/api/v1/applications/user/${candidateUser!.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('should return own applications', async () => {
      const candidateUser = await prisma.user.findUnique({
        where: { email: candidateCredentials.email },
      });
      const res = await request(app.getHttpServer())
        .get(`/api/v1/applications/user/${candidateUser!.id}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── 6. Review — happy path (SUBMITTED → SUCCESS) ────────────────────────────

  describe('6 — review', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}/review`)
        .send({ stage: 'SUCCESS' })
        .expect(401);
    });

    it('should reject review from non-opportunity-owners', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ stage: 'SUCCESS' })
        .expect(403);
    });

    it('should allow the opportunity owner to review an application', async () => {
      // SUBMITTED → OWNER_REVIEW is the first valid review transition
      const res = await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ stage: 'OWNER_REVIEW', reviewFeedback: 'Great candidate!' })
        .expect(200);

      expect(res.body.stage).toBe('OWNER_REVIEW');
      expect(res.body.isClosed).toBe(false);
      expect(res.body.reviewFeedback).toBe('Great candidate!');
    });
  });

  // ── 7. State machine — complete transitions ──────────────────────────────────

  describe('7 — state machine complete transitions', () => {
    let secondOpportunityId: string;
    let secondApplicationId: string;

    beforeAll(async () => {
      // Create a second ACTIVE opportunity for this test section
      const oppRes = await request(app.getHttpServer())
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'State Machine Opportunity', type: 'JOB_OPPORTUNITY' });
      secondOpportunityId = oppRes.body.id;

      await prisma.opportunity.update({
        where: { id: secondOpportunityId },
        data: { status: 'ACTIVE', needToCheckApplicant: true },
      });

      // Create a DRAFT application for this test section
      const appRes = await request(app.getHttpServer())
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ opportunityId: secondOpportunityId, title: 'State machine test' })
        .expect(201);
      secondApplicationId = appRes.body.id;
    });

    afterAll(async () => {
      if (secondApplicationId) {
        await prisma.application.deleteMany({ where: { id: secondApplicationId } });
      }
      if (secondOpportunityId) {
        await prisma.opportunity.deleteMany({ where: { id: secondOpportunityId } });
      }
    });

    it('should prevent updating a SUBMITTED application', async () => {
      // First submit
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${secondApplicationId}/submit`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(201);

      // Then try to update — must be rejected
      await request(app.getHttpServer())
        .put(`/api/v1/applications/${secondApplicationId}`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ title: 'Should not work' })
        .expect(400);
    });

    it('should allow the owner to move an application to OWNER_REVIEW', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/applications/${secondApplicationId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ stage: 'OWNER_REVIEW', feedbackTitle: 'Under review' })
        .expect(200);

      expect(res.body.stage).toBe('OWNER_REVIEW');
      expect(res.body.isClosed).toBe(false);
    });

    it('should allow the owner to archive an application (OWNER_REVIEW → ARCHIVED)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/applications/${secondApplicationId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ stage: 'ARCHIVED', reviewFeedback: 'Not a good fit at this time.' })
        .expect(200);

      expect(res.body.stage).toBe('ARCHIVED');
      expect(res.body.isClosed).toBe(true);
      expect(res.body.reviewFeedback).toBe('Not a good fit at this time.');
    });
  });

  // ── 8. Invalid inputs and 404s ───────────────────────────────────────────────

  describe('8 — invalid inputs and 404s', () => {
    it('should reject review with a forbidden stage (DRAFT is not reviewable)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ stage: 'DRAFT' })
        .expect(400);
    });

    it('should reject review with a forbidden stage (SUBMITTED is not reviewable)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ stage: 'SUBMITTED' })
        .expect(400);
    });

    it('should return 404 when submitting a non-existent application', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/applications/cm00000000000000000000000/submit')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(404);
    });

    it('should return 404 when reviewing a non-existent application', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/applications/cm00000000000000000000000/review')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ stage: 'SUCCESS' })
        .expect(404);
    });

    it('should prevent the candidate from reviewing their own application', async () => {
      // The candidate is NOT the opportunity owner — review must be forbidden
      await request(app.getHttpServer())
        .put(`/api/v1/applications/${applicationId}/review`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ stage: 'SUCCESS' })
        .expect(403);
    });
  });
});
