'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { PageMeta } from '@/types/api';

interface State<T> {
  data: T | null;
  meta: PageMeta | null;
  error: ApiError | null;
  loading: boolean;
}

/** Fetches `path` on mount and whenever it changes. Pass null to skip. Call `reload` after a mutation. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, meta: null, error: null, loading: path !== null });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    api
      .get<T>(path, controller.signal)
      .then(({ data, meta }) => setState({ data, meta: meta ?? null, error: null, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Something went wrong.');
        setState({ data: null, meta: null, error: apiError, loading: false });
      });
    return () => controller.abort();
  }, [path, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  return { ...state, reload };
}
