'use client';

import { useState } from 'react';
import { MilestoneStaircase } from '@/features/campaigns/MilestoneStaircase';
import { formatViews } from '@/lib/format';
import { highestRungReached, sumOfRungsReached } from '@/lib/ladder';
import { formatPaise } from '@/lib/money';

// Illustration only: the example ladder from the product brief, not live campaign data.
const exampleLadder = [
  { minViews: 10_000, payoutPaise: 50_000 },
  { minViews: 50_000, payoutPaise: 200_000 },
  { minViews: 100_000, payoutPaise: 500_000 },
];

export function HeroDemo() {
  const [views, setViews] = useState(75_000);
  const paid = highestRungReached(views, exampleLadder)?.payoutPaise ?? 0;
  const wrongSum = sumOfRungsReached(views, exampleLadder);

  return (
    <div className="rounded-panel border border-white/10 bg-ink-800/80 p-6 shadow-panel backdrop-blur sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-fog-400">A creator&rsquo;s post has</p>
          <p className="tabular font-display text-3xl text-fog-50">{formatViews(views)} views</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-fog-400">Meme’d pays</p>
          <p className="tabular font-display text-3xl text-lime-400" aria-live="polite">{formatPaise(paid)}</p>
        </div>
      </div>

      <div className="mt-8"><MilestoneStaircase milestones={exampleLadder} views={views} /></div>

      <div className="mt-8">
        <label htmlFor="demo-views" className="mb-3 block text-sm text-fog-300">Drag to change the view count</label>
        <input id="demo-views" type="range" min={0} max={150_000} step={1_000} value={views} onChange={(e) => setViews(Number(e.target.value))} aria-valuetext={`${formatViews(views)} views`} />
      </div>

      <p className="mt-5 text-sm text-fog-400">
        {wrongSum > paid
          ? `Adding every crossed milestone would pay ${formatPaise(wrongSum)}. Meme’d pays only the highest one, so budgets stay predictable.`
          : 'One rung, one payout. No stacking, no surprises.'}
      </p>
      <p className="mt-3 text-xs text-fog-500">Example ladder for illustration, not live data.</p>
    </div>
  );
}
