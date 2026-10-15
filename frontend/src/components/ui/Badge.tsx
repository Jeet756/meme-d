import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'violet' | 'lime' | 'amber' | 'red';

const tones: Record<Tone, string> = {
  neutral: 'bg-white/5 text-fog-200 ring-white/10',
  violet: 'bg-violet-500/15 text-violet-200 ring-violet-400/30',
  lime: 'bg-lime-500/15 text-lime-300 ring-lime-400/30',
  amber: 'bg-signal-amber/15 text-signal-amber ring-signal-amber/30',
  red: 'bg-signal-red/15 text-signal-red ring-signal-red/30',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  );
}
