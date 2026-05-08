/**
 * Messages + ChatGateway E2E Test Suite
 *
 * Couvre :
 *  1. Discussions publiques — création, lecture, envoi de messages
 *  2. Discussions privées — démarrage, envoi, lecture, marquer comme lu
 *  3. Aperçu du dernier message dans la liste des DMs
 *  4. Protection des routes — 401 sans token, 403 si non-participant
 *  5. ChatGateway WebSocket — connexion valide, rejet sans token, join/typing
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from '../../app.module';
import { PrismaService } from '../prisma/prisma.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const email = overrides.email ?? `msg-test-${ts}@example.com`;
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      firstName: overrides.firstName ?? 'Msg',
      lastName: 'Tester',
      name: `${overrides.firstName ?? 'Msg'} Tester`,
      email,
      password: 'SecurePass123!',
      role: 'USER',
    })
    .expect(201);
  return { token: extractToken(res), userId: res.body.user.id, email };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Messages + ChatGateway (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let port: number;

  let alice: { token: string; userId: string; email: string };
  let bob: { token: string; userId: string; email: string };
  let eve: { token: string; userId: string; email: string }; // tierce personne

  let publicDiscussionId: string;
  let privateDiscussionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');

    // Écouter sur un port libre pour les tests WebSocket
    await app.listen(0);
    const addr = app.getHttpServer().address();
    port = typeof addr === 'string' ? 0 : addr?.port ?? 0;

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    alice = await registerUser(app, { firstName: 'Alice' });
    bob = await registerUser(app, { firstName: 'Bob' });
    eve = await registerUser(app, { firstName: 'Eve' });

    // Mark all users as email-verified so JwtAuthGuard lets them through
    await prisma.user.updateMany({
      where: { id: { in: [alice.userId, bob.userId, eve.userId] } },
      data: { isEmailVerified: true },
    });
  });

  afterAll(async () => {
    // Explicit child-first deletion (messages → discussion → participants → users)
    if (publicDiscussionId) {
      await prisma.message.deleteMany({ where: { publicDiscussionId } });
      await prisma.publicDiscussion.deleteMany({ where: { id: publicDiscussionId } });
    }
    if (privateDiscussionId) {
      await prisma.message.deleteMany({ where: { privateDiscussionId } });
      await prisma.participant.deleteMany({ where: { discussionId: privateDiscussionId } });
      await prisma.privateDiscussion.deleteMany({ where: { id: privateDiscussionId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [alice.email, bob.email, eve.email] } },
    });
    if (app) await app.close();
  });

  // ── 1. Discussions publiques ───────────────────────────────────────────────

  describe('1 — Public discussions', () => {
    it('GET /messages/public → retourne un tableau (sans auth)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/messages/public')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /messages/public → crée une discussion (authentifié)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/messages/public')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ title: 'Discussion de test', description: 'Description e2e' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Discussion de test');
      publicDiscussionId = res.body.id;
    });

    it('POST /messages/public → 401 sans token', () =>
      request(app.getHttpServer())
        .post('/api/v1/messages/public')
        .send({ title: 'Unauthorized' })
        .expect(401));

    it('POST /messages/public → 400 sans titre', () =>
      request(app.getHttpServer())
        .post('/api/v1/messages/public')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({})
        .expect(400));

    it('POST /messages/public/:id → envoie un message', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/messages/public/${publicDiscussionId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ content: 'Premier message public' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.content).toBe('Premier message public');
      expect(res.body.senderId).toBe(alice.userId);
      // Le sender est maintenant inclus dans la réponse (pour le broadcast socket)
      expect(res.body.sender).toBeDefined();
    });

    it('GET /messages/public/:id → retourne les messages', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/messages/public/${publicDiscussionId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].content).toBe('Premier message public');
    });

    it('POST /messages/public/:id → 401 sans token', () =>
      request(app.getHttpServer())
        .post(`/api/v1/messages/public/${publicDiscussionId}`)
        .send({ content: 'Unauthorized' })
        .expect(401));

    it('POST /messages/public/:id → 400 contenu vide', () =>
      request(app.getHttpServer())
        .post(`/api/v1/messages/public/${publicDiscussionId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .send({})
        .expect(400));
  });

  // ── 2. Discussions privées ─────────────────────────────────────────────────

  describe('2 — Private discussions', () => {
    it('POST /messages/private/start/:targetId → démarre une conversation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/messages/private/start/${bob.userId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.participants).toHaveLength(2);
      privateDiscussionId = res.body.id;
    });

    it('POST /messages/private/start/:targetId → idempotent (retourne la même discussion)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/messages/private/start/${bob.userId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(201);

      expect(res.body.id).toBe(privateDiscussionId);
    });

    it('POST /messages/private/start/:self → 403 (on ne peut pas se DM soi-même)', () =>
      request(app.getHttpServer())
        .post(`/api/v1/messages/private/start/${alice.userId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(403));

    it('POST /messages/private/start/:targetId → 401 sans token', () =>
      request(app.getHttpServer())
        .post(`/api/v1/messages/private/start/${bob.userId}`)
        .expect(401));

    it('POST /messages/private/:id → alice envoie un message à bob', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/messages/private/${privateDiscussionId}`)
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ content: 'Bonjour Bob !' })
        .expect(201);

      expect(res.body.content).toBe('Bonjour Bob !');
      expect(res.body.senderId).toBe(alice.userId);
      // Le sender est inclus pour le broadcast socket
      expect(res.body.sender).toBeDefined();
      expect(res.body.sender.name).toBeDefined();
    });

    it('POST /messages/private/:id → 403 si non-participant', () =>
      request(app.getHttpServer())
        .post(`/api/v1/messages/private/${privateDiscussionId}`)
        .set('Authorization', `Bearer ${eve.token}`)
        .send({ content: 'Intrusion !' })
        .expect(403));

    it('GET /messages/private/:id → bob peut lire la conversation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/messages/private/${privateDiscussionId}`)
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /messages/private/:id → 403 pour un non-participant', () =>
      request(app.getHttpServer())
        .get(`/api/v1/messages/private/${privateDiscussionId}`)
        .set('Authorization', `Bearer ${eve.token}`)
        .expect(403));

    it('GET /messages/private/:id → 401 sans token', () =>
      request(app.getHttpServer())
        .get(`/api/v1/messages/private/${privateDiscussionId}`)
        .expect(401));

    it('POST /messages/private/:id/read → 200 pour un participant', () =>
      request(app.getHttpServer())
        .post(`/api/v1/messages/private/${privateDiscussionId}/read`)
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(200));

    it('POST /messages/private/:id/read → 403 pour un non-participant', () =>
      request(app.getHttpServer())
        .post(`/api/v1/messages/private/${privateDiscussionId}/read`)
        .set('Authorization', `Bearer ${eve.token}`)
        .expect(403));
  });

  // ── 3. Aperçu dernier message dans la liste des DMs ───────────────────────

  describe('3 — Last message preview in DM list', () => {
    it('GET /messages/private → inclut le dernier message de chaque discussion', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/messages/private')
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const discussion = res.body.find((d: any) => d.id === privateDiscussionId);
      expect(discussion).toBeDefined();

      // messages doit être un tableau avec au moins un élément (le dernier message)
      expect(Array.isArray(discussion.messages)).toBe(true);
      expect(discussion.messages.length).toBeGreaterThanOrEqual(1);
      expect(discussion.messages[0]).toHaveProperty('content');
      expect(discussion.messages[0]).toHaveProperty('createdAt');
    });

    it('GET /messages/private → 401 sans token', () =>
      request(app.getHttpServer()).get('/api/v1/messages/private').expect(401));
  });

  // ── 4. ChatGateway WebSocket ───────────────────────────────────────────────

  describe('4 — ChatGateway (WebSocket)', () => {
    const socketUrl = () => `http://localhost:${port}/chat`;

    it('connexion avec JWT valide → connecté', (done) => {
      const socket = io(socketUrl(), {
        auth: { token: alice.token },
        transports: ['websocket'],
        timeout: 5000,
      });

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        socket.disconnect();
        done();
      });

      socket.on('connect_error', (err) => {
        socket.disconnect();
        done(new Error(`Connexion refusée : ${err.message}`));
      });
    });

    it('connexion sans token → déconnecté immédiatement', (done) => {
      const socket = io(socketUrl(), {
        auth: {},
        transports: ['websocket'],
        timeout: 3000,
        reconnection: false,
      });

      const timeout = setTimeout(() => {
        // Si on n'est pas connecté après 3s, le test passe
        if (!socket.connected) { socket.disconnect(); done(); }
      }, 3000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        // Si on arrive ici c'est que le serveur a laissé passer sans token
        // La gateway doit déconnecter le client
        socket.on('disconnect', () => { socket.disconnect(); done(); });
        // Si pas déconnecté rapidement, forcer fail
        setTimeout(() => {
          if (socket.connected) {
            socket.disconnect();
            done(new Error('Le serveur aurait dû rejeter la connexion sans token'));
          }
        }, 1000);
      });

      socket.on('connect_error', () => {
        clearTimeout(timeout);
        socket.disconnect();
        done(); // refusé = comportement attendu
      });
    });

    it('connexion avec token invalide → refusé', (done) => {
      const socket = io(socketUrl(), {
        auth: { token: 'eyJhbGciOiJIUzI1NiJ9.fake.token' },
        transports: ['websocket'],
        timeout: 3000,
        reconnection: false,
      });

      const timer = setTimeout(() => {
        if (!socket.connected) { socket.disconnect(); done(); }
        else { socket.disconnect(); done(new Error('Token invalide devrait être rejeté')); }
      }, 3000);

      socket.on('connect_error', () => { clearTimeout(timer); socket.disconnect(); done(); });
      socket.on('disconnect', () => { clearTimeout(timer); done(); });
    });

    it('join + envoi typing → reçu par l\'autre participant', (done) => {
      jest.setTimeout(15000);
      const socketAlice = io(socketUrl(), {
        auth: { token: alice.token },
        transports: ['websocket'],
      });
      const socketBob = io(socketUrl(), {
        auth: { token: bob.token },
        transports: ['websocket'],
      });

      let aliceConnected = false;
      let bobConnected = false;

      const tryTest = () => {
        if (!aliceConnected || !bobConnected) return;

        // Bob rejoint la room
        socketBob.emit('join', privateDiscussionId);

        // Bob écoute l'event typing
        socketBob.on('typing', (data: { userId: string; name: string }) => {
          expect(data.userId).toBe(alice.userId);
          expect(data.name).toBeDefined();
          socketAlice.disconnect();
          socketBob.disconnect();
          done();
        });

        // Alice envoie un event typing après que Bob ait eu le temps de rejoindre
        setTimeout(() => {
          socketAlice.emit('join', privateDiscussionId);
          socketAlice.emit('typing', {
            discussionId: privateDiscussionId,
            name: 'Alice Tester',
          });
        }, 200);
      };

      socketAlice.on('connect', () => { aliceConnected = true; tryTest(); });
      socketBob.on('connect', () => { bobConnected = true; tryTest(); });

      const timeout = setTimeout(() => {
        socketAlice.disconnect();
        socketBob.disconnect();
        done(new Error('Timeout : event typing non reçu'));
      }, 10000);

      socketAlice.on('disconnect', () => clearTimeout(timeout));
    });

    it('newMessage broadcasté via socket lors d\'un envoi REST', (done) => {
      jest.setTimeout(15000);
      const socketBob = io(socketUrl(), {
        auth: { token: bob.token },
        transports: ['websocket'],
      });

      const failTimeout = setTimeout(() => {
        socketBob.disconnect();
        done(new Error('Timeout: newMessage non reçu'));
      }, 12000);

      socketBob.on('connect', () => {
        socketBob.emit('join', privateDiscussionId);

        socketBob.on('newMessage', (msg: any) => {
          clearTimeout(failTimeout);
          expect(msg.content).toBe('Message temps réel');
          expect(msg.senderId).toBe(alice.userId);
          socketBob.disconnect();
          done();
        });

        // Envoyer le message via REST — le socket doit broadcaster
        setTimeout(() => {
          request(app.getHttpServer())
            .post(`/api/v1/messages/private/${privateDiscussionId}`)
            .set('Authorization', `Bearer ${alice.token}`)
            .send({ content: 'Message temps réel' })
            .then(() => {})
            .catch(done);
        }, 200);
      });

      socketBob.on('connect_error', (err) => {
        clearTimeout(failTimeout);
        done(new Error(`Connexion Bob refusée: ${err.message}`));
      });
    });
  });
});
