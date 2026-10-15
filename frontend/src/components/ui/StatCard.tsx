import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Panel } from './Panel';

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'money' | 'warning';
  icon?: ReactNode;
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2 text-sm text-fog-300">
        <span>{label}</span>
        {icon && <span className="text-fog-400">{icon}</span>}
      </div>
      <p
        className={cn(
          'tabular mt-2 font-display text-3xl font-medium tracking-tight',
          tone === 'money' && 'text-lime-400',
          tone === 'warning' && 'text-signal-amber',
          tone === 'default' && 'text-fog-50',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-fog-400">{hint}</p>}
    </Panel>
  );
}
