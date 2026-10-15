import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { originCheck } from './middleware/originCheck';
import { globalLimiter } from './middleware/rateLimiters';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  // Render and Vercel sit in front of the API; without this every client would share one IP for rate limiting.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: env.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    }),
  );
  app.use(globalLimiter);
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());
  app.use(originCheck);

  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
