'use client';

import { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { SubmissionCard } from '@/features/submissions/SubmissionCard';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api';
import { formatPaise } from '@/lib/money';
import type { Campaign, CampaignBudget, Submission } from '@/types/api';
import { BudgetMeter } from './BudgetMeter';
import { MilestoneStaircase } from './MilestoneStaircase';
import { PlatformBadge, StatusBadge } from './PlatformBadge';

export function ManageCampaign({ id }: { id: string }) {
  const toast = useToast();
  const campaign = useApi<Campaign>(`/campaigns/${id}`);
  const budget = useApi<CampaignBudget>(`/campaigns/${id}/budget`);
  const submissions = useApi<Submission[]>(`/campaigns/${id}/submissions?pageSize=50`);
  const [busy, setBusy] = useState(false);

  async function changeStatus(status: 'live' | 'completed') {
    setBusy(true);
    try {
      await api.patch(`/campaigns/${id}/status`, { status });
      toast.push({ tone: 'success', title: status === 'live' ? 'Campaign is live' : 'Campaign completed' });
      campaign.reload();
      budget.reload();
    } catch (error) {
      toast.push({ tone: 'error', title: 'Could not change status', body: error instanceof ApiError ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  if (campaign.loading) return <div role="status" aria-label="Loading campaign" className="space-y-4"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-64" /></div>;
  if (campaign.error || !campaign.data) return <Panel><ErrorState error={campaign.error ?? new Error('Not found')} onRetry={campaign.reload} /></Panel>;

  const c = campaign.data;
  const b = budget.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex gap-2"><PlatformBadge platform={c.platform} /><StatusBadge status={c.status} /></div>
          <h1 className="mt-3 text-4xl">{c.name}</h1>
        </div>
        <div className="flex gap-2">
          {c.status === 'draft' && <Button variant="accent" loading={busy} onClick={() => changeStatus('live')}>Launch campaign</Button>}
          {c.status !== 'completed' && <Button variant="secondary" loading={busy} onClick={() => changeStatus('completed')}>Mark completed</Button>}
        </div>
      </div>

      {b && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Panel className="p-6"><BudgetMeter budgetPaise={b.budgetPaise} spentPaise={b.spentPaise} /></Panel>
          <Panel className="space-y-3 p-6">
            <p className="flex items-center gap-2 text-sm text-fog-200">
              {b.ledgerMatchesSpend ? <CheckCircle2 className="h-4 w-4 text-lime-400" aria-hidden /> : <ShieldAlert className="h-4 w-4 text-signal-red" aria-hidden />}
              {b.ledgerMatchesSpend ? 'Ledger matches budget spend' : 'Ledger does not match spend: investigate'}
            </p>
            <p className="tabular text-sm text-fog-400">{b.ledgerEntryCount} ledger entries totalling {formatPaise(b.ledgerTotalPaise)}</p>
            {b.submissionsWaitingForBudget > 0 && (
              <Badge tone="amber">{b.submissionsWaitingForBudget} post(s) waiting, {formatPaise(b.owedButUnfundedPaise)} unfunded</Badge>
            )}
          </Panel>
        </div>
      )}

      {b && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Posts submitted" value={String(b.submissionCount)} />
          <StatCard label="Waiting for budget" value={String(b.submissionsWaitingForBudget)} tone={b.submissionsWaitingForBudget ? 'warning' : 'default'} />
          <StatCard label="Flagged spikes" value={String(b.suspiciousSubmissionCount)} hint="Rule-based; a prompt to look closer, not proof" tone={b.suspiciousSubmissionCount ? 'warning' : 'default'} />
        </div>
      )}

      <Panel>
        <PanelHeader title="Payout ladder" />
        <div className="p-6"><MilestoneStaircase milestones={c.milestones} /></div>
      </Panel>

      <section aria-labelledby="subs">
        <h2 id="subs" className="mb-4 font-sans text-lg font-semibold">Submissions</h2>
        {submissions.loading ? <Skeleton className="h-40" /> : submissions.error ? <Panel><ErrorState error={submissions.error} onRetry={submissions.reload} /></Panel>
          : !submissions.data?.length ? <Panel><EmptyState title="No submissions yet" body={c.status === 'live' ? 'Share the campaign link with creators.' : 'Launch the campaign so creators can submit posts.'} /></Panel>
          : <div className="grid gap-4 md:grid-cols-2">{submissions.data.map((s) => <SubmissionCard key={s.id} submission={s} />)}</div>}
      </section>
    </div>
  );
}
