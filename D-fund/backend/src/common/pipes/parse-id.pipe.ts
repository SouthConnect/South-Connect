import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

// cuid v1: starts with 'c', ~25 chars, alphanum
// cuid v2: starts with any letter, 24 chars, alphanum
// UUID:    8-4-4-4-12 hex groups
// Glide:   Base64URL variant — alphanum + hyphen + dot (e.g. "a-4XD4k", "dnQe-r.hg")
const ID_RE = /^[0-9a-zA-Z_\-.]{10,36}$/;

/**
 * Validates that a route parameter looks like a plausible record ID.
 * Accepts cuid (v1/v2) and UUID formats; rejects payloads that could
 * carry SQL fragments or path-traversal sequences.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || !ID_RE.test(value)) {
      throw new BadRequestException('Invalid ID format');
    }
    return value;
  }
}
