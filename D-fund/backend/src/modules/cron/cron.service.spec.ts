/**
 * Cron Service — tests unitaires.
 *
 * Priorité : le verrou distribué Redis (SET NX / DEL) qui empêche une tâche
 * planifiée de s'exécuter en double quand plusieurs instances backend tournent
 * en parallèle (Railway). Ce type de bug ne se manifeste qu'en production à
 * plusieurs instances — invisible en local, donc particulièrement dangereux
 * sans filet de test. Le module n'avait aucun test avant cette suite.
 *
 * Couvre aussi la logique métier de quelques tâches représentatives
 * (archivage, expiration, nettoyage, calcul de score) et la résilience aux
 * erreurs (une tâche qui échoue ne doit jamais faire planter le process).
 */

import { Test } from '@nestjs/testing';
import * as Sentry from '@sentry/nestjs';
import { OpportunityStatus, ReferralStatus } from '@prisma/client';

import { CronService } from './cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  opportunity: {
    updateMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  referralCode: { updateMany: jest.fn() },
  user: { updateMany: jest.fn(), findMany: jest.fn() },
  btoCProfile: { updateMany: jest.fn() },
  btoBProfile: { updateMany: jest.fn() },
  follow: { groupBy: jest.fn() },
  likedOpportunity: { groupBy: jest.fn() },
  savedOpportunity: { groupBy: jest.fn() },
  application: { groupBy: jest.fn() },
  industry: { findMany: jest.fn(), update: jest.fn() },
  feature: { findMany: jest.fn(), update: jest.fn() },
  publicDiscussion: { findMany: jest.fn(), update: jest.fn() },
  message: { findMany: jest.fn(), count: jest.fn() },
  participant: { findMany: jest.fn(), update: jest.fn() },
  rating: { groupBy: jest.fn() },
  $queryRaw: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
  del: jest.fn(),
  ping: jest.fn(),
};

function freshPrismaDefaults() {
  mockPrisma.opportunity.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.opportunity.findMany.mockResolvedValue([]);
  mockPrisma.opportunity.update.mockResolvedValue({});
  mockPrisma.referralCode.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });
  mockRedis.set.mockResolvedValue('OK');
  mockRedis.del.mockResolvedValue(1);
}

describe('CronService', () => {
  let service: CronService;
  let serviceNoRedis: CronService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(CronService);

    // A second instance with no Redis client — simulates single-instance dev/test,
    // where the lock is bypassed entirely (constructor takes `Redis | null`).
    const moduleNoRedis = await Test.createTestingModule({
      providers: [
        CronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: null },
      ],
    }).compile();
    serviceNoRedis = moduleNoRedis.get(CronService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    freshPrismaDefaults();
  });

  // ─── Verrou distribué ──────────────────────────────────────────────────────

  describe('verrou distribué (withLock)', () => {
    it('acquiert le verrou via SET NX EX puis le libère via DEL après un job réussi', async () => {
      await service.archiveExpiredOpportunities();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'cron:lock:archiveExpiredOpportunities',
        '1',
        'EX',
        300,
        'NX',
      );
      expect(mockRedis.del).toHaveBeenCalledWith('cron:lock:archiveExpiredOpportunities');
      // Le job métier a bien tourné
      expect(mockPrisma.opportunity.updateMany).toHaveBeenCalled();
    });

    it("n'exécute PAS le job si une autre instance détient déjà le verrou (SET NX échoue)", async () => {
      mockRedis.set.mockResolvedValueOnce(null); // NX refusé — verrou déjà pris ailleurs

      await service.archiveExpiredOpportunities();

      expect(mockPrisma.opportunity.updateMany).not.toHaveBeenCalled();
      // Pas de verrou acquis par nous → rien à libérer
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('libère le verrou même si le job métier lève une exception (finally)', async () => {
      mockPrisma.opportunity.updateMany.mockRejectedValueOnce(new Error('DB down'));

      // Le job catch ses propres erreurs en interne (ne doit jamais rejeter ici)
      await expect(service.archiveExpiredOpportunities()).resolves.toBeUndefined();

      expect(mockRedis.del).toHaveBeenCalledWith('cron:lock:archiveExpiredOpportunities');
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ tags: { cron: 'archiveExpiredOpportunities' } }),
      );
    });

    it('exécute le job SANS verrou Redis si le client Redis est absent (mono-instance dev/test)', async () => {
      await serviceNoRedis.archiveExpiredOpportunities();

      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockPrisma.opportunity.updateMany).toHaveBeenCalled();
    });

    it("fail-open si Redis lève une erreur au moment d'acquérir le verrou (le job tourne quand même)", async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await service.archiveExpiredOpportunities();

      // Design assumé (commentaire du code) : une double-exécution occasionnelle
      // est préférable à un job qui ne tourne jamais.
      expect(mockPrisma.opportunity.updateMany).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: { cron: 'archiveExpiredOpportunities', phase: 'lock_acquire' },
        }),
      );
    });

    it('utilise un TTL de verrou plus long (1800s) pour le job long recountAllCounters', async () => {
      mockPrisma.opportunity.groupBy.mockResolvedValue([]);
      mockPrisma.follow.groupBy.mockResolvedValue([]);
      mockPrisma.likedOpportunity.groupBy.mockResolvedValue([]);
      mockPrisma.savedOpportunity.groupBy.mockResolvedValue([]);
      mockPrisma.application.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.industry.findMany.mockResolvedValue([]);
      mockPrisma.feature.findMany.mockResolvedValue([]);
      mockPrisma.publicDiscussion.findMany.mockResolvedValue([]);
      mockPrisma.participant.findMany.mockResolvedValue([]);
      mockPrisma.rating.groupBy.mockResolvedValue([]);

      await service.recountAllCounters();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'cron:lock:recountAllCounters',
        '1',
        'EX',
        1800,
        'NX',
      );
    });
  });

  // ─── archiveExpiredOpportunities ───────────────────────────────────────────

  describe('archiveExpiredOpportunities', () => {
    it("n'archive que les opportunités ACTIVE/PENDING dont la date d'expiration est passée", async () => {
      await service.archiveExpiredOpportunities();

      const call = mockPrisma.opportunity.updateMany.mock.calls[0][0];
      expect(call.where.status.in).toEqual([OpportunityStatus.ACTIVE, OpportunityStatus.PENDING]);
      expect(call.where.expirationDate.lt).toBeInstanceOf(Date);
      expect(call.data).toEqual({ status: OpportunityStatus.ARCHIVED });
    });

    it('invalide le cache admin:stats seulement si au moins une opportunité a été archivée', async () => {
      mockPrisma.opportunity.updateMany.mockResolvedValueOnce({ count: 0 });
      await service.archiveExpiredOpportunities();
      expect(mockRedis.del).not.toHaveBeenCalledWith('admin:stats');

      jest.clearAllMocks();
      freshPrismaDefaults();
      mockPrisma.opportunity.updateMany.mockResolvedValueOnce({ count: 3 });
      await service.archiveExpiredOpportunities();
      expect(mockRedis.del).toHaveBeenCalledWith('admin:stats');
    });
  });

  // ─── expireReferralCodes ────────────────────────────────────────────────────

  describe('expireReferralCodes', () => {
    it('expire uniquement les codes ACTIVE créés il y a plus de 90 jours', async () => {
      await service.expireReferralCodes();

      const call = mockPrisma.referralCode.updateMany.mock.calls[0][0];
      expect(call.where.status).toBe(ReferralStatus.ACTIVE);
      const cutoff = call.where.createdAt.lt as Date;
      const daysAgo = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
      expect(daysAgo).toBeGreaterThan(89.9);
      expect(daysAgo).toBeLessThan(90.1);
      expect(call.data).toEqual({ status: ReferralStatus.EXPIRED });
    });
  });

  // ─── cleanupOrphanDrafts ────────────────────────────────────────────────────

  describe('cleanupOrphanDrafts', () => {
    it('soft-delete (deletedAt) les DRAFT non modifiés depuis 7 jours — jamais de hard delete', async () => {
      await service.cleanupOrphanDrafts();

      const call = mockPrisma.opportunity.updateMany.mock.calls[0][0];
      expect(call.where.status).toBe(OpportunityStatus.DRAFT);
      expect(call.where.deletedAt).toBeNull();
      const cutoff = call.where.updatedAt.lt as Date;
      const daysAgo = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
      expect(daysAgo).toBeGreaterThan(6.9);
      expect(daysAgo).toBeLessThan(7.1);
      // La donnée écrite est une date d'anonymisation (deletedAt), pas une suppression
      expect(call.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  // ─── recomputeTrendingScores ────────────────────────────────────────────────

  describe('recomputeTrendingScores', () => {
    it('applique la formule (likes*3 + apps*5 + saves*2 + views) / (âge_h + 2)^1.5', async () => {
      const createdAt = new Date(Date.now() - 10 * 3_600_000); // 10h ago
      mockPrisma.opportunity.findMany.mockResolvedValueOnce([
        {
          id: 'opp-1',
          likesCount: 2,
          applicationsCount: 1,
          savedCount: 3,
          viewsCount: 100,
          createdAt,
        },
      ]);

      await service.recomputeTrendingScores();

      expect(mockPrisma.opportunity.update).toHaveBeenCalledTimes(1);
      const call = mockPrisma.opportunity.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'opp-1' });

      const expectedScore = (2 * 3 + 1 * 5 + 3 * 2 + 100) / Math.pow(10 + 2, 1.5);
      expect(call.data.trendingScore).toBeCloseTo(expectedScore, 5);
    });

    it('ne plante pas et journalise sur Sentry si le calcul échoue pour un lot', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValueOnce([
        {
          id: 'opp-1',
          likesCount: 0,
          applicationsCount: 0,
          savedCount: 0,
          viewsCount: 0,
          createdAt: new Date(),
        },
      ]);
      mockPrisma.opportunity.update.mockRejectedValueOnce(new Error('constraint violation'));

      await expect(service.recomputeTrendingScores()).resolves.toBeUndefined();
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ tags: { cron: 'recomputeTrendingScores' } }),
      );
    });
  });

  // ─── cleanupExpiredTokens ───────────────────────────────────────────────────

  describe('cleanupExpiredTokens', () => {
    it('efface uniquement les tokens de vérification/reset expirés, jamais les tokens encore valides', async () => {
      await service.cleanupExpiredTokens();

      const [verifCall, resetCall] = mockPrisma.user.updateMany.mock.calls;
      expect(verifCall[0].where.emailVerificationTokenExpiry.lt).toBeInstanceOf(Date);
      expect(verifCall[0].data).toEqual({
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      });
      expect(resetCall[0].where.passwordResetExpiry.lt).toBeInstanceOf(Date);
      expect(resetCall[0].data).toEqual({ passwordResetToken: null, passwordResetExpiry: null });
    });
  });

  // ─── keepAlive ──────────────────────────────────────────────────────────────

  describe('keepAlive', () => {
    it('ping Prisma et Redis, et absorbe les erreurs sans planter', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('connection reset'));
      await expect(service.keepAlive()).resolves.toBeUndefined();
    });
  });
});
