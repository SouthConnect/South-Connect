/**
 * Seed script: populates Industries and Markets reference tables.
 * Run once against the target database:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-ref-data.ts
 *
 * Idempotent — uses upsert so it can be re-run safely.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const INDUSTRIES = [
  'Agritech',
  'Cleantech & Energy',
  'E-commerce & Retail',
  'Education & Edtech',
  'Fintech & Payments',
  'Health & Medtech',
  'Hospitality & Tourism',
  'Impact & Social Enterprise',
  'Infrastructure & Logistics',
  'Legal & Compliance',
  'Manufacturing & Industry',
  'Media & Entertainment',
  'Mobility & Transport',
  'Non-profit & NGO',
  'PropTech & Real Estate',
  'SaaS & B2B Software',
  'Security & Cybersecurity',
  'Sports & Wellness',
  'Telecom & Connectivity',
]

const MARKETS = [
  'East Africa',
  'West Africa',
  'North Africa',
  'Central Africa',
  'Southern Africa',
  'Pan-Africa',
  'Europe',
  'North America',
  'Latin America',
  'Middle East',
  'South & Southeast Asia',
  'Global',
]

async function main() {
  console.log('Seeding industries…')
  for (const name of INDUSTRIES) {
    await prisma.industry.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    process.stdout.write('.')
  }
  console.log(`\n✓ ${INDUSTRIES.length} industries seeded`)

  console.log('Seeding markets…')
  for (const name of MARKETS) {
    await prisma.market.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    process.stdout.write('.')
  }
  console.log(`\n✓ ${MARKETS.length} markets seeded`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
