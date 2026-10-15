import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';
import type { AuthenticatedUser } from './authTypes';

/** Must run after `requireAuth`. Kept in its own file so it can be unit tested without app config. */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user: AuthenticatedUser | undefined = req.user;
    if (!user) return next(AppError.unauthenticated());
    if (!allowed.includes(user.role)) {
      return next(AppError.forbidden(`This action is only available to ${allowed.join(' or ')} accounts.`));
    }
    next();
  };
}
