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

describe('Tasks module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userACredentials = {
    email: `tasks.a.${Date.now()}@example.com`,
    password: 'UserAPassword123!',
    firstName: 'Task',
    lastName: 'UserA',
  };

  const userBCredentials = {
    email: `tasks.b.${Date.now()}@example.com`,
    password: 'UserBPassword123!',
    firstName: 'Task',
    lastName: 'UserB',
  };

  let tokenA: string;
  let userAId: string;
  let tokenB: string;
  let userBId: string;
  let taskId: string | null;

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

    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...userACredentials, name: 'Task UserA' });
    tokenA = extractToken(resA);
    userAId = resA.body.user.id;

    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...userBCredentials, name: 'Task UserB' });
    tokenB = extractToken(resB);
    userBId = resB.body.user.id;

    await prisma.user.updateMany({
      where: { id: { in: [userAId, userBId] } },
      data: { isEmailVerified: true },
    });
  });

  afterAll(async () => {
    await prisma.task.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.user.deleteMany({
      where: { email: { in: [userACredentials.email, userBCredentials.email] } },
    });
    if (app) await app.close();
  });

  // ── 1. Route protection ────────────────────────────────────────────────────

  describe('1 — route protection', () => {
    it('GET /tasks → 401 without token', () =>
      request(app.getHttpServer()).get('/api/v1/tasks').expect(401));

    it('POST /tasks → 401 without token', () =>
      request(app.getHttpServer())
        .post('/api/v1/tasks')
        .send({ name: 'Ghost task' })
        .expect(401));

    it('PUT /tasks/:id → 401 without token', () =>
      request(app.getHttpServer())
        .put('/api/v1/tasks/some-id')
        .send({ name: 'Updated' })
        .expect(401));

    it('DELETE /tasks/:id → 401 without token', () =>
      request(app.getHttpServer()).delete('/api/v1/tasks/some-id').expect(401));
  });

  // ── 2. Create ──────────────────────────────────────────────────────────────

  describe('2 — create', () => {
    it('should reject missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({})
        .expect(400);
    });

    it('should reject name exceeding 200 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'a'.repeat(201) })
        .expect(400);
    });

    it('should reject an invalid status value', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Valid name', status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('should create a task with TODO status by default', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'My first task' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('My first task');
      expect(res.body.status).toBe('TODO');
      expect(res.body.userId).toBe(userAId);

      taskId = res.body.id;
    });

    it('should create a task with an explicit status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Idea task', status: 'IDEA' })
        .expect(201);

      expect(res.body.status).toBe('IDEA');
      // Clean up immediately — not needed for subsequent tests
      await prisma.task.delete({ where: { id: res.body.id } });
    });
  });

  // ── 3. Read ────────────────────────────────────────────────────────────────

  describe('3 — list', () => {
    it('should return only the authenticated user\'s tasks', async () => {
      // Create a task for userB to ensure isolation
      await prisma.task.create({
        data: { userId: userBId, name: 'UserB task', status: 'TODO' },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // UserA should only see their own tasks
      const hasUserBTask = res.body.some((t: { userId: string }) => t.userId === userBId);
      expect(hasUserBTask).toBe(false);
      // UserA's task is present
      const found = res.body.find((t: { id: string }) => t.id === taskId);
      expect(found).toBeDefined();
    });

    it('userB only sees their own tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const hasUserATask = res.body.some((t: { id: string }) => t.id === taskId);
      expect(hasUserATask).toBe(false);
    });
  });

  // ── 4. Update ──────────────────────────────────────────────────────────────

  describe('4 — update', () => {
    it('should return 404 when updating a non-existent task', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/tasks/cm00000000000000000000000')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });

    it('should prevent userB from updating userA\'s task', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Hijacked' })
        .expect(403);
    });

    it('should allow userA to update their own task name', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Updated task name' })
        .expect(200);

      expect(res.body.name).toBe('Updated task name');
    });

    it('should allow userA to change task status to WORKING_ON_IT', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ status: 'WORKING_ON_IT' })
        .expect(200);

      expect(res.body.status).toBe('WORKING_ON_IT');
    });

    it('should allow userA to mark task as DONE', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ status: 'DONE' })
        .expect(200);

      expect(res.body.status).toBe('DONE');
    });

    it('should reject an invalid status on update', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ status: 'INVALID' })
        .expect(400);
    });
  });

  // ── 5. Delete ──────────────────────────────────────────────────────────────

  describe('5 — delete', () => {
    it('should return 404 when deleting a non-existent task', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/tasks/cm00000000000000000000000')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it('should prevent userB from deleting userA\'s task', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });

    it('should allow userA to delete their own task → { success: true }', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      taskId = null; // prevent afterAll from trying to delete again
    });

    it('task is gone after deletion', async () => {
      const found = await prisma.task.findFirst({ where: { userId: userAId, name: 'Updated task name' } });
      expect(found).toBeNull();
    });
  });
});
