import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Provides cross-entity full-text search across opportunities, user profiles,
 * and public discussion threads.
 *
 * Opportunities and user profiles use PostgreSQL full-text search
 * (via the `fullTextSearch` Prisma preview feature) which leverages
 * `to_tsvector` / `to_tsquery` under the hood for better performance and
 * relevance than plain LIKE queries.
 *
 * Discussion search keeps ILIKE because discussion content is shorter and
 * does not justify the overhead of a GIN index on that table.
 */
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Converts a plain-text query into a PostgreSQL `tsquery` string.
   *
   * Each word becomes a prefix-search term (word:*) joined with OR (|) so that:
   *  - partial matches work ("reac" matches "react")
   *  - multi-word queries return results containing ANY of the words
   *
   * Special tsquery characters are stripped to prevent injection.
   */
  private toTsQuery(term: string): string {
    return term
      .trim()
      .replace(/[&|!():*\\]/g, ' ')  // strip tsquery operators
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${word}:*`)    // prefix search
      .join(' | ');
  }

  /**
   * Searches across opportunities, profiles, and discussions simultaneously.
   *
   * Returns an empty result set when the query is shorter than 2 characters.
   * Each category can be individually targeted using the optional `type` filter
   * ('opportunities', 'profiles', or 'discussions').
   *
   * @param q    - Search term.
   * @param type - Optional category filter.
   */
  async search(q: string, type?: string) {
    if (!q || q.trim().length < 2) return { opportunities: [], profiles: [], discussions: [] };

    const term = q.trim();
    const tsQuery = this.toTsQuery(term);

    const [opportunities, profiles, discussions] = await Promise.all([
      !type || type === 'opportunities'
        ? this.prisma.opportunity.findMany({
            where: {
              status: 'ACTIVE',
              deletedAt: null,
              OR: [
                { name: { search: tsQuery } },
                { punchline: { search: tsQuery } },
                { description: { search: tsQuery } },
              ],
            },
            take: 8,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            include: { owner: { select: { id: true, name: true, profilePic: true } } },
          })
        : [],

      !type || type === 'profiles'
        ? this.prisma.user.findMany({
            where: {
              visibility: true,
              deletedAt: null,
              OR: [
                { name: { search: tsQuery } },
                { bio: { search: tsQuery } },
                { btoCProfile: { description: { search: tsQuery } } },
                { btoBProfile: { companyName: { search: tsQuery } } },
              ],
            },
            take: 8,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: {
              id: true,
              name: true,
              bio: true,
              profilePic: true,
              city: true,
              country: true,
              btoBProfile: { select: { companyName: true } },
            },
          })
        : [],

      // Discussions: standard ILIKE — content is short, no GIN index needed
      !type || type === 'discussions'
        ? this.prisma.publicDiscussion.findMany({
            where: {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } },
              ],
            },
            take: 6,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          })
        : [],
    ]);

    return { opportunities, profiles, discussions };
  }
}
