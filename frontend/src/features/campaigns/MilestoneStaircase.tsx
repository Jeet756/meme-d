import { cn } from '@/lib/cn';
import { formatViewsCompact } from '@/lib/format';
import { formatPaise } from '@/lib/money';
import { highestRungReached } from '@/lib/ladder';

interface Rung {
  minViews: number;
  payoutPaise: number;
}

/**
 * The payout ladder as a staircase. Only the highest rung reached is lit (lime): that is the amount paid.
 * Lower rungs that were also crossed are dimmed, because they are replaced, not added up.
 */
export function MilestoneStaircase({ milestones, views, compact = false }: { milestones: readonly Rung[]; views?: number; compact?: boolean }) {
  const rungs = [...milestones].sort((a, b) => a.minViews - b.minViews);
  const maxPayout = Math.max(1, ...rungs.map((rung) => rung.payoutPaise));
  const current = views === undefined ? null : highestRungReached(views, rungs);
  const trackHeight = compact ? 72 : 132;

  return (
    <ol className="flex items-end gap-2 sm:gap-3" aria-label="Milestone payout ladder">
      {rungs.map((rung) => {
        const isCurrent = current?.minViews === rung.minViews;
        const isPassed = views !== undefined && rung.minViews <= views && !isCurrent;
        const height = Math.max(0.18, rung.payoutPaise / maxPayout) * trackHeight;
        return (
          <li key={rung.minViews} className="flex min-w-0 flex-1 flex-col items-stretch gap-2" data-state={isCurrent ? 'paid' : isPassed ? 'replaced' : 'locked'}>
            <span className={cn('tabular truncate text-center text-xs font-semibold sm:text-sm', isCurrent ? 'text-lime-400' : 'text-fog-200')}>
              {formatPaise(rung.payoutPaise)}
            </span>
            <div
              style={{ height }}
              className={cn(
                'origin-bottom animate-step-in rounded-t-lg transition-colors duration-300',
                isCurrent && 'bg-lime-500 shadow-glow',
                isPassed && 'bg-violet-500/35',
                !isCurrent && !isPassed && 'border border-dashed border-white/15 bg-white/[0.03]',
              )}
            />
            <span className="tabular text-center text-xs text-fog-400">{formatViewsCompact(rung.minViews)} views</span>
            <span className="sr-only">
              {isCurrent ? 'Current payout level' : isPassed ? 'Reached, replaced by a higher level' : 'Not reached yet'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
