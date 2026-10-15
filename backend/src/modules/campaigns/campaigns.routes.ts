import { Router } from 'express';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';
import { createSubmissionHandler } from '../submissions/submissions.controller';
import { changeStatus, create, getBudget, getOne, list, listSubmissions } from './campaigns.controller';

export const campaignsRouter = Router();

// Public (a signed-in brand additionally sees its own drafts).
campaignsRouter.get('/', optionalAuth, asyncHandler(list));
campaignsRouter.get('/:id', optionalAuth, asyncHandler(getOne));

// Brand-only management.
campaignsRouter.post('/', requireAuth, requireRole('brand'), asyncHandler(create));
campaignsRouter.get('/:id/budget', requireAuth, requireRole('brand'), asyncHandler(getBudget));
campaignsRouter.patch('/:id/status', requireAuth, requireRole('brand'), asyncHandler(changeStatus));
campaignsRouter.get('/:id/submissions', requireAuth, requireRole('brand'), asyncHandler(listSubmissions));

// Creator-only.
campaignsRouter.post('/:id/submissions', requireAuth, requireRole('creator'), asyncHandler(createSubmissionHandler));
