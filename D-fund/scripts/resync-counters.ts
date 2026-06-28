/**
 * One-shot resync of all denormalized counters.
 * À lancer après un import CSV ou un db push qui aurait vidé les compteurs.
 * Usage: npm run db:resync (depuis la racine du monorepo)
 */
import { PrismaClient, OpportunityStatus } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

// Utilise la connexion directe (bypass pooler) pour éviter "max clients reached"
// quand le backend tourne en parallèle et sature les 15 connexions du session pooler.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
})

async function resync() {
  console.log('🔄 Resync des compteurs...\n')

  // ── 1. Compteurs profil (opportunitiesCount, activeOpportunitiesCount) ──────
  console.log('📊 Profils — opportunitiesCount...')
  const [totalGroups, activeGroups, profileUsers] = await Promise.all([
    prisma.opportunity.groupBy({ by: ['ownerId'], _count: { _all: true } }),
    prisma.opportunity.groupBy({
      by: ['ownerId'],
      where: { status: OpportunityStatus.ACTIVE },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { OR: [{ btoCProfile: { isNot: null } }, { btoBProfile: { isNot: null } }] },
      select: { id: true },
    }),
  ])

  const totalMap  = new Map(totalGroups.map((r) => [r.ownerId, r._count._all]))
  const activeMap = new Map(activeGroups.map((r) => [r.ownerId, r._count._all]))

  for (const { id } of profileUsers) {
    await prisma.btoCProfile.updateMany({
      where: { userId: id },
      data: {
        opportunitiesCount:       totalMap.get(id) ?? 0,
        activeOpportunitiesCount: activeMap.get(id) ?? 0,
      },
    })
    await prisma.btoBProfile.updateMany({
      where: { userId: id },
      data: { opportunitiesCount: totalMap.get(id) ?? 0 },
    })
  }
  console.log(`   → ${profileUsers.length} profils mis à jour`)

  // ── 2. followersCount ────────────────────────────────────────────────────────
  console.log('👥 followersCount...')
  const followGroups = await prisma.follow.groupBy({
    by: ['followingId'],
    _count: { _all: true },
  })
  const followMap = new Map(followGroups.map((r) => [r.followingId, r._count._all]))

  for (const { id } of profileUsers) {
    await prisma.btoCProfile.updateMany({
      where: { userId: id },
      data: { followersCount: followMap.get(id) ?? 0 },
    })
    await prisma.btoBProfile.updateMany({
      where: { userId: id },
      data: { followersCount: followMap.get(id) ?? 0 },
    })
  }
  console.log(`   → ${profileUsers.length} profils mis à jour`)

  // ── 3. Compteurs opportunités (likesCount, savedCount, applicationsCount) ───
  console.log('🎯 Opportunités — likes / saves / applications...')
  const [likeGroups, saveGroups, appGroups] = await Promise.all([
    prisma.likedOpportunity.groupBy({ by: ['opportunityId'], _count: { _all: true } }),
    prisma.savedOpportunity.groupBy({ by: ['opportunityId'], _count: { _all: true } }),
    prisma.application.groupBy({
      by: ['opportunityId'],
      where: { isDraft: false },
      _count: { _all: true },
    }),
  ])

  const likesMap = new Map(likeGroups.map((r) => [r.opportunityId, r._count._all]))
  const savesMap = new Map(saveGroups.map((r) => [r.opportunityId, r._count._all]))
  const appsMap  = new Map(appGroups.map((r)  => [r.opportunityId, r._count._all]))

  const allIds = [...new Set([...likesMap.keys(), ...savesMap.keys(), ...appsMap.keys()])]

  for (const oppId of allIds) {
    await prisma.opportunity.updateMany({
      where: { id: oppId },
      data: {
        likesCount:        likesMap.get(oppId) ?? 0,
        savedCount:        savesMap.get(oppId) ?? 0,
        applicationsCount: appsMap.get(oppId)  ?? 0,
      },
    })
  }
  console.log(`   → ${allIds.length} opportunités mises à jour`)

  console.log('\n✅ Resync terminé !')
}

resync()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
