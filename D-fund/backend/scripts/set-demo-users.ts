import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Récupère quelques utilisateurs avec leurs données liées pour choisir des comptes de démo pertinents
  const users = await prisma.user.findMany({
    take: 20,
    orderBy: { createdAt: 'asc' },
    include: {
      opportunities: true,
      applications: true,
      btoCProfile: true,
      btoBProfile: true,
    },
  })

  if (!users.length) {
    console.log('No users found in database.')
    return
  }

  // On essaie d’avoir un "owner" (qui a des opportunités) et un "candidate" (qui a des candidatures)
  const ownerCandidate =
    users.find((u) => u.opportunities.length > 0) ?? users[0]
  const appCandidate =
    users.find((u) => u.applications.length > 0 && u.id !== ownerCandidate.id) ??
    users.find((u) => u.id !== ownerCandidate.id) ??
    ownerCandidate

  const ownerPassword = 'DemoOwner123!'
  const candidatePassword = 'DemoUser123!'

  const [ownerHash, candidateHash] = await Promise.all([
    bcrypt.hash(ownerPassword, 10),
    bcrypt.hash(candidatePassword, 10),
  ])

  const updates: string[] = []

  await prisma.user.update({
    where: { id: ownerCandidate.id },
    data: { password: ownerHash },
  })
  updates.push(
    `Owner demo user: email=${ownerCandidate.email}, id=${ownerCandidate.id}, password=${ownerPassword}`,
  )

  if (appCandidate.id !== ownerCandidate.id) {
    await prisma.user.update({
      where: { id: appCandidate.id },
      data: { password: candidateHash },
    })
    updates.push(
      `Candidate demo user: email=${appCandidate.email}, id=${appCandidate.id}, password=${candidatePassword}`,
    )
  }

  console.log('\n✅ Demo users updated successfully:\n')
  for (const line of updates) {
    console.log(`- ${line}`)
  }
  console.log(
    '\nYou can now use these credentials on /login to test the full flows.\n',
  )
}

main()
  .catch((err) => {
    console.error('Error while setting demo users', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

