import { z } from 'zod';
import { AppError } from './AppError';

/** Parses `input` with a zod schema and converts failures into a 400 with per-field messages. */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  throw AppError.validation('Some fields need your attention.', fieldErrors);
}

export const uuidParam = z.string().uuid('That id is not valid.');
