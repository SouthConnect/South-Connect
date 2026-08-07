/**
 * Centralized React Query key factory.
 *
 * RULE: never write inline string[] queryKeys anywhere else in the codebase.
 * Always use these factory functions so that:
 *   - invalidations always target exactly the right cache entry
 *   - user-specific keys are always parameterized (prevents cross-user cache leaks)
 *   - renaming a key is a single-file change caught by TypeScript
 *
 * For broad prefix-based invalidation (clear ALL queries of a type), use
 * the `_root` arrays. React Query matches all queries whose key starts with
 * the given prefix, so `invalidateQueries({ queryKey: qk.notifications._root })`
 * clears every per-user notifications cache at once (e.g. after admin actions).
 */

export const qk = {
  // ── Notifications ─────────────────────────────────────────────────────────
  notifications:      (userId: string) => ['notifications', userId]       as const,
  notificationsCount: (userId: string) => ['notifications-count', userId] as const,
  notificationPrefs:  (userId: string) => ['notificationPrefs', userId]  as const,

  // ── Messages / Discussions ────────────────────────────────────────────────
  privateDiscussions:        (userId: string)       => ['private-discussions', userId]         as const,
  privateDiscussionMetadata: (discussionId: string) => ['private-discussion-metadata', discussionId] as const,
  privateDiscussionMessages: (discussionId: string) => ['private-discussion-messages', discussionId] as const,
  publicDiscussionMessages:  (discussionId: string) => ['public-discussion-messages', discussionId]  as const,
  publicDiscussions:         (type: string)         => ['public-discussions', type]            as const,
  publicDiscussionsAll:      ()                     => ['public-discussions-all']              as const,
  publicDiscussionsOpportunity: (type: string, opportunityId: string) =>
    ['public-discussions', type, opportunityId] as const,

  // ── Opportunities ─────────────────────────────────────────────────────────
  opportunitiesFeed:       (search: string, type: string, sort: string) => ['opportunities-feed', search, type, sort] as const,
  opportunitiesAdmin:      (search: string, status: string, type: string) => ['opportunities', search, status, type] as const,
  opportunity:             (id: string)     => ['opportunity', id]             as const,
  opportunitiesPreview:    ()               => ['opportunities-preview']       as const,
  myOpportunities:         (userId: string) => ['my-opportunities', userId]    as const,
  myOpportunitiesDashboard:(userId: string) => ['my-opportunities-dashboard', userId] as const,
  myOpportunitiesTasks:    (userId: string) => ['my-opportunities-tasks', userId]     as const,
  ownerApplications:       (opportunityId: string) => ['owner-applications', opportunityId] as const,
  savedOpportunities:      (userId: string) => ['saved-opportunities', userId] as const,

  // ── Applications ──────────────────────────────────────────────────────────
  myApplications:     (userId: string) => ['my-applications', userId]      as const,
  myApplicationsFull: (userId: string) => ['my-applications-full', userId] as const,

  // ── Analytics ─────────────────────────────────────────────────────────────
  analyticsMyApps: (userId: string) => ['analytics-my-apps', userId] as const,
  analyticsMyOpps: (userId: string) => ['analytics-my-opps', userId] as const,
  analyticsSaved:  (userId: string) => ['analytics-saved', userId]   as const,

  // ── Social ────────────────────────────────────────────────────────────────
  socialFollowing: (userId: string)                          => ['social-following', userId]              as const,
  isFollowing:     (targetId: string, currentUserId: string) => ['is-following', targetId, currentUserId] as const,

  // ── Explore ───────────────────────────────────────────────────────────────
  explore:        (type: string, country: string, dateDays: number | null, remoteOnly: boolean) =>
    ['explore', type, country, dateDays, remoteOnly] as const,
  exploreProfiles: () => ['explore-profiles'] as const,

  // ── Community ─────────────────────────────────────────────────────────────
  communityMembers:   () => ['community-members']   as const,
  communityTalents:   () => ['community-talents']   as const,
  communityCompanies: () => ['community-companies'] as const,

  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasks: (userId: string) => ['tasks', userId] as const,

  // ── Profile ───────────────────────────────────────────────────────────────
  profile:       (userId: string) => ['profile', userId]        as const,
  publicProfile: (userId: string) => ['public-profile', userId] as const,

  // ── Ratings ───────────────────────────────────────────────────────────────
  myRating:    (itemId: string) => ['my-rating', itemId]    as const,
  ratingStats: (itemId: string) => ['rating-stats', itemId] as const,

  // ── Referral ──────────────────────────────────────────────────────────────
  referral: (userId: string) => ['referral', userId] as const,

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminOpportunities: (status: string, search: string) => ['admin-opportunities', status, search] as const,
  adminUsers:         (search: string) => ['admin-users', search] as const,
  adminStats:         ()               => ['admin-stats']         as const,
  adminFeatures:      ()               => ['admin-features']      as const,
  adminIndustries:    ()               => ['admin-industries']    as const,
  adminMarkets:       ()               => ['admin-markets']       as const,

  // ── Search / Misc ─────────────────────────────────────────────────────────
  search:       (q: string)                        => ['search', q]                as const,
  resourcePage: (type: string, search: string)     => ['resource-page', type, search] as const,
  multiselect:  (endpoint: string)                 => ['multiselect', endpoint]    as const,

  /**
   * Prefix roots for broad invalidation.
   * `invalidateQueries({ queryKey: qk._root.explore })` clears all explore
   * queries regardless of their filter parameters.
   */
  _root: {
    opportunities:             ['opportunities']               as const,
    opportunitiesFeed:         ['opportunities-feed']         as const,
    explore:                   ['explore']                    as const,
    privateDiscussionMessages: ['private-discussion-messages'] as const,
    publicDiscussionMessages:  ['public-discussion-messages']  as const,
    adminOpportunities:        ['admin-opportunities']         as const,
    adminUsers:                ['admin-users']                 as const,
    notifications:             ['notifications']               as const,
    notificationsCount:        ['notifications-count']         as const,
    privateDiscussions:        ['private-discussions']         as const,
  },
} as const
