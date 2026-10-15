import { ProgressBar } from '@/components/ui/ProgressBar';
import { percent } from '@/lib/format';
import { formatPaise } from '@/lib/money';

export function BudgetMeter({ budgetPaise, spentPaise }: { budgetPaise: number; spentPaise: number }) {
  const used = budgetPaise === 0 ? 0 : spentPaise / budgetPaise;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-fog-400">Remaining</p>
          <p className="tabular font-display text-3xl text-fog-50">{formatPaise(budgetPaise - spentPaise)}</p>
        </div>
        <p className="tabular text-sm text-fog-300">
          {formatPaise(spentPaise)} of {formatPaise(budgetPaise)} paid ({percent(used)})
        </p>
      </div>
      <ProgressBar className="mt-3" value={used} label="Budget used" tone={used > 0.85 ? 'amber' : 'lime'} />
    </div>
  );
}
