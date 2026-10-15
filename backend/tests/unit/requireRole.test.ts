import type { Request, Response } from 'express';
import { requireRole } from '../../src/middleware/requireRole';
import { AppError } from '../../src/utils/AppError';

function run(role: 'brand' | 'creator' | null, allowed: ('brand' | 'creator')[]) {
  const req = { user: role ? { id: 'u1', role } : undefined } as unknown as Request;
  const next = jest.fn();
  requireRole(...allowed)(req, {} as Response, next);
  return next.mock.calls[0]?.[0] as AppError | undefined;
}

describe('requireRole', () => {
  it('lets a matching role through', () => {
    expect(run('brand', ['brand'])).toBeUndefined();
  });

  it('forbids a creator on a brand-only route with 403', () => {
    const error = run('creator', ['brand']);
    expect(error).toBeInstanceOf(AppError);
    expect(error?.statusCode).toBe(403);
  });

  it('forbids a brand on a creator-only route with 403', () => {
    expect(run('brand', ['creator'])?.statusCode).toBe(403);
  });

  it('returns 401 when no user is attached', () => {
    expect(run(null, ['brand'])?.statusCode).toBe(401);
  });

  it('accepts any of several allowed roles', () => {
    expect(run('creator', ['creator', 'brand'])).toBeUndefined();
  });
});
