import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestContext } from '../context/request-context';

const HEADER = 'x-request-id';
const MAX_INCOMING_LENGTH = 100;

/**
 * Assigns a correlation ID to every request — reuses the client-supplied
 * `X-Request-Id` header when present (so a frontend/proxy-generated ID survives
 * end to end), otherwise generates one. Echoed back on the response so a user
 * reporting a bug can hand over an ID that maps directly to a slice of the
 * Railway logs.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header(HEADER);
  const requestId =
    incoming && incoming.length > 0 && incoming.length <= MAX_INCOMING_LENGTH
      ? incoming
      : randomUUID();

  res.setHeader('X-Request-Id', requestId);
  RequestContext.run({ requestId }, next);
}
