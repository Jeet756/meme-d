'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { SubmitPostForm } from '@/features/submissions/SubmitPostForm';
import { useApi } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';
import type { Campaign } from '@/types/api';
import { BudgetMeter } from './BudgetMeter';
import { MilestoneStaircase } from './MilestoneStaircase';
import { PlatformBadge, StatusBadge } from './PlatformBadge';

export function CampaignDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const { data: campaign, error, loading, reload } = useApi<Campaign>(`/campaigns/${id}`);
  const [submitted, setSubmitted] = useState(false);

  if (loading) return <div role="status" aria-label="Loading campaign" className="space-y-4"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-64" /></div>;
  if (error || !campaign) return <Panel><ErrorState error={error ?? new Error('Campaign not found.')} onRetry={reload} /></Panel>;

  const spent = campaign.budgetPaise - campaign.remainingPaise;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <div>
          <div className="flex gap-2"><PlatformBadge platform={campaign.platform} /><StatusBadge status={campaign.status} /></div>
          <h1 className="mt-4 text-4xl sm:text-5xl">{campaign.name}</h1>
          <p className="mt-2 text-fog-400">by {campaign.brand.name}, launched {formatDate(campaign.createdAt)}</p>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-fog-200">{campaign.description}</p>
        </div>
        <Panel>
          <PanelHeader title="Payout ladder" description="A post earns the highest milestone it reaches, not the total of all of them." />
          <div className="p-6"><MilestoneStaircase milestones={campaign.milestones} /></div>
        </Panel>
      </div>

      <aside className="space-y-6">
        <Panel className="p-6"><BudgetMeter budgetPaise={campaign.budgetPaise} spentPaise={spent} /></Panel>
        <Panel>
          <PanelHeader title="Submit your post" />
          <div className="p-6">
            {campaign.status !== 'live' ? (
              <p className="text-sm text-fog-300">This campaign is not accepting submissions.</p>
            ) : user?.role === 'creator' ? (
              submitted ? (
                <div className="space-y-3 text-sm text-fog-200">
                  <p>Your post is in. Open Creator Studio to follow its views and payouts.</p>
                  <ButtonLink href="/creator" variant="accent" className="w-full">Go to Creator Studio</ButtonLink>
                </div>
              ) : (
                <SubmitPostForm campaignId={campaign.id} platform={campaign.platform} onSubmitted={() => setSubmitted(true)} />
              )
            ) : user?.role === 'brand' ? (
              <p className="text-sm text-fog-300">You are signed in as a brand. Submitting posts needs a creator account.</p>
            ) : (
              <div className="space-y-3 text-sm text-fog-300">
                <p>Create a free creator account to submit a post to this campaign.</p>
                <ButtonLink href={`/signup?next=${encodeURIComponent(`/campaigns/${campaign.id}`)}`} variant="accent" className="w-full">Sign up as a creator</ButtonLink>
                <p className="text-center">Already a member? <Link href={`/login?next=${encodeURIComponent(`/campaigns/${campaign.id}`)}`} className="text-violet-300 hover:underline">Log in</Link></p>
              </div>
            )}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
