import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';
import { paginationQuerySchema } from '../../utils/pagination';
import { parseOrThrow } from '../../utils/validate';
import { getCreatorEarnings, getCreatorPayouts } from './creator.service';

export const creatorRouter = Router();

creatorRouter.use(requireAuth, requireRole('creator'));

creatorRouter.get(
  '/earnings',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await getCreatorEarnings(req.user!.id) });
  }),
);

creatorRouter.get(
  '/payouts',
  asyncHandler(async (req: Request, res: Response) => {
    const pagination = parseOrThrow(paginationQuerySchema, req.query);
    const { items, meta } = await getCreatorPayouts(req.user!.id, pagination);
    res.json({ data: items, meta });
  }),
);
