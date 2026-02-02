import { PrismaClient, UserRole, OpportunityType, OpportunityStatus, ApplicationStage } from '@prisma/client'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const RAW_DATA_PATH = path.join(__dirname, '../data/glide/raw')

async function migrate() {
  console.log('🚀 Starting migration...')

  try {
    // 1. Industries
    await migrateIndustries()
    
    // 2. Markets
    await migrateMarkets()
    
    // 3. Features
    await migrateFeatures()
    
    // 4. Users & Profiles
    await migrateUsers()
    
    // 5. Opportunities
    await migrateOpportunities()
    
    // 6. Applications
    await migrateApplications()

    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function migrateIndustries() {
  console.log('📦 Migrating Industries...')
  const fileContent = fs.readFileSync(path.join(RAW_DATA_PATH, 'Industries.csv'), 'utf-8')
  const records = parse(fileContent, { columns: true, skip_empty_lines: true })

  for (const record of records) {
    const name = record.Name || record.Industry
    if (!name) continue
    
    await prisma.industry.upsert({
      where: { name },
      update: {},
      create: {
        id: record['🔒 Row ID'] || record['Row ID'],
        name,
      }
    })
  }
}

async function migrateMarkets() {
  console.log('📦 Migrating Markets...')
  const fileContent = fs.readFileSync(path.join(RAW_DATA_PATH, 'Markets.csv'), 'utf-8')
  const records = parse(fileContent, { columns: true, skip_empty_lines: true })

  for (const record of records) {
    const name = record.Name || record.Market
    if (!name) continue

    await prisma.market.upsert({
      where: { name },
      update: {},
      create: {
        id: record['🔒 Row ID'] || record['Row ID'],
        name,
        image: record.Images || record.Image,
      }
    })
  }
}

async function migrateFeatures() {
  console.log('📦 Migrating Features...')
  const fileContent = fs.readFileSync(path.join(RAW_DATA_PATH, 'Features.csv'), 'utf-8')
  const records = parse(fileContent, { columns: true, skip_empty_lines: true })

  for (const record of records) {
    const name = record['Opportunity Name'] || record.Feature
    if (!name) continue

    await prisma.feature.upsert({
      where: { name },
      update: {},
      create: {
        id: record['🔒 Row ID'] || record['Row ID'],
        name,
        description: record.Description || record['Creator / Description'],
        category: record['Foreign Keys / Main Category'],
      }
    })
  }
}

async function migrateUsers() {
  console.log('📦 Migrating Users & Profiles...')
  const fileContent = fs.readFileSync(path.join(RAW_DATA_PATH, 'Users(1).csv'), 'utf-8')
  const records = parse(fileContent, { columns: true, skip_empty_lines: true })

  const btoBContent = fs.readFileSync(path.join(RAW_DATA_PATH, 'BtoB.csv'), 'utf-8')
  const btoBRecords = parse(btoBContent, { columns: true, skip_empty_lines: true })

  const btoCContent = fs.readFileSync(path.join(RAW_DATA_PATH, 'BtoC.csv'), 'utf-8')
  const btoCRecords = parse(btoCContent, { columns: true, skip_empty_lines: true })

  for (const record of records) {
    const email = record['Resume / Email'] || record.Email
    if (!email) continue

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id: record['🔒 Row ID'] || record['Row ID'],
        email,
        firstName: record['Resume / First Name'],
        lastName: record['Resume / Last Name'],
        name: record['Resume / Name'] || record.Name,
        role: record['Resume / Role'] === 'ADMIN' ? UserRole.ADMIN : UserRole.USER,
        profilePic: record['Resume / Profile Pic'] || record['BtoC Info / Profil pic'],
        city: record['Resume / City'],
        country: record['Resume / Country'],
        linkedinUrl: record['Resume / Linkedin Url'],
        createdAt: record['Resume / date creation'] ? new Date(record['Resume / date creation']) : new Date(),
      }
    })

    // BtoC Profile
    const btoCData = btoCRecords.find((r: any) => (r['Profile / Email'] || r.Email) === email)
    if (btoCData) {
      await prisma.btoCProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          description: btoCData['Profile / Bio'] || btoCData.Bio,
          tags: btoCData['Profile / Tags Displayed'] ? btoCData['Profile / Tags Displayed'].split(',').map((s: string) => s.trim()) : [],
          seniorityLevel: btoCData['Profile / Seniority Level'],
        }
      })
    }

    // BtoB Profile
    const btoBData = btoBRecords.find((r: any) => (r['Profile / Email'] || r.Email) === email)
    if (btoBData) {
      await prisma.btoBProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          companyName: btoBData['Profile / Company Name'] || btoBData.Name || 'Unknown Company',
          logo: btoBData['Profile / Logo'] || btoBData.Logo,
          description: btoBData['Profile / Description'] || btoBData.Description,
          developmentStage: btoBData['Profile / Development Stage'],
        }
      })
    }
  }
}

async function migrateOpportunities() {
  console.log('📦 Migrating Opportunities...')
  const fileContent = fs.readFileSync(path.join(RAW_DATA_PATH, 'Opportunities(1).csv'), 'utf-8')
  const records = parse(fileContent, { columns: true, skip_empty_lines: true })

  for (const record of records) {
    const ownerEmail = record['Foreign Keys / BtoC Owner Email'] || record['Owner Email']
    if (!ownerEmail) continue

    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } })
    if (!owner) continue

    const id = record['🔒 Row ID'] || record['Row ID']
    
    await prisma.opportunity.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: record['Offer / Opportunity Name'] || record.Name || 'Untitled Opportunity',
        punchline: record['Offer / Punchline'],
        description: record['Offer / Description'],
        type: (record['Offer / Type'] || record.Type) as OpportunityType || OpportunityType.JOB_OPPORTUNITY,
        status: (record['Offer / Publication Status'] || record.Status) as OpportunityStatus || OpportunityStatus.ACTIVE,
        ownerId: owner.id,
        city: record['Offer / City'],
        country: record['Offer / Country'],
        remote: record['Offer / Remote?'] === 'true' || record.Remote === 'true',
        image: record['Images / Image'] || record.Image,
        price: record['Pricing / Price'] ? parseFloat(record['Pricing / Price']) : undefined,
        currency: record['Pricing / Currency'],
        createdAt: record['Dates / Created Date'] ? new Date(record['Dates / Created Date']) : new Date(),
      }
    })
  }
}

async function migrateApplications() {
  console.log('📦 Migrating Applications...')
  const fileContent = fs.readFileSync(path.join(RAW_DATA_PATH, 'Applications(1).csv'), 'utf-8')
  const records = parse(fileContent, { columns: true, skip_empty_lines: true })

  for (const record of records) {
    const candidateEmail = record['Foreign Keys / email BtoC Candidate'] || record['Candidate Email']
    if (!candidateEmail) continue

    const candidate = await prisma.user.findUnique({ where: { email: candidateEmail } })
    if (!candidate) continue

    const opportunityId = record['Foreign Keys / Opportunity ID'] || record['Opportunity ID']
    if (!opportunityId) continue

    const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } })
    if (!opportunity) continue

    const id = record['🔒 Row ID'] || record['Row ID']

    await prisma.application.upsert({
      where: {
        opportunityId_candidateId: {
          opportunityId,
          candidateId: candidate.id
        }
      },
      update: {},
      create: {
        id,
        opportunityId,
        candidateId: candidate.id,
        goalLetter: record['Application / Goal Letter'] || record['Goal Letter'],
        stage: (record['Application Stage / Stage'] || record.Stage) as ApplicationStage || ApplicationStage.SUBMITTED,
        submissionDate: record['Application / Submission Date'] ? new Date(record['Application / Submission Date']) : new Date(),
      }
    })
  }
}

migrate()
