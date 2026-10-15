import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

function limiter(windowMinutes: number, max: number, message: string) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // The integration suite makes dozens of signups from one IP; real traffic is always limited.
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    },
  });
}

export const globalLimiter = limiter(15, 600, 'Too many requests. Please slow down and try again shortly.');
export const authLimiter = limiter(15, 40, 'Too many sign-in attempts. Please wait a few minutes and try again.');
// The view-update endpoint is unauthenticated by design, so it gets its own tighter limit.
export const viewUpdateLimiter = limiter(1, 60, 'Too many view updates. Please wait a moment.');
