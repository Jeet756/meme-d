import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Route not found.'));
};

// Express recognises error middleware by its four-argument signature, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  // body-parser errors (malformed JSON, payload too large) carry a numeric `status`.
  const status = typeof err?.status === 'number' ? err.status : undefined;
  if (status === 400 || status === 413) {
    res.status(status).json({
      error: { code: 'VALIDATION_ERROR', message: status === 413 ? 'Request body is too large.' : 'Request body is not valid JSON.' },
    });
    return;
  }

  // Log the real error for operators, but never leak internals to the client.
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, env.isProduction ? String(err?.message ?? err) : err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } });
};
