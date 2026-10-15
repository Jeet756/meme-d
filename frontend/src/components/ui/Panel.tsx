import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-panel border border-white/[0.07] bg-ink-800/70 shadow-panel', className)} {...rest} />;
}

export function PanelHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
      <div>
        <h2 className="font-sans text-base font-semibold text-fog-50">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fog-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
