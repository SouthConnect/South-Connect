import { describe, it, expect } from 'vitest'
import { qk } from './queryKeys'

const USER = 'user-sentinel-id'

describe('qk — user-scoped keys always carry the user id', () => {
  // Historical bug class (architectural audit, W30): a key declared without
  // userId means two users sharing a browser session share one cache entry
  // (e.g. `savedOpportunities` used to leak between accounts). Every factory
  // below MUST embed the id it's given, not just accept it and drop it.
  it.each([
    ['notifications', qk.notifications(USER)],
    ['notificationsCount', qk.notificationsCount(USER)],
    ['notificationPrefs', qk.notificationPrefs(USER)],
    ['privateDiscussions', qk.privateDiscussions(USER)],
    ['savedOpportunities', qk.savedOpportunities(USER)],
    ['myOpportunities', qk.myOpportunities(USER)],
    ['myOpportunitiesDashboard', qk.myOpportunitiesDashboard(USER)],
    ['myOpportunitiesTasks', qk.myOpportunitiesTasks(USER)],
    ['myApplications', qk.myApplications(USER)],
    ['myApplicationsFull', qk.myApplicationsFull(USER)],
    ['analyticsMyApps', qk.analyticsMyApps(USER)],
    ['analyticsMyOpps', qk.analyticsMyOpps(USER)],
    ['analyticsSaved', qk.analyticsSaved(USER)],
    ['socialFollowing', qk.socialFollowing(USER)],
    ['tasks', qk.tasks(USER)],
    ['profile', qk.profile(USER)],
    ['publicProfile', qk.publicProfile(USER)],
    ['referral', qk.referral(USER)],
  ])('%s embeds the user id', (_name, key) => {
    expect(key).toContain(USER)
  })

  it('isFollowing embeds both the target and the current user', () => {
    const key = qk.isFollowing('target-id', USER)
    expect(key).toContain('target-id')
    expect(key).toContain(USER)
  })
})

describe('qk — two different users never collide on the same key', () => {
  it.each([
    ['notifications', qk.notifications] as const,
    ['savedOpportunities', qk.savedOpportunities] as const,
    ['myApplications', qk.myApplications] as const,
    ['tasks', qk.tasks] as const,
  ])('%s produces distinct keys for distinct users', (_name, factory) => {
    const a = factory('user-a')
    const b = factory('user-b')
    expect(a).not.toEqual(b)
  })
})

describe('qk._root — every prefix root actually matches its parameterized key', () => {
  // A root used for invalidateQueries({ queryKey: qk._root.X }) only clears
  // caches whose key genuinely starts with that prefix. If a factory's first
  // element ever drifts from its root's string, invalidation silently stops
  // working — this is the exact failure mode the queryKeys factory was built
  // to prevent (see file header).
  const cases: Array<[string, readonly unknown[], readonly unknown[]]> = [
    ['opportunitiesFeed', qk._root.opportunitiesFeed, qk.opportunitiesFeed('q', 'type', 'sort')],
    ['explore', qk._root.explore, qk.explore('type', 'country', 7, false)],
    ['privateDiscussionMessages', qk._root.privateDiscussionMessages, qk.privateDiscussionMessages('d1')],
    ['publicDiscussionMessages', qk._root.publicDiscussionMessages, qk.publicDiscussionMessages('d1')],
    ['adminOpportunities', qk._root.adminOpportunities, qk.adminOpportunities('status', 'search')],
    ['adminUsers', qk._root.adminUsers, qk.adminUsers('search')],
    ['notifications', qk._root.notifications, qk.notifications(USER)],
    ['notificationsCount', qk._root.notificationsCount, qk.notificationsCount(USER)],
    ['privateDiscussions', qk._root.privateDiscussions, qk.privateDiscussions(USER)],
  ]

  it.each(cases)('%s root is a real prefix of the full key', (_name, root, fullKey) => {
    expect(fullKey.slice(0, root.length)).toEqual(root)
  })
})
