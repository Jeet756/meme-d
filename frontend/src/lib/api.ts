import type { PageMeta } from '@/types/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: PageMeta;
}

/**
 * All calls go to this app's own /api/* path, which Next.js proxies to the backend (see next.config.mjs).
 * The session lives in an HttpOnly cookie, so no token is ever readable by JavaScript.
 */
export async function apiRequest<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      credentials: 'same-origin',
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  const body = (await response.json().catch(() => null)) as
    | { data?: T; meta?: PageMeta; error?: { code?: string; message?: string; details?: Record<string, string> } }
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? 'Something went wrong. Please try again.',
      body?.error?.details && typeof body.error.details === 'object' ? body.error.details : {},
    );
  }
  return { data: body?.data as T, meta: body?.meta };
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: 'POST', json: json ?? {} }),
  patch: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: 'PATCH', json: json ?? {} }),
};
