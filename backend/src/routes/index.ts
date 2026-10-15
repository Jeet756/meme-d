import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { authRouter } from '../modules/auth/auth.routes';
import { brandRouter } from '../modules/brand/brand.routes';
import { campaignsRouter } from '../modules/campaigns/campaigns.routes';
import { creatorRouter } from '../modules/creator/creator.routes';
import { submissionsRouter } from '../modules/submissions/submissions.routes';

export const apiRouter = Router();

apiRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ data: { status: 'ok', database: 'up', time: new Date().toISOString() } });
    } catch (error) {
      console.error('Health check: database unreachable:', error instanceof Error ? error.message : error);
      res.status(503).json({ error: { code: 'INTERNAL_ERROR', message: 'Database is unreachable.' } });
    }
  }),
);

apiRouter.use('/auth', authRouter);
apiRouter.use('/campaigns', campaignsRouter);
apiRouter.use('/submissions', submissionsRouter);
apiRouter.use('/creator', creatorRouter);
apiRouter.use('/brand', brandRouter);
