'use client';

import { useState } from 'react';
import { Clock, Film, IndianRupee, Radio } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { PlatformBadge } from '@/features/campaigns/PlatformBadge';
import { SubmissionCard } from '@/features/submissions/SubmissionCard';
import { useApi } from '@/hooks/useApi';
import { formatDate, formatViews } from '@/lib/format';
import { formatPaise } from '@/lib/money';
import type { CreatorEarnings, PayoutEntry, Submission } from '@/types/api';
import { AmountAreaChart } from './AmountAreaChart';

export function CreatorDashboard() {
  const earnings = useApi<CreatorEarnings>('/creator/earnings');
  const submissions = useApi<Submission[]>('/submissions?pageSize=50');
  const [payoutPage, setPayoutPage] = useState(1);
  const payouts = useApi<PayoutEntry[]>(`/creator/payouts?page=${payoutPage}&pageSize=8`);

  const refreshAll = () => { earnings.reload(); submissions.reload(); payouts.reload(); };
  const e = earnings.data;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Creator Studio</h1>
          <p className="mt-1 text-fog-300">Your posts, milestones and payouts in one place.</p>
        </div>
        <ButtonLink href="/campaigns" variant="accent">Find campaigns</ButtonLink>
      </div>

      {earnings.loading ? (
        <div role="status" aria-label="Loading earnings" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : earnings.error || !e ? (
        <Panel><ErrorState error={earnings.error ?? new Error('No data')} onRetry={earnings.reload} /></Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total earned" value={formatPaise(e.totalEarnedPaise)} tone="money" icon={<IndianRupee className="h-4 w-4" />} hint={`${formatViews(e.totalViews)} views overall`} />
            <StatCard label="Waiting for budget" value={formatPaise(e.blockedPaise)} tone={e.blockedPaise ? 'warning' : 'default'} icon={<Clock className="h-4 w-4" />} hint={e.submissionsWaitingForBudget ? `${e.submissionsWaitingForBudget} post(s) held until the campaign can pay in full` : 'Nothing is being held'} />
            <StatCard label="Active campaigns" value={String(e.activeCampaigns)} icon={<Radio className="h-4 w-4" />} />
            <StatCard label="Posts submitted" value={String(e.submissionCount)} icon={<Film className="h-4 w-4" />} />
          </div>

          <Panel>
            <PanelHeader title="Earnings per day" />
            <div className="p-4"><AmountAreaChart points={e.earningsByDay} label="Earned" /></div>
          </Panel>
        </>
      )}

      <section aria-labelledby="posts">
        <h2 id="posts" className="mb-4 font-sans text-lg font-semibold">Your posts</h2>
        {submissions.loading ? <Skeleton className="h-40" /> : submissions.error ? <Panel><ErrorState error={submissions.error} onRetry={submissions.reload} /></Panel>
          : !submissions.data?.length ? <Panel><EmptyState title="No posts submitted yet" body="Pick a live campaign, paste a link to your post, and track what it earns." action={<ButtonLink href="/campaigns" variant="accent">Browse campaigns</ButtonLink>} /></Panel>
          : <div className="grid gap-4 md:grid-cols-2">{submissions.data.map((s) => <SubmissionCard key={s.id} submission={s} allowSimulation onChanged={refreshAll} />)}</div>}
      </section>

      <Panel>
        <PanelHeader title="Payout history" description="Every payment, with the milestone that triggered it." />
        {payouts.loading ? <div className="p-5"><Skeleton className="h-32" /></div> : payouts.error ? <ErrorState error={payouts.error} onRetry={payouts.reload} />
          : !payouts.data?.length ? <EmptyState title="No payouts yet" body="Payouts appear here the moment a post crosses a milestone and the campaign can fund it." />
          : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <caption className="sr-only">Payout history</caption>
                  <thead className="text-fog-400">
                    <tr><th scope="col" className="px-6 py-3 font-medium">Date</th><th scope="col" className="px-3 py-3 font-medium">Campaign</th><th scope="col" className="px-3 py-3 font-medium">Milestone</th><th scope="col" className="px-6 py-3 text-right font-medium">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {payouts.data.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap px-6 py-3 text-fog-300">{formatDate(p.createdAt)}</td>
                        <td className="px-3 py-3"><span className="mr-2 text-fog-50">{p.campaign.name}</span><PlatformBadge platform={p.campaign.platform} /></td>
                        <td className="tabular px-3 py-3 text-fog-300">{formatViews(p.milestone.minViews)} views</td>
                        <td className="tabular px-6 py-3 text-right font-semibold text-lime-400">+{formatPaise(p.amountPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {payouts.meta && payouts.meta.totalPages > 1 && (
                <nav aria-label="Payout pages" className="flex items-center justify-center gap-3 border-t border-white/[0.06] p-4">
                  <Button variant="secondary" size="sm" disabled={payoutPage <= 1} onClick={() => setPayoutPage(payoutPage - 1)}>Previous</Button>
                  <span className="text-sm text-fog-300">Page {payouts.meta.page} of {payouts.meta.totalPages}</span>
                  <Button variant="secondary" size="sm" disabled={payoutPage >= payouts.meta.totalPages} onClick={() => setPayoutPage(payoutPage + 1)}>Next</Button>
                </nav>
              )}
            </>
          )}
      </Panel>
    </div>
  );
}
