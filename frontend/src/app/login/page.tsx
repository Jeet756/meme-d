import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/auth/AuthForm';
import { Panel } from '@/components/ui/Panel';

export const metadata: Metadata = { title: 'Log in' };

export default function Page() {
  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:py-20">
      <h1 className="text-4xl">Welcome back</h1>
      <p className="mt-2 text-fog-300">Log in to your studio to see campaigns, budgets and payouts.</p>
      <Panel className="mt-8 p-6 sm:p-8">
        {/* useSearchParams needs a Suspense boundary for static rendering. */}
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </Panel>
    </div>
  );
}
