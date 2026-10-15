import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimiters';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { login, logout, me, signup } from './auth.controller';

export const authRouter = Router();

authRouter.post('/signup', authLimiter, asyncHandler(signup));
authRouter.post('/login', authLimiter, asyncHandler(login));
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, asyncHandler(me));
