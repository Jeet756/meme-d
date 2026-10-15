import type { Request, Response } from 'express';
import { AppError } from '../../utils/AppError';
import { parseOrThrow } from '../../utils/validate';
import { loginSchema, signupSchema } from './auth.schemas';
import { getUserById, logIn, signUp } from './auth.service';
import { AUTH_COOKIE_NAME, authCookieOptions, signToken } from './token';

function startSession(res: Response, user: { id: string; role: 'brand' | 'creator' }) {
  res.cookie(AUTH_COOKIE_NAME, signToken(user), authCookieOptions());
}

export async function signup(req: Request, res: Response) {
  const user = await signUp(parseOrThrow(signupSchema, req.body));
  startSession(res, user);
  res.status(201).json({ data: { user } });
}

export async function login(req: Request, res: Response) {
  const user = await logIn(parseOrThrow(loginSchema, req.body));
  startSession(res, user);
  res.json({ data: { user } });
}

export function logout(_req: Request, res: Response) {
  // clearCookie must use the same attributes the cookie was set with, minus maxAge.
  const { maxAge: _maxAge, ...options } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
  res.json({ data: { loggedOut: true } });
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthenticated();
  res.json({ data: { user: await getUserById(req.user.id) } });
}
