/**
 * Auth Service — tests unitaires.
 *
 * Teste la logique métier en isolation : génération de tokens, rotation,
 * blocklist Redis, register/login, forgotPassword.
 */

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { REDIS_CLIENT } from '../redis/redis.module';

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
  exists: jest.fn().mockResolvedValue(0),
  getdel: jest.fn().mockResolvedValue(null),
};

const mockNotifications = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfig = {
  get: (key: string) => {
    const cfg: Record<string, string> = {
      JWT_SECRET: 'test-jwt-secret',
      REFRESH_TOKEN_SECRET: 'test-refresh-secret',
      FRONTEND_URL: 'http://localhost:3000',
    };
    return cfg[key] ?? null;
  },
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: 'test-jwt-secret',
            signOptions: { expiresIn: '15m' },
          }),
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.exists.mockResolvedValue(0);
  });

  // ─── generateTokens ────────────────────────────────────────────────────────

  describe('generateTokens()', () => {
    it('retourne deux tokens distincts', () => {
      const { accessToken, refreshToken } = service.generateTokens('uid', 'a@b.com', 'USER');
      expect(accessToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();
      expect(accessToken).not.toBe(refreshToken);
    });

    it("l'access token expire dans ~15 min", () => {
      const { accessToken } = service.generateTokens('uid', 'a@b.com', 'USER');
      const payload = jwtService.decode(accessToken) as { exp: number; iat: number };
      expect(payload.exp - payload.iat).toBe(15 * 60);
    });

    it('le refresh token expire dans ~7 jours', () => {
      const { refreshToken } = service.generateTokens('uid', 'a@b.com', 'USER');
      const payload = jwtService.decode(refreshToken) as { exp: number; iat: number };
      expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
    });

    it('les deux tokens ont des secrets différents', () => {
      const { refreshToken } = service.generateTokens('uid', 'a@b.com', 'USER');
      // Vérification avec le mauvais secret doit échouer
      expect(() => jwtService.verify(refreshToken, { secret: 'test-jwt-secret' })).toThrow();
    });
  });

  // ─── refreshTokens ─────────────────────────────────────────────────────────

  describe('refreshTokens()', () => {
    it('émet de nouveaux tokens pour un refresh token valide', async () => {
      const { refreshToken } = service.generateTokens('uid', 'a@b.com', 'USER');
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'uid',
        email: 'a@b.com',
        role: 'USER',
      });

      const result = await service.refreshTokens(refreshToken);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      // La rotation utilise SET NX pour bloquer atomiquement le token consommé
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^blocklist:rt:/),
        '1',
        'EX',
        expect.any(Number),
        'NX',
      );
    });

    it('lève UnauthorizedException si token dans la blocklist', async () => {
      const { refreshToken } = service.generateTokens('uid', 'a@b.com', 'USER');
      mockRedis.exists.mockResolvedValueOnce(1);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si token vide', async () => {
      await expect(service.refreshTokens('')).rejects.toThrow(UnauthorizedException);
    });

    it("lève UnauthorizedException si l'utilisateur n'existe plus", async () => {
      const { refreshToken } = service.generateTokens('deleted-uid', 'gone@b.com', 'USER');
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('bloque le token consommé après rotation', async () => {
      const { refreshToken } = service.generateTokens('uid', 'a@b.com', 'USER');
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'uid',
        email: 'a@b.com',
        role: 'USER',
      });

      await service.refreshTokens(refreshToken);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^blocklist:rt:/),
        '1',
        'EX',
        expect.any(Number),
        'NX',
      );
    });
  });

  // ─── invalidateRefreshToken ────────────────────────────────────────────────

  describe('invalidateRefreshToken()', () => {
    it('écrit dans Redis avec une clé hash et un TTL', async () => {
      const { refreshToken } = service.generateTokens('uid', 'a@b.com', 'USER');

      await service.invalidateRefreshToken(refreshToken);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^blocklist:rt:[a-f0-9]{64}$/),
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('ne fait rien si Redis est null (fallback)', async () => {
      // Simule l'absence de Redis
      const serviceWithoutRedis = new (AuthService as any)(
        mockPrisma,
        jwtService,
        mockNotifications,
        mockConfig,
        null,
      );
      await expect(
        serviceWithoutRedis.invalidateRefreshToken('any-token'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('retourne user + tokens pour des credentials valides', async () => {
      const hashed = await bcrypt.hash('Password1', 10);
      const dbUser = { ...buildSafeUser(), password: hashed };

      mockPrisma.user.findUnique.mockResolvedValueOnce(dbUser);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(buildSafeUser());

      const result = await service.login({ email: 'a@b.com', password: 'Password1' });

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect((result.user as any).password).toBeUndefined();
    });

    it('lève UnauthorizedException pour un mauvais mot de passe', async () => {
      const hashed = await bcrypt.hash('Password1', 10);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...buildSafeUser(), password: hashed });

      await expect(service.login({ email: 'a@b.com', password: 'WrongPass1' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('crée un user et retourne user + tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-id', email: 'new@b.com' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValueOnce(buildSafeUser());

      const result = await service.register({
        email: 'new@b.com',
        password: 'Password1',
        firstName: 'A',
        lastName: 'B',
      });

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeTruthy();
    });

    it("lève ConflictException si l'email existe déjà", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(buildSafeUser());

      await expect(
        service.register({
          email: 'exists@b.com',
          password: 'Password1',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('retourne toujours le même message (anti-enumeration)', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null); // email inconnu
      const result = await service.forgotPassword('nobody@test.com');
      expect(result.message).toContain('If this email exists');
    });

    it("envoie l'email quand le user existe", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(buildSafeUser());
      mockPrisma.user.update.mockResolvedValueOnce({});

      await service.forgotPassword('a@b.com');

      expect(mockNotifications.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildSafeUser() {
  return {
    id: 'uid',
    email: 'a@b.com',
    firstName: 'Test',
    lastName: 'User',
    name: 'Test User',
    role: 'USER',
    bio: null,
    profilePic: null,
    headerImage: null,
    phone: null,
    city: null,
    country: null,
    linkedinUrl: null,
    website: null,
    visibility: 'PUBLIC',
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
