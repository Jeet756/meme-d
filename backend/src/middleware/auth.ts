import type { Request, RequestHandler } from 'express';
import './authTypes';
import { AUTH_COOKIE_NAME, verifyToken } from '../modules/auth/token';
import { AppError } from '../utils/AppError';

export type { AuthenticatedUser } from './authTypes';

function readToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAME];
  return cookieToken || undefined;
}

/** Requires a valid token and attaches `req.user`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next(AppError.unauthenticated());
  const user = verifyToken(token);
  if (!user) return next(AppError.unauthenticated('Your session has expired. Please sign in again.'));
  req.user = user;
  next();
};

/** Attaches `req.user` when a valid token is present but never rejects the request. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = readToken(req);
  if (token) {
    const user = verifyToken(token);
    if (user) req.user = user;
  }
  next();
};
