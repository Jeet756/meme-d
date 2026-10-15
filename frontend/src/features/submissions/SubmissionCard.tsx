'use client';

import { useState } from 'react';
import { ExternalLink, Hourglass, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { formatViews } from '@/lib/format';
import { formatPaise } from '@/lib/money';
import { PlatformBadge } from '@/features/campaigns/PlatformBadge';
import type { Submission, ViewUpdateResponse } from '@/types/api';

/**
 * One submitted post with its payout state. `allowSimulation` shows the "simulate views" tool, which
 * stands in for real platform analytics by calling PATCH /api/submissions/:id/views.
 */
export function SubmissionCard({ submission, allowSimulation = false, onChanged }: { submission: Submission; allowSimulation?: boolean; onChanged?: () => void }) {
  const toast = useToast();
  const [views, setViews] = useState(String(submission.viewCount));
  const [busy, setBusy] = useState(false);
  const waiting = submission.payoutStatus === 'waiting_for_budget';

  async function simulate() {
    if (!/^\d+$/.test(views.trim())) {
      toast.push({ tone: 'error', title: 'Enter a whole number of views' });
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.patch<ViewUpdateResponse>(`/submissions/${submission.id}/views`, { views: Number(views) });
      const { outcome, awardedPaise } = data.payout;
      if (outcome === 'awarded') toast.push({ tone: 'success', title: `${formatPaise(awardedPaise)} earned`, body: 'Added to your payout history.' });
      else if (outcome === 'insufficient_budget') toast.push({ tone: 'info', title: 'Payout is waiting', body: 'The campaign budget cannot cover your next milestone yet.' });
      else if (outcome === 'up_to_date') toast.push({ tone: 'info', title: 'No new payout', body: 'You already earned everything for this view count.' });
      else toast.push({ tone: 'info', title: 'Views updated' });
      onChanged?.();
    } catch (error) {
      toast.push({ tone: 'error', title: 'Could not update views', body: error instanceof ApiError ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-panel border border-white/[0.07] bg-ink-800/70 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={submission.campaign.platform} />
            {waiting && <Badge tone="amber"><Hourglass className="h-3 w-3" aria-hidden /> Waiting for budget</Badge>}
            {submission.suspicious && <Badge tone="red">Unusual spike</Badge>}
          </div>
          <h3 className="mt-2 truncate font-sans text-base font-semibold text-fog-50">{submission.campaign.name}</h3>
          {submission.creator && <p className="text-sm text-fog-400">by {submission.creator.name}</p>}
          <a href={submission.postUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm text-violet-300 hover:underline">
            <span className="truncate">{submission.postUrl.replace('https://', '')}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
        <div className="text-right">
          <p className="text-sm text-fog-400">Earned</p>
          <p className="tabular font-display text-2xl text-lime-400">{formatPaise(submission.earnedPaise)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="tabular text-fog-200">{formatViews(submission.viewCount)} views</span>
          <span className="tabular text-fog-400">
            {submission.nextMilestone
              ? `Next: ${formatViews(submission.nextMilestone.minViews)} views for ${formatPaise(submission.nextMilestone.payoutPaise)}`
              : 'Top milestone reached'}
          </span>
        </div>
        <ProgressBar value={submission.progressToNext} label="Progress to next milestone" tone={waiting ? 'amber' : 'violet'} />
      </div>

      {waiting && (
        <p className="mt-3 rounded-control bg-signal-amber/10 p-3 text-sm text-signal-amber">
          You have reached a milestone worth {formatPaise(submission.pendingPaise)} more, but only {formatPaise(submission.campaign.remainingPaise)} is left in this campaign. Meme’d does not pay part of a milestone, so it is held until it can be paid in full.
        </p>
      )}

      {allowSimulation && (
        <form
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/[0.06] pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void simulate();
          }}
        >
          <div className="min-w-40 flex-1">
            <label htmlFor={`views-${submission.id}`} className="mb-1 block text-xs text-fog-400">
              Simulated view count (stands in for platform analytics)
            </label>
            <input
              id={`views-${submission.id}`}
              inputMode="numeric"
              value={views}
              onChange={(event) => setViews(event.target.value)}
              className="tabular h-10 w-full rounded-control border border-white/10 bg-ink-900/80 px-3 text-sm text-fog-50 focus-visible:border-violet-400"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" loading={busy} className="h-10">
            <Wand2 className="h-4 w-4" aria-hidden /> Update views
          </Button>
        </form>
      )}
    </article>
  );
}
