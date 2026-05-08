import { PrismaClient, UserRole, OpportunityType, OpportunityStatus, ApplicationStage } from '@prisma/client'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const RAW_DATA_PATH = path.join(__dirname, '../data/glide/raw')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps Glide feature names (from Features.csv) to Prisma OpportunityType enum values.
 * Feature names are the exact strings in the "Opportunity Name" column of Features.csv.
 */
const FEATURE_NAME_TO_TYPE: Record<string, OpportunityType> = {
  'Talent Profile':          OpportunityType.TALENT_PROFILE,
  'Job Opportunity':         OpportunityType.JOB_OPPORTUNITY,
  'Co-founder Profile':      OpportunityType.CO_FOUNDER_PROFILE,
  'Co-founder Opportunity':  OpportunityType.CO_FOUNDER_OPPORTUNITY,
  'Project Seeking Support': OpportunityType.PROJECT_SEEKING_SUPPORT,
  'Mentorship/BA Offer':     OpportunityType.MENTORSHIP_BA_OFFER,
  'Business Idea':           OpportunityType.BUSINESS_IDEA,
  'Support Offer':           OpportunityType.SUPPORT_OFFER,
  'Service Listing':         OpportunityType.SERVICE_LISTING,
  'Service Request':         OpportunityType.SERVICE_REQUEST,
  'Deal Flow Listing':       OpportunityType.DEAL_FLOW,
  'Investor Thesis':         OpportunityType.INVESTOR_THESIS,
  'Investor Profile':        OpportunityType.INVESTOR_PROFILE,
  'Funding Opportunity':     OpportunityType.FUNDING_OPPORTUNITY,
  'Chill & Work Spot':       OpportunityType.CHILL_WORK_SPOT,
  'Event':                   OpportunityType.EVENT,
  'Call for Startups':       OpportunityType.CALL_FOR_STARTUPS,
  'Market Advisor':          OpportunityType.MARKET_ADVISOR,
  'Venture Program':         OpportunityType.VENTURE_PROGRAM,
}

/**
 * Maps the Glide "Publication Status" string values (case-insensitive) to
 * the Prisma OpportunityStatus enum. Glide uses title-case ("Active", "Draft"),
 * Prisma requires ALL_CAPS ("ACTIVE", "DRAFT").
 */
function parseStatus(raw: string | undefined): OpportunityStatus {
  switch ((raw || '').trim().toUpperCase()) {
    case 'ACTIVE':   return OpportunityStatus.ACTIVE
    case 'DRAFT':    return OpportunityStatus.DRAFT
    case 'PENDING':  return OpportunityStatus.PENDING
    case 'ARCHIVED': return OpportunityStatus.ARCHIVED
    case 'CLOSED':   return OpportunityStatus.CLOSED
    default:         return OpportunityStatus.ACTIVE
  }
}

/**
 * Safely parses a float from a CSV string. Returns undefined if the value is
 * empty or not a valid number.
 */
function parseFloat_(s: string | undefined): number | undefined {
  if (!s || s.trim() === '') return undefined
  const n = Number(s.replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? undefined : n
}

/**
 * Safely parses a date. Returns undefined if the value is empty or invalid.
 */
function parseDate(s: string | undefined): Date | undefined {
  if (!s || s.trim() === '') return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d
}

/**
 * Extracts the city from "Offer / City, Country" combined column.
 * e.g. "Paris, France" → "Paris", "Remote, Global" → "Remote"
 */
function extractCity(combined: string | undefined): string | undefined {
  if (!combined || combined.trim() === '') return undefined
  const parts = combined.split(',')
  return parts[0].trim() || undefined
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function migrate() {
  console.log('🚀 Starting migration...')

  try {
    await migrateIndustries()
    await migrateMarkets()
    await migrateFeatures()
    await migrateUsers()
    await migrateOpportunities()
    await migrateApplications()

    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// ---------------------------------------------------------------------------
// Industries
// ---------------------------------------------------------------------------

async function migrateIndustries() {
  console.log('📦 Migrating Industries...')
  const records = parseCsv('Industries.csv')

  for (const record of records) {
    const name = record.Name || record.Industry
    if (!name) continue

    await prisma.industry.upsert({
      where: { name },
      update: {},
      create: {
        id: record['🔒 Row ID'] || record['Row ID'],
        name,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Markets
// ---------------------------------------------------------------------------

async function migrateMarkets() {
  console.log('📦 Migrating Markets...')
  const records = parseCsv('Markets.csv')

  for (const record of records) {
    const name = record.Name || record.Market
    if (!name) continue

    await prisma.market.upsert({
      where: { name },
      update: { image: record.Images || record.Image },
      create: {
        id: record['🔒 Row ID'] || record['Row ID'],
        name,
        image: record.Images || record.Image,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

async function migrateFeatures() {
  console.log('📦 Migrating Features...')
  const records = parseCsv('Features.csv')

  for (const record of records) {
    const name = record['Opportunity Name'] || record.Feature
    if (!name) continue

    await prisma.feature.upsert({
      where: { name },
      update: {
        description: record['Creator / Description'] || record.Description,
        category: record['Foreign Keys / Main Category'],
        seekerName: record['Seeker / Name '] || record['Seeker / Name'],
        creatorName: record['Creator / Name'],
      },
      create: {
        id: record['🔒 Row ID'] || record['Row ID'],
        name,
        description: record['Creator / Description'] || record.Description,
        category: record['Foreign Keys / Main Category'],
        seekerName: record['Seeker / Name '] || record['Seeker / Name'],
        creatorName: record['Creator / Name'],
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Users & Profiles
// ---------------------------------------------------------------------------

async function migrateUsers() {
  console.log('📦 Migrating Users & Profiles...')
  const records    = parseCsv('Users(1).csv')
  const btoBRecords = parseCsv('BtoB.csv')
  const btoCRecords = parseCsv('BtoC.csv')

  for (const record of records) {
    const email = record['Resume / Email'] || record.Email
    if (!email) continue

    const firstName = record['Resume / First Name'] || ''
    const lastName  = record['Resume / Last Name']  || ''
    // "Resume / Name" column doesn't exist in the CSV — construct from first + last
    const name = `${firstName} ${lastName}`.trim() || email.split('@')[0]

    const profilePic = record['Resume / Profile Pic'] || record['BtoC Info / Profil pic'] || undefined

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        name,
        profilePic,
        city:        record['Resume / City']        || undefined,
        country:     record['Resume / Country']     || undefined,
        linkedinUrl: record['Resume / Linkedin Url'] || undefined,
      },
      create: {
        id:          record['🔒 Row ID'] || record['Row ID'],
        email,
        firstName,
        lastName,
        name,
        role:        record['Resume / Role'] === 'ADMIN' ? UserRole.ADMIN : UserRole.USER,
        profilePic,
        city:        record['Resume / City']        || undefined,
        country:     record['Resume / Country']     || undefined,
        linkedinUrl: record['Resume / Linkedin Url'] || undefined,
        isEmailVerified: true, // CSV users are pre-verified
        createdAt:   parseDate(record['Resume / date creation']) ?? new Date(),
      },
    })

    // BtoC Profile
    // Email FK in BtoC.csv is "Foreign Keys / User email" (also "Profile / Email" as alias)
    const btoCData = btoCRecords.find(
      (r: any) => (r['Foreign Keys / User email'] || r['Profile / Email']) === email,
    )
    if (btoCData) {
      const btoCTags = btoCData['Profile / Tags Displayed']
        ? btoCData['Profile / Tags Displayed'].split(',').map((s: string) => s.trim()).filter(Boolean)
        : []
      await prisma.btoCProfile.upsert({
        where: { userId: user.id },
        update: {
          description:    btoCData['Profile / Bio'] || btoCData['Profile / Description'] || undefined,
          seniorityLevel: btoCData['Profile / Seniority Level'] || undefined,
          tags:           btoCTags,
        },
        create: {
          userId:         user.id,
          description:    btoCData['Profile / Bio'] || btoCData['Profile / Description'] || undefined,
          tags:           btoCTags,
          seniorityLevel: btoCData['Profile / Seniority Level'] || undefined,
        },
      })
    }

    // BtoB Profile
    // Email FK in BtoB.csv is "Foreign Keys / BtoC Email"
    const btoBData = btoBRecords.find(
      (r: any) => r['Foreign Keys / BtoC Email'] === email,
    )
    if (btoBData) {
      await prisma.btoBProfile.upsert({
        where: { userId: user.id },
        update: {
          companyName:      btoBData['Profile / Company Name'] || 'Unknown Company',
          logo:             btoBData['Visuals & Documents / Logo'] || undefined,
          description:      btoBData['Profile / Long Description'] || btoBData['Profile / Aggregator copy'] || undefined,
          punchline:        btoBData['Profile / Punchline'] || undefined,
          developmentStage: btoBData['Profile / Development Stage'] || undefined,
          website:          btoBData['Profile / Website'] || undefined,
          linkedinUrl:      btoBData['Profile / LinkedIn'] || undefined,
          country:          btoBData['Profile / Country'] || undefined,
        },
        create: {
          userId:           user.id,
          companyName:      btoBData['Profile / Company Name'] || 'Unknown Company',
          logo:             btoBData['Visuals & Documents / Logo'] || undefined,
          description:      btoBData['Profile / Long Description'] || btoBData['Profile / Aggregator copy'] || undefined,
          punchline:        btoBData['Profile / Punchline'] || undefined,
          developmentStage: btoBData['Profile / Development Stage'] || undefined,
          website:          btoBData['Profile / Website'] || undefined,
          linkedinUrl:      btoBData['Profile / LinkedIn'] || undefined,
          country:          btoBData['Profile / Country'] || undefined,
        },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

async function migrateOpportunities() {
  console.log('📦 Migrating Opportunities...')
  const records = parseCsv('Opportunities(1).csv')

  // Build featureId → OpportunityType lookup from Features.csv
  const featureRecords = parseCsv('Features.csv')
  const featureTypeMap: Record<string, OpportunityType> = {}
  for (const f of featureRecords) {
    const featureId   = f['🔒 Row ID'] || f['Row ID']
    const featureName = f['Opportunity Name'] || f.Feature
    if (featureId && featureName && FEATURE_NAME_TO_TYPE[featureName]) {
      featureTypeMap[featureId] = FEATURE_NAME_TO_TYPE[featureName]
    }
  }

  let imported = 0
  let skipped  = 0

  for (const record of records) {
    const ownerEmail = record['Foreign Keys / BtoC Owner Email'] || record['Owner Email']
    if (!ownerEmail) { skipped++; continue }

    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } })
    if (!owner) { skipped++; continue }

    const id = record['🔒 Row ID'] || record['Row ID']
    if (!id) { skipped++; continue }

    // Resolve type from feature ID → feature name → enum
    const featureId = record['Foreign Keys / Feature ID']
    const type: OpportunityType = featureTypeMap[featureId] ?? OpportunityType.JOB_OPPORTUNITY

    // Normalize status: Glide uses title-case ("Active"), Prisma needs ALL_CAPS ("ACTIVE")
    const status = parseStatus(record['Offer / Publication Status'] || record.Status)

    // Location: separate country column exists; city is embedded in the combined field
    const city    = extractCity(record['Offer / City, Country']) || undefined
    const country = record['Offer / Country'] || undefined
    const region  = record['Offer / Region'] || undefined

    // Tags: comma-separated string
    const tags = record['Overview / Tags']
      ? record['Overview / Tags'].split(',').map((s: string) => s.trim()).filter(Boolean)
      : []

    const data = {
      name:            record['Offer / Opportunity Name'] || record.Name || 'Untitled Opportunity',
      punchline:       record['Offer / Punchline'] || undefined,
      description:     record['Offer / Description'] || undefined,
      type,
      status,
      ownerId:         owner.id,
      city,
      country,
      region,
      remote:          record['Offer / Remote?']?.toLowerCase() === 'true',
      image:           record['Images / Image to use PP'] || record['Images / Image'] || undefined,
      backgroundImage: record['Images / Background to use'] || record['Images / Background'] || undefined,
      url:             record['Offer / URL'] || record['Offer / Extra URL'] || undefined,
      tags,
      price:           parseFloat_(record['Offer / Price'] || record['Pricing / Price']),
      currency:        record['Pricing / Currency'] || undefined,
      pricingUnit:     record['Pricing / Unit'] || undefined,
      pricingDetails:  record['Pricing / Details'] || undefined,
      startDate:       parseDate(record['Offer / Start Date']),
      endDate:         parseDate(record['Offer / End Date']),
      expirationDate:  parseDate(record['Dates / Expiration Date']),
      referralAvailable: record['Referral / Is available?']?.toLowerCase() === 'true',
      referralAmount:  parseFloat_(record['Referral / Amount']),
      needToCheckApplicant: record['Offer / Need to check applicant?']?.toLowerCase() === 'true',
      // Use the correct column name — Glide uses "Dates / Create Date" (not "Created Date")
      createdAt:       parseDate(record['Dates / Create Date']) ?? new Date(),
    }

    await prisma.opportunity.upsert({
      where: { id },
      // Update type + status on re-runs so existing bad data gets corrected
      update: {
        type:   data.type,
        status: data.status,
        name:   data.name,
        punchline:   data.punchline,
        description: data.description,
        image:       data.image,
        backgroundImage: data.backgroundImage,
        tags,
        city,
        country,
        region,
      },
      create: { id, ...data },
    })

    imported++
  }

  console.log(`   → ${imported} imported / ${skipped} skipped (missing owner or ID)`)
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

async function migrateApplications() {
  console.log('📦 Migrating Applications...')
  const records = parseCsv('Applications(1).csv')

  let imported = 0
  let skipped  = 0

  for (const record of records) {
    const candidateEmail = record['Foreign Keys / email BtoC Candidate'] || record['Candidate Email']
    if (!candidateEmail) { skipped++; continue }

    const candidate = await prisma.user.findUnique({ where: { email: candidateEmail } })
    if (!candidate) { skipped++; continue }

    const opportunityId = record['Foreign Keys / Opportunity ID'] || record['Opportunity ID']
    if (!opportunityId) { skipped++; continue }

    const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } })
    if (!opportunity) { skipped++; continue }

    const id = record['🔒 Row ID'] || record['Row ID']

    // Normalize ApplicationStage
    const rawStage = (record['Application Stage / Stage'] || record.Stage || '').trim().toUpperCase()
    const stageMap: Record<string, ApplicationStage> = {
      DRAFT:          ApplicationStage.DRAFT,
      SUBMITTED:      ApplicationStage.SUBMITTED,
      OWNER_REVIEW:   ApplicationStage.OWNER_REVIEW,
      READY_TO_SUBMIT: ApplicationStage.READY_TO_SUBMIT,
      SUCCESS:        ApplicationStage.SUCCESS,
      ARCHIVED:       ApplicationStage.ARCHIVED,
    }
    const stage = stageMap[rawStage] ?? ApplicationStage.SUBMITTED

    await prisma.application.upsert({
      where: {
        opportunityId_candidateId: { opportunityId, candidateId: candidate.id },
      },
      update: { stage },
      create: {
        id,
        opportunityId,
        candidateId:    candidate.id,
        goalLetter:     record['Application / Goal Letter'] || record['Goal Letter'] || undefined,
        stage,
        submissionDate: parseDate(record['Application / Submission Date']) ?? new Date(),
        isDraft:        stage === ApplicationStage.DRAFT,
      },
    })

    imported++
  }

  console.log(`   → ${imported} imported / ${skipped} skipped`)
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function parseCsv(filename: string): any[] {
  const filePath = path.join(RAW_DATA_PATH, filename)
  const content  = fs.readFileSync(filePath, 'utf-8')
  return parse(content, { columns: true, skip_empty_lines: true, trim: true })
}

migrate()
