import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { viewUpdateLimiter } from '../../middleware/rateLimiters';
import { asyncHandler } from '../../utils/asyncHandler';
import { listHandler, updateViewsHandler } from './submissions.controller';

export const submissionsRouter = Router();

submissionsRouter.get('/', requireAuth, requireRole('creator', 'brand'), asyncHandler(listHandler));

// Simulated analytics endpoint: intentionally NOT authenticated (see product brief).
// It validates its input, is rate limited, and all money movement is still capped by the payout service.
submissionsRouter.patch('/:id/views', viewUpdateLimiter, asyncHandler(updateViewsHandler));
