import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';
import { getBrandOverview } from './brand.service';

export const brandRouter = Router();

brandRouter.use(requireAuth, requireRole('brand'));

brandRouter.get(
  '/overview',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await getBrandOverview(req.user!.id) });
  }),
);
