import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../../config/env';

export const AUTH_COOKIE_NAME = 'memed_token';

interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: { id: string; role: Role }): string {
  const payload: TokenPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN_SECONDS, algorithm: 'HS256' });
}

/** Returns the user identity from a valid token, or null for anything expired, tampered or malformed. */
export function verifyToken(token: string): { id: string; role: Role } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return null;
    const { sub, role } = decoded as Partial<TokenPayload>;
    if (typeof sub !== 'string' || (role !== 'brand' && role !== 'creator')) return null;
    return { id: sub, role };
  } catch {
    return null;
  }
}

export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // SameSite=None is only legal together with Secure; production is always served over HTTPS.
    secure: env.isProduction || env.COOKIE_SAME_SITE === 'none',
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: env.JWT_EXPIRES_IN_SECONDS * 1000,
    path: '/',
  };
}
