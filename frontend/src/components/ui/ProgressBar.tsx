import { cn } from '@/lib/cn';

export function ProgressBar({
  value,
  label,
  tone = 'violet',
  className,
}: {
  /** 0..1 */
  value: number;
  label: string;
  tone?: 'violet' | 'lime' | 'amber';
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const fill = { violet: 'bg-violet-500', lime: 'bg-lime-500', amber: 'bg-signal-amber' }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-600', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}
