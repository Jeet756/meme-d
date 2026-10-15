'use client';

import { Button } from '@/components/ui/Button';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-4xl">Something broke on this page</h1>
      <p className="mt-3 text-fog-300">Reload to try again. If it keeps happening, your data is safe and the problem is on our side.</p>
      <Button className="mt-8" onClick={reset}>
        Reload this page
      </Button>
    </div>
  );
}
