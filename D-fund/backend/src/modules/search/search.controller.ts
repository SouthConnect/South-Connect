import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';

/**
 * Exposes the global search endpoint.
 * No authentication required — only publicly visible data is returned.
 */
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Searches across opportunities, profiles, and discussions.
   * Rate-limited to 20 requests per minute to prevent search-query DoS.
   *
   * @param q    - The search query (minimum 2 characters).
   * @param type - Optional filter: 'opportunities' | 'profiles' | 'discussions'.
   */
  @Get()
  @Throttle({ default: {} })
  search(@Query('q') q: string, @Query('type') type?: string) {
    return this.searchService.search(q || '', type);
  }
}
