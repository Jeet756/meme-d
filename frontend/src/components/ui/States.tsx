import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import type { ApiError } from '@/lib/api';
import { Button } from './Button';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-violet-500/10 text-violet-300">
        <Inbox className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="font-sans text-base font-semibold text-fog-50">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fog-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-signal-red/10 text-signal-red">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="font-sans text-base font-semibold text-fog-50">We could not load this</h3>
      <p className="mt-1 max-w-sm text-sm text-fog-400">{error.message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
