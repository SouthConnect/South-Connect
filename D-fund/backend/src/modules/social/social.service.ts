import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service de gestion des fonctionnalités sociales
 * Gère les follows, likes et sauvegardes d'opportunités
 */
@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  /**
   * Suivre un utilisateur
   * @param followerId - ID de l'utilisateur qui suit
   * @param followingId - ID de l'utilisateur à suivre
   * @throws BadRequestException si l'utilisateur tente de se suivre lui-même
   * @throws ConflictException si la relation existe déjà
   * @throws NotFoundException si l'utilisateur à suivre n'existe pas
   */
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const following = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!following) {
      throw new NotFoundException('User to follow not found');
    }

    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Already following this user');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.follow.create({
        data: {
          followerId,
          followingId,
        },
      });

      const btoCProfile = await tx.btoCProfile.findUnique({
        where: { userId: followingId },
      });

      const btoBProfile = await tx.btoBProfile.findUnique({
        where: { userId: followingId },
      });

      if (btoCProfile) {
        await tx.btoCProfile.update({
          where: { userId: followingId },
          data: {
            followersCount: {
              increment: 1,
            },
          },
        });
      } else if (btoBProfile) {
        await tx.btoBProfile.update({
          where: { userId: followingId },
          data: {
            followersCount: {
              increment: 1,
            },
          },
        });
      }
    });

    return { message: 'User followed successfully' };
  }

  /**
   * Ne plus suivre un utilisateur
   * @param followerId - ID de l'utilisateur qui ne suit plus
   * @param followingId - ID de l'utilisateur à ne plus suivre
   * @throws NotFoundException si la relation n'existe pas
   */
  async unfollow(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      const btoCProfile = await tx.btoCProfile.findUnique({
        where: { userId: followingId },
      });

      const btoBProfile = await tx.btoBProfile.findUnique({
        where: { userId: followingId },
      });

      if (btoCProfile) {
        await tx.btoCProfile.update({
          where: { userId: followingId },
          data: {
            followersCount: {
              decrement: 1,
            },
          },
        });
      } else if (btoBProfile) {
        await tx.btoBProfile.update({
          where: { userId: followingId },
          data: {
            followersCount: {
              decrement: 1,
            },
          },
        });
      }
    });

    return { message: 'User unfollowed successfully' };
  }

  /**
   * Liste des followers d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Liste des utilisateurs qui suivent cet utilisateur
   */
  async getFollowers(userId: string) {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return followers.map((f) => f.follower);
  }

  /**
   * Liste des utilisateurs suivis par un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Liste des utilisateurs suivis
   */
  async getFollowing(userId: string) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return following.map((f) => f.following);
  }

  /**
   * Liker une opportunité
   * @param userId - ID de l'utilisateur qui like
   * @param opportunityId - ID de l'opportunité à liker
   * @throws ConflictException si l'opportunité est déjà likée
   * @throws NotFoundException si l'opportunité n'existe pas
   */
  async likeOpportunity(userId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const existing = await this.prisma.likedOpportunity.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Opportunity already liked');
    }

    await this.prisma.$transaction([
      this.prisma.likedOpportunity.create({
        data: {
          userId,
          opportunityId,
        },
      }),
      this.prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return { message: 'Opportunity liked successfully' };
  }

  /**
   * Retirer le like d'une opportunité
   * @param userId - ID de l'utilisateur
   * @param opportunityId - ID de l'opportunité
   * @throws NotFoundException si le like n'existe pas
   */
  async unlikeOpportunity(userId: string, opportunityId: string) {
    const liked = await this.prisma.likedOpportunity.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });

    if (!liked) {
      throw new NotFoundException('Like not found');
    }

    await this.prisma.$transaction([
      this.prisma.likedOpportunity.delete({
        where: {
          userId_opportunityId: {
            userId,
            opportunityId,
          },
        },
      }),
      this.prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
      }),
    ]);

    return { message: 'Opportunity unliked successfully' };
  }

  /**
   * Sauvegarder une opportunité
   * @param userId - ID de l'utilisateur
   * @param opportunityId - ID de l'opportunité à sauvegarder
   * @throws ConflictException si l'opportunité est déjà sauvegardée
   * @throws NotFoundException si l'opportunité n'existe pas
   */
  async saveOpportunity(userId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const existing = await this.prisma.savedOpportunity.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Opportunity already saved');
    }

    await this.prisma.$transaction([
      this.prisma.savedOpportunity.create({
        data: {
          userId,
          opportunityId,
        },
      }),
      this.prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          savedCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return { message: 'Opportunity saved successfully' };
  }

  /**
   * Retirer une opportunité des sauvegardes
   * @param userId - ID de l'utilisateur
   * @param opportunityId - ID de l'opportunité
   * @throws NotFoundException si la sauvegarde n'existe pas
   */
  async unsaveOpportunity(userId: string, opportunityId: string) {
    const saved = await this.prisma.savedOpportunity.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });

    if (!saved) {
      throw new NotFoundException('Saved opportunity not found');
    }

    await this.prisma.$transaction([
      this.prisma.savedOpportunity.delete({
        where: {
          userId_opportunityId: {
            userId,
            opportunityId,
          },
        },
      }),
      this.prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          savedCount: {
            decrement: 1,
          },
        },
      }),
    ]);

    return { message: 'Opportunity unsaved successfully' };
  }

  /**
   * Liste des opportunités sauvegardées par un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Liste des opportunités sauvegardées avec leurs détails
   */
  async getSavedOpportunities(userId: string) {
    const saved = await this.prisma.savedOpportunity.findMany({
      where: { userId },
      include: {
        opportunity: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return saved.map((s) => s.opportunity);
  }
}
