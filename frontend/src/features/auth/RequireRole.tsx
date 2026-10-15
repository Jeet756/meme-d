'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Role } from '@/types/api';
import { homePathForRole, useAuth } from './AuthProvider';

/** Client-side route guard. The API enforces the same rules; this only keeps people on the right screens. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'ready') return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (user.role !== role) router.replace(homePathForRole(user.role));
  }, [status, user, role, router, pathname]);

  if (status !== 'ready' || !user || user.role !== role) {
    return (
      <div role="status" aria-label="Loading your studio" className="mx-auto w-full max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  return <>{children}</>;
}
