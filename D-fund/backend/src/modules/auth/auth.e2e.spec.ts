/**
 * Auth E2E tests — full HTTP layer via Supertest.
 *
 * Toutes les dépendances externes (Prisma, Redis, Notifications) sont
 * remplacées par des mocks in-memory : la suite tourne sans aucun service
 * externe et reste déterministe en CI.
 *
 * Couvre :
 *  - POST /auth/register   — validation DTO, cookies HttpOnly, conflit email
 *  - POST /auth/login      — succès, mauvais mdp, DoS protection MaxLength
 *  - GET  /auth/me         — cookie valide, sans cookie, email non vérifié
 *  - POST /auth/refresh    — rotation tokens, blocklist
 *  - POST /auth/logout     — effacement cookies, blocklist Redis
 *  - Guard email vérifié   — 403 sur route protégée si non vérifié
 *  - GET  /auth/verify-email    — token valide, invalide/expiré, absent
 *  - POST /auth/forgot-password — email connu, inconnu (anti-énumération), compte Google-only
 *  - POST /auth/reset-password  — token valide, invalide/expiré, mdp faible, token absent
 */

import * as crypto from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Simule ce que USER_SAFE_SELECT retourne (sans password ni tokens sensibles)
const SAFE_USER = {
  id: 'user-verified-id',
  email: 'verified@test.com',
  isEmailVerified: true,
  role: 'USER',
  firstName: 'Test',
  lastName: 'User',
  name: 'Test User',
  bio: null,
  profilePic: null,
  headerImage: null,
  phone: null,
  city: null,
  country: null,
  linkedinUrl: null,
  website: null,
  visibility: 'PUBLIC',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Simule la ligne DB complète (avec hash mot de passe) — uniquement pour les tests login
const VERIFIED_USER_DB = {
  ...SAFE_USER,
  // bcrypt hash of "password"
  password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
};

const SAFE_UNVERIFIED_USER = {
  ...SAFE_USER,
  id: 'user-unverified-id',
  email: 'unverified@test.com',
  isEmailVerified: false,
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  getdel: jest.fn().mockResolvedValue(null),
  exists: jest.fn().mockResolvedValue(0),
};

const mockNotifications = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  createInApp: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: (key: string) => {
    const cfg: Record<string, string> = {
      JWT_SECRET: 'test-jwt-secret',
      REFRESH_TOKEN_SECRET: 'test-refresh-secret',
      FRONTEND_URL: 'http://localhost:3000',
      NODE_ENV: 'test',
    };
    return cfg[key] ?? null;
  },
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Auth (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PassportModule,
        JwtModule.register({
          secret: 'test-jwt-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = module.get(JwtService);
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.getdel.mockResolvedValue(null);
  });

  // ─── Register ──────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('crée un compte et pose les cookies HttpOnly', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ ...SAFE_USER, isEmailVerified: false });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce({
        ...SAFE_USER,
        isEmailVerified: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'new@test.com',
          password: 'Password1',
          firstName: 'New',
          lastName: 'User',
          acceptTerms: true,
        })
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.token).toBeUndefined();

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it("retourne 409 si l'email existe déjà", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(VERIFIED_USER_DB);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'verified@test.com',
          password: 'Password1',
          firstName: 'A',
          lastName: 'B',
          acceptTerms: true,
        })
        .expect(409);
    });

    it('retourne 400 si le mot de passe est trop faible', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'new@test.com', password: 'weak', firstName: 'A', lastName: 'B' })
        .expect(400);
    });

    it("retourne 400 si l'email est absent", async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ password: 'Password1', firstName: 'A', lastName: 'B' })
        .expect(400);
    });

    it('retourne 400 si les CGU/politique de confidentialité ne sont pas acceptées', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'no-consent@test.com',
          password: 'Password1',
          firstName: 'A',
          lastName: 'B',
        })
        .expect(400);
    });

    it('retourne 400 si acceptTerms est explicitement false', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'no-consent2@test.com',
          password: 'Password1',
          firstName: 'A',
          lastName: 'B',
          acceptTerms: false,
        })
        .expect(400);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('authentifie et pose les cookies HttpOnly', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(VERIFIED_USER_DB);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(SAFE_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'verified@test.com', password: 'password' })
        .expect(200);

      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeUndefined();

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it('retourne 401 pour un mauvais mot de passe', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(VERIFIED_USER_DB);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'verified@test.com', password: 'WrongPassword1' })
        .expect(401);
    });

    it('retourne 401 pour un email inconnu', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@test.com', password: 'Password1' })
        .expect(401);
    });

    it('retourne 400 si le mot de passe dépasse 128 chars (protection bcrypt DoS)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'verified@test.com', password: 'A1a' + 'x'.repeat(126) })
        .expect(400);
    });
  });

  // ─── GET /auth/me ──────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it("retourne l'utilisateur avec un cookie valide", async () => {
      const token = jwtService.sign({ userId: SAFE_USER.id, email: SAFE_USER.email });
      mockPrisma.user.findUnique.mockResolvedValueOnce(SAFE_USER);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`access_token=${token}`])
        .expect(200);

      expect(res.body.id).toBe(SAFE_USER.id);
      expect(res.body.password).toBeUndefined();
    });

    it('retourne 401 sans cookie', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it("accessible même si l'email n'est PAS vérifié (@SkipEmailVerification)", async () => {
      const token = jwtService.sign({
        userId: SAFE_UNVERIFIED_USER.id,
        email: SAFE_UNVERIFIED_USER.email,
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(SAFE_UNVERIFIED_USER);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', [`access_token=${token}`])
        .expect(200);

      expect(res.body.isEmailVerified).toBe(false);
    });
  });

  // ─── Email verification guard ──────────────────────────────────────────────

  describe('Guard email vérifié', () => {
    it('retourne 200 sur resend-verification même sans email vérifié', async () => {
      const token = jwtService.sign({
        userId: SAFE_UNVERIFIED_USER.id,
        email: SAFE_UNVERIFIED_USER.email,
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(SAFE_UNVERIFIED_USER) // JwtStrategy.validate
        .mockResolvedValueOnce(SAFE_UNVERIFIED_USER); // resendVerification

      await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .set('Cookie', [`access_token=${token}`])
        .expect(200);
    });
  });

  // ─── Refresh ───────────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('émet de nouveaux tokens depuis un cookie refresh valide', async () => {
      const { refreshToken } = signTestTokens(jwtService, SAFE_USER);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: SAFE_USER.id,
        email: SAFE_USER.email,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(200);

      expect(res.body.message).toBe('Tokens refreshed.');
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    });

    it('retourne 401 si le token est dans la blocklist', async () => {
      const { refreshToken } = signTestTokens(jwtService, SAFE_USER);
      mockRedis.exists.mockResolvedValueOnce(1); // token révoqué

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(401);
    });

    it('retourne 401 sans cookie refresh', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);
    });

    it('retourne 401 si le compte est banni (isBanned = true)', async () => {
      const { refreshToken } = signTestTokens(jwtService, SAFE_USER);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: SAFE_USER.id,
        email: SAFE_USER.email,
        isBanned: true,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(401);
    });
  });

  // ─── Logout ────────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('efface les cookies et envoie le token dans la blocklist Redis', async () => {
      const { refreshToken } = signTestTokens(jwtService, SAFE_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(200);

      expect(res.body.message).toBe('Logged out successfully.');

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const accessCookie = cookies.find((c) => c.startsWith('access_token='));
      expect(accessCookie).toBeDefined();
      // Le cookie doit être expiré (Max-Age=0 ou Expires dans le passé)
      expect(accessCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);

      // Le refresh token doit être blacklisté
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^blocklist:rt:/),
        '1',
        'EX',
        expect.any(Number),
      );
    });
  });

  // ─── Verify email ────────────────────────────────────────────────────────────

  describe('GET /auth/verify-email', () => {
    it("vérifie l'email avec un token valide et le consomme", async () => {
      const rawToken = 'valid-verification-token';
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        ...SAFE_UNVERIFIED_USER,
        emailVerificationToken: hashedToken,
      });
      mockPrisma.user.update.mockResolvedValueOnce({});

      const res = await request(app.getHttpServer())
        .get(`/api/v1/auth/verify-email?token=${rawToken}`)
        .expect(200);

      expect(res.body.message).toContain('vérifié');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: SAFE_UNVERIFIED_USER.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
        },
      });
    });

    it('retourne 400 pour un token invalide ou expiré', async () => {
      // Ni le lookup par hash ni le fallback plaintext ne trouvent de compte
      mockPrisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/api/v1/auth/verify-email?token=bogus-token')
        .expect(400);
    });

    it('retourne 400 si le token est absent', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/verify-email').expect(400);
    });
  });

  // ─── Forgot password ─────────────────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it("retourne 200 et déclenche l'email pour un compte existant avec mot de passe", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(VERIFIED_USER_DB);
      mockPrisma.user.update.mockResolvedValueOnce({});

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'verified@test.com' })
        .expect(200);

      expect(res.body.message).toContain('If this email exists');
      expect(mockNotifications.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('retourne le même message générique pour un email inconnu (anti-énumération)', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost@test.com' })
        .expect(200);

      expect(res.body.message).toContain('If this email exists');
      expect(mockNotifications.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('ignore silencieusement les comptes liés uniquement à Google (sans mot de passe)', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        ...VERIFIED_USER_DB,
        password: null,
        googleId: 'google-123',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'verified@test.com' })
        .expect(200);

      expect(res.body.message).toContain('If this email exists');
      expect(mockNotifications.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('retourne 400 pour un email au format invalide', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  // ─── Reset password ──────────────────────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    it('réinitialise le mot de passe avec un token valide', async () => {
      const rawToken = 'valid-reset-token';
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        ...VERIFIED_USER_DB,
        passwordResetToken: hashedToken,
      });
      mockPrisma.user.update.mockResolvedValueOnce({});

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'NewPassword1' })
        .expect(200);

      expect(res.body.message).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: VERIFIED_USER_DB.id },
          data: expect.objectContaining({
            passwordResetToken: null,
            passwordResetExpiry: null,
          }),
        }),
      );
      expect(mockNotifications.sendPasswordChangedEmail).toHaveBeenCalledTimes(1);
    });

    it('retourne 400 pour un token invalide ou expiré', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'bogus-token', password: 'NewPassword1' })
        .expect(400);
    });

    it('retourne 400 si le nouveau mot de passe est trop faible', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-token', password: 'weak' })
        .expect(400);
    });

    it('retourne 400 si le token est absent', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ password: 'NewPassword1' })
        .expect(400);
    });
  });
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function signTestTokens(svc: JwtService, user: { id: string; email: string }) {
  const accessToken = svc.sign({ userId: user.id, email: user.email });
  const refreshToken = svc.sign(
    { userId: user.id, email: user.email },
    { secret: 'test-refresh-secret', expiresIn: '7d' },
  );
  return { accessToken, refreshToken };
}
