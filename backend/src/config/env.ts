import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (your Neon connection string)'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required (e.g. http://localhost:3000)'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
});

export type AppEnv = z.infer<typeof envSchema> & { allowedOrigins: string[]; isProduction: boolean };

function loadEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    // Fail fast with a readable message instead of crashing later with a confusing stack trace.
    throw new Error(`Invalid or missing environment variables:\n${lines.join('\n')}\nSee backend/.env.example.`);
  }
  const env = parsed.data;
  const allowedOrigins = env.FRONTEND_URL.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (env.COOKIE_SAME_SITE === 'none' && env.NODE_ENV !== 'production') {
    // SameSite=None needs Secure cookies, which browsers refuse over plain http://localhost.
    console.warn('COOKIE_SAME_SITE=none only works over HTTPS. Use "lax" for local development.');
  }
  return { ...env, allowedOrigins, isProduction: env.NODE_ENV === 'production' };
}

export const env = loadEnv();
