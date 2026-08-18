/**
 * Storage Controller — tests unitaires.
 *
 * Priorité : les branches d'autorisation sur upload/delete (plusieurs préfixes,
 * chacun avec sa propre règle d'ownership) — jamais testées jusqu'ici malgré
 * une logique de branchement non triviale, exactement le genre d'endroit où
 * une régression future passerait inaperçue.
 *
 * A révélé un vrai trou d'autorisation en écrivant ces tests : les préfixes
 * `applications` et `companies` (réellement utilisés côté frontend) ne
 * passaient par aucune vérification d'ownership faute de branche `else` de
 * repli — corrigé dans storage.controller.ts avant d'écrire les assertions
 * ci-dessous.
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';

const JPEG_MAGIC_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00]);

function makeFile(overrides: Partial<any> = {}) {
  return {
    mimetype: 'image/jpeg',
    buffer: JPEG_MAGIC_BYTES,
    size: 1024,
    ...overrides,
  };
}

describe('StorageController', () => {
  let controller: StorageController;
  let storageService: StorageService;
  const mockPrisma = { opportunity: { findUnique: jest.fn() } } as unknown as PrismaService;

  const owner = { id: 'user-owner' };
  const attacker = { id: 'user-attacker' };

  beforeEach(() => {
    // Real StorageService (Supabase client unconfigured — fine, we spy on the
    // two methods that would touch it, everything else is pure validation logic).
    const configService = { get: () => undefined } as unknown as ConfigService;
    storageService = new StorageService(configService);
    jest.spyOn(storageService, 'uploadFile').mockResolvedValue('https://cdn.example/fake.jpg');
    jest.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

    controller = new StorageController(storageService, mockPrisma);
    (mockPrisma.opportunity.findUnique as jest.Mock).mockReset();
  });

  // ─── POST /storage/upload ───────────────────────────────────────────────────

  describe('uploadFile — validation', () => {
    it('rejette une requête sans fichier', async () => {
      await expect(
        controller.uploadFile(undefined, owner, 'images', 'avatars', owner.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette un type de fichier non autorisé pour le bucket images', async () => {
      const file = makeFile({ mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
      await expect(
        controller.uploadFile(file, owner, 'images', 'avatars', owner.id),
      ).rejects.toThrow(/Invalid file type/);
    });

    it('accepte un PDF pour le bucket attachments', async () => {
      const file = makeFile({
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 rest of file'),
      });
      const res = await controller.uploadFile(file, owner, 'attachments', 'applications', owner.id);
      expect(res.url).toBeTruthy();
    });

    it('rejette un fichier dont le contenu réel ne correspond pas au type déclaré (spoofing MIME)', async () => {
      const file = makeFile({ mimetype: 'image/jpeg', buffer: Buffer.from('not actually a jpeg') });
      await expect(
        controller.uploadFile(file, owner, 'images', 'avatars', owner.id),
      ).rejects.toThrow(/does not match its declared type/);
    });

    it('rejette un fichier dépassant 5 Mo', async () => {
      const file = makeFile({ size: 6 * 1024 * 1024 });
      await expect(
        controller.uploadFile(file, owner, 'images', 'avatars', owner.id),
      ).rejects.toThrow(/5 MB/);
    });

    it('rejette une requête sans prefix ni resourceId', async () => {
      await expect(controller.uploadFile(makeFile(), owner, 'images')).rejects.toThrow(
        /prefix and resourceId are required/,
      );
    });
  });

  describe('uploadFile — ownership par préfixe', () => {
    it.each(['avatars', 'covers', 'profile', 'attachments'])(
      "prefix '%s' : autorise l'upload dans son propre namespace",
      async (prefix) => {
        const res = await controller.uploadFile(makeFile(), owner, 'images', prefix, owner.id);
        expect(res.url).toBeTruthy();
        expect(storageService.uploadFile).toHaveBeenCalled();
      },
    );

    it.each(['avatars', 'covers', 'profile', 'attachments'])(
      "prefix '%s' : refuse l'upload dans le namespace d'un autre utilisateur",
      async (prefix) => {
        await expect(
          controller.uploadFile(makeFile(), attacker, 'images', prefix, owner.id),
        ).rejects.toThrow(ForbiddenException);
        expect(storageService.uploadFile).not.toHaveBeenCalled();
      },
    );

    it("prefix 'applications' (utilisé par la page candidature) : refuse le namespace d'un autre utilisateur", async () => {
      // Régression du trou d'autorisation trouvé : avant le correctif, ce préfixe
      // ne passait par aucune vérification et cette requête aurait réussi.
      await expect(
        controller.uploadFile(makeFile(), attacker, 'attachments', 'applications', owner.id),
      ).rejects.toThrow(ForbiddenException);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it("prefix 'companies' (utilisé par le profil entreprise) : refuse le namespace d'un autre utilisateur", async () => {
      await expect(
        controller.uploadFile(makeFile(), attacker, 'images', 'companies', owner.id),
      ).rejects.toThrow(ForbiddenException);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('prefix inconnu/non listé : rejeté explicitement plutôt que silencieusement autorisé', async () => {
      await expect(
        controller.uploadFile(makeFile(), attacker, 'images', 'some-future-prefix', owner.id),
      ).rejects.toThrow(ForbiddenException);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it("prefix 'opportunities' : autorise le propriétaire réel de l'opportunité", async () => {
      (mockPrisma.opportunity.findUnique as jest.Mock).mockResolvedValueOnce({
        ownerId: owner.id,
      });
      const res = await controller.uploadFile(
        makeFile(),
        owner,
        'images',
        'opportunities',
        'opp-1',
      );
      expect(res.url).toBeTruthy();
    });

    it("prefix 'opportunities' : refuse un utilisateur qui n'est pas le propriétaire", async () => {
      (mockPrisma.opportunity.findUnique as jest.Mock).mockResolvedValueOnce({
        ownerId: owner.id,
      });
      await expect(
        controller.uploadFile(makeFile(), attacker, 'images', 'opportunities', 'opp-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it("prefix 'opportunities' : refuse si l'opportunité n'existe pas (évite de fuiter son existence via 500)", async () => {
      (mockPrisma.opportunity.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        controller.uploadFile(makeFile(), attacker, 'images', 'opportunities', 'ghost-opp'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── DELETE /storage/file ───────────────────────────────────────────────────

  describe('deleteFile', () => {
    it('rejette une requête sans bucket ni path', async () => {
      await expect(controller.deleteFile('', '', owner)).rejects.toThrow(BadRequestException);
    });

    it('rejette un bucket non autorisé', async () => {
      await expect(
        controller.deleteFile('not-a-real-bucket', `avatars/${owner.id}/1-a.jpg`, owner),
      ).rejects.toThrow(/Invalid bucket/);
    });

    it.each(['avatars/../../etc/passwd', 'avatars//double-slash', 'avatars/<script>'])(
      'rejette un path suspect : %s',
      async (path) => {
        await expect(controller.deleteFile('avatars', path, owner)).rejects.toThrow(
          /Invalid path format/,
        );
      },
    );

    it('autorise la suppression de son propre fichier (avatars/{userId}/...)', async () => {
      const res = await controller.deleteFile('avatars', `avatars/${owner.id}/123-abc.jpg`, owner);
      expect(res.message).toBe('File deleted successfully');
      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'avatars',
        `avatars/${owner.id}/123-abc.jpg`,
      );
    });

    it("refuse de supprimer le fichier d'un autre utilisateur", async () => {
      await expect(
        controller.deleteFile('avatars', `avatars/${owner.id}/123-abc.jpg`, attacker),
      ).rejects.toThrow(ForbiddenException);
      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it("prefix 'opportunities' : autorise le propriétaire de l'opportunité à supprimer", async () => {
      (mockPrisma.opportunity.findUnique as jest.Mock).mockResolvedValueOnce({
        ownerId: owner.id,
      });
      const res = await controller.deleteFile('images', 'opportunities/opp-1/123-abc.jpg', owner);
      expect(res.message).toBe('File deleted successfully');
    });

    it("prefix 'opportunities' : refuse un utilisateur qui n'est pas le propriétaire", async () => {
      (mockPrisma.opportunity.findUnique as jest.Mock).mockResolvedValueOnce({
        ownerId: owner.id,
      });
      await expect(
        controller.deleteFile('images', 'opportunities/opp-1/123-abc.jpg', attacker),
      ).rejects.toThrow(ForbiddenException);
    });

    it("prefix 'applications' : refuse un utilisateur qui n'est pas propriétaire du fichier (couvert par le fallback générique)", async () => {
      await expect(
        controller.deleteFile('attachments', `applications/${owner.id}/123-abc.pdf`, attacker),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
