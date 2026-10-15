import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie authentication. Browsers always attach an Origin header to cross-site
 * state-changing requests, so a request that names an origin we do not trust is rejected.
 * Requests without an Origin (curl, server-to-server, tests) cannot be forged by a victim's browser.
 * This sits on top of SameSite cookies, it does not replace them.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !env.allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
    return next(AppError.forbidden('This request came from an origin that is not allowed.'));
  }
  next();
};
