'use client';

import Link from 'next/link';
import { Eye, IndianRupee, Megaphone, PiggyBank, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { PlatformBadge, StatusBadge } from '@/features/campaigns/PlatformBadge';
import { SubmissionCard } from '@/features/submissions/SubmissionCard';
import { useApi } from '@/hooks/useApi';
import { formatViewsCompact, percent } from '@/lib/format';
import { formatPaise } from '@/lib/money';
import type { BrandOverview } from '@/types/api';
import { AmountAreaChart } from './AmountAreaChart';

export function BrandDashboard() {
  const { data, error, loading, reload } = useApi<BrandOverview>('/brand/overview');

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Brand Studio</h1>
          <p className="mt-1 text-fog-300">Budgets, spend and creator activity across your campaigns.</p>
        </div>
        <ButtonLink href="/brand/new" variant="accent"><Plus className="h-4 w-4" aria-hidden /> New campaign</ButtonLink>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading dashboard" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-72" />
        </div>
      ) : error || !data ? (
        <Panel><ErrorState error={error ?? new Error('No data')} onRetry={reload} /></Panel>
      ) : data.campaignCount === 0 ? (
        <Panel><EmptyState title="Launch your first campaign" body="Set a budget and a milestone ladder, and creators can start submitting posts right away." action={<ButtonLink href="/brand/new" variant="accent">Create a campaign</ButtonLink>} /></Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Campaigns" value={String(data.campaignCount)} icon={<Megaphone className="h-4 w-4" />} hint={`${data.payoutCount} payouts made`} />
            <StatCard label="Allocated" value={formatPaise(data.allocatedPaise)} icon={<PiggyBank className="h-4 w-4" />} />
            <StatCard label="Paid to creators" value={formatPaise(data.spentPaise)} tone="money" icon={<IndianRupee className="h-4 w-4" />} hint={data.allocatedPaise ? `${percent(data.spentPaise / data.allocatedPaise)} of allocated` : undefined} />
            <StatCard label="Remaining" value={formatPaise(data.remainingPaise)} icon={<Eye className="h-4 w-4" />} hint={data.suspiciousSubmissionCount ? `${data.suspiciousSubmissionCount} post(s) flagged for unusual spikes` : undefined} tone={data.suspiciousSubmissionCount ? 'warning' : 'default'} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Panel>
              <PanelHeader title="Payouts per day" description="Money actually paid out, from the payout ledger." />
              <div className="p-4"><AmountAreaChart points={data.spendByDay} label="Paid out" /></div>
            </Panel>
            <Panel>
              <PanelHeader title="Campaign performance" />
              <ul className="divide-y divide-white/[0.06]">
                {data.campaigns.map((c) => (
                  <li key={c.id} className="p-4">
                    <Link href={`/brand/campaigns/${c.id}`} className="block rounded-control hover:text-white">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-fog-50">{c.name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-fog-400">
                        <PlatformBadge platform={c.platform} />
                        <span>{c.submissionCount} posts</span>
                        <span>{formatViewsCompact(c.totalViews)} views</span>
                      </div>
                      <ProgressBar className="mt-3" value={c.budgetPaise ? c.spentPaise / c.budgetPaise : 0} label={`${c.name} budget used`} tone="lime" />
                      <p className="tabular mt-1 text-xs text-fog-400">{formatPaise(c.spentPaise)} of {formatPaise(c.budgetPaise)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="mb-4 font-sans text-lg font-semibold">Recent submissions</h2>
            {data.recentSubmissions.length === 0 ? (
              <Panel><EmptyState title="No posts yet" body="Once creators submit posts to your live campaigns they appear here." /></Panel>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">{data.recentSubmissions.map((s) => <SubmissionCard key={s.id} submission={s} />)}</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
