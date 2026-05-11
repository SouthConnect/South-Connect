/**
 * Types partagés frontend — alignés sur le schéma Prisma backend.
 *
 * Ces interfaces remplacent les `any` sur les données venant de l'API.
 * Règle : si l'API renvoie un objet, il doit avoir un type ici.
 */

// ---------------------------------------------------------------------------
// Enums (miroir des enums Prisma)
// ---------------------------------------------------------------------------

export type OpportunityStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'ARCHIVED' | 'CLOSED'

export type OpportunityType =
  | 'JOB_OPPORTUNITY'
  | 'TALENT_PROFILE'
  | 'CO_FOUNDER_OPPORTUNITY'
  | 'CO_FOUNDER_PROFILE'
  | 'BUSINESS_IDEA'
  | 'SUPPORT_OFFER'
  | 'SERVICE_LISTING'
  | 'SERVICE_REQUEST'
  | 'DEAL_FLOW'
  | 'INVESTOR_THESIS'
  | 'INVESTOR_PROFILE'
  | 'FUNDING_OPPORTUNITY'
  | 'EVENT'
  | 'CALL_FOR_STARTUPS'
  | 'MENTORSHIP_BA_OFFER'
  | 'PROJECT_SEEKING_SUPPORT'
  | 'VENTURE_PROGRAM'
  | 'CHILL_WORK_SPOT'
  | 'MARKET_ADVISOR'

export type ApplicationStage =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'OWNER_REVIEW'
  | 'READY_TO_SUBMIT'
  | 'SUCCESS'
  | 'ARCHIVED'

export type UserRole = 'USER' | 'ADMIN'

export type DiscussionType = 'OPEN_FORUM' | 'OPPORTUNITY_RELATED'

// ---------------------------------------------------------------------------
// Entités principales
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  role: UserRole
  profilePic?: string
  isEmailVerified?: boolean
}

export interface OpportunityOwner {
  id: string
  name?: string
  profilePic?: string
}

export interface Opportunity {
  id: string
  name: string
  punchline?: string
  description?: string
  type: OpportunityType
  status: OpportunityStatus
  ownerId: string
  owner?: OpportunityOwner
  city?: string
  country?: string
  region?: string
  remote?: boolean
  image?: string
  backgroundImage?: string
  url?: string
  tags: string[]
  industries?: string[]
  markets?: string[]
  price?: number
  currency?: string
  pricingUnit?: string
  pricingDetails?: string
  startDate?: string
  endDate?: string
  expirationDate?: string
  referralAvailable: boolean
  referralAmount?: number
  boosted: boolean
  qualified: boolean
  likesCount: number
  savedCount: number
  applicationsCount: number
  messagesCount?: number
  isLiked?: boolean
  isSaved?: boolean
  createdAt: string
  updatedAt: string
  // Relations incluses selon les endpoints
  _count?: {
    applications: number
    likedBy: number
    savedBy: number
  }
}

export interface OpportunityListResponse {
  data: Opportunity[]
  total: number
  hasMore: boolean
}

export interface ApplicationCandidate {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  profilePic?: string
  city?: string
  country?: string
  bio?: string
}

export interface Application {
  id: string
  opportunityId: string
  opportunity?: Pick<Opportunity, 'id' | 'name' | 'punchline' | 'image'>
  candidateId: string
  candidate?: ApplicationCandidate
  title?: string
  goalLetter?: string
  externalLink?: string
  externalLink2?: string
  stage: ApplicationStage
  submissionDate?: string
  reviewDate?: string
  reviewFeedback?: string
  feedbackTitle?: string
  referralCodeUsed?: string
  attachmentUrl?: string
  isDraft: boolean
  isClosed: boolean
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body?: string
  link?: string
  isRead: boolean
  createdAt: string
}

export interface PrivateDiscussion {
  id: string
  participants: Participant[]
  lastMessageAt?: string
  createdAt: string
  updatedAt: string
  // Preview of the last message (included in inbox list endpoint)
  messages?: Pick<Message, 'content' | 'senderId' | 'createdAt'>[]
}

export interface PublicDiscussion {
  id: string
  title: string
  description?: string
  image?: string
  type: DiscussionType
  ownerId: string
  opportunityId?: string
  opportunity?: Pick<Opportunity, 'id' | 'name' | 'image'>
  messagesCount: number
  membersCount: number
  likesCount: number
  lastMessageAt?: string
  createdAt: string
}

export interface Participant {
  id: string
  userId: string
  user?: Pick<AuthUser, 'id' | 'name' | 'profilePic'>
  discussionId: string
  unreadCount: number
  joinedAt: string
}

export interface Message {
  id: string
  content: string
  senderId: string
  sender?: Pick<AuthUser, 'id' | 'name' | 'profilePic'>
  privateDiscussionId?: string
  publicDiscussionId?: string
  createdAt: string
}

export interface BtoCProfile {
  id: string
  userId: string
  description?: string
  tags: string[]
  industries: string[]
  seniorityLevel?: string
  lookingForOpportunities: boolean
  followersCount: number
}

export interface BtoBProfile {
  id: string
  userId: string
  companyName: string
  logo?: string
  punchline?: string
  description?: string
  developmentStage?: string
  website?: string
  linkedinUrl?: string
  country?: string
  followersCount: number
}

export type TaskStatus = 'TODO' | 'WORKING_ON_IT' | 'IDEA' | 'DONE'

export interface Task {
  id: string
  userId: string
  name: string
  description?: string
  status: TaskStatus
  dueDate?: string
  url?: string
  relatedItemId?: string
  relatedItemType?: string
  createdAt: string
  updatedAt: string
}

export interface CreateOpportunityData {
  name: string
  type: OpportunityType
  punchline?: string
  description?: string
  status?: OpportunityStatus
  city?: string
  country?: string
  region?: string
  remote?: boolean
  startDate?: string
  endDate?: string
  expirationDate?: string
  tags?: string[]
  industries?: string[]
  markets?: string[]
  url?: string
  image?: string
  backgroundImage?: string
  price?: number
  currency?: string
  pricingUnit?: string
  pricingDetails?: string
}

export interface UserProfile {
  user: AuthUser & {
    city?: string
    country?: string
    linkedinUrl?: string
    website?: string
    bio?: string
    visibility: boolean
  }
  btoCProfile?: BtoCProfile
  btoBProfile?: BtoBProfile
}
