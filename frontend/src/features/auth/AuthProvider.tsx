'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Role, User } from '@/types/api';

interface AuthContextValue {
  user: User | null;
  /** "loading" until the first /auth/me response arrives, so pages never flash the wrong state. */
  status: 'loading' | 'ready';
  login: (input: { email: string; password: string }) => Promise<User>;
  signup: (input: { name: string; email: string; password: string; role: Role }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const homePathForRole = (role: Role) => (role === 'brand' ? '/brand' : '/creator');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: User }>('/auth/me')
      .then(({ data }) => !cancelled && setUser(data.user))
      .catch((error: unknown) => {
        // 401 simply means "not signed in". Anything else also leaves the visitor signed out.
        if (!(error instanceof ApiError) || error.status !== 401) console.warn('Could not restore session', error);
      })
      .finally(() => !cancelled && setStatus('ready'));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback<AuthContextValue['login']>(async (input) => {
    const { data } = await api.post<{ user: User }>('/auth/login', input);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback<AuthContextValue['signup']>(async (input) => {
    const { data } = await api.post<{ user: User }>('/auth/signup', input);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, status, login, signup, logout }), [user, status, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
