import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/auth/AuthForm';
import { Panel } from '@/components/ui/Panel';

export const metadata: Metadata = { title: 'Sign up' };

export default function Page() {
  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:py-20">
      <h1 className="text-4xl">Create your account</h1>
      <p className="mt-2 text-fog-300">Free to join. Pick brand or creator; you can use a separate email for the other.</p>
      <Panel className="mt-8 p-6 sm:p-8">
        {/* useSearchParams needs a Suspense boundary for static rendering. */}
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </Panel>
    </div>
  );
}
