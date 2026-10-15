import Link from 'next/link';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { percent } from '@/lib/format';
import { formatPaise } from '@/lib/money';
import type { Campaign } from '@/types/api';
import { MilestoneStaircase } from './MilestoneStaircase';
import { PlatformBadge, StatusBadge } from './PlatformBadge';

export function CampaignCard({ campaign, href }: { campaign: Campaign; href: string }) {
  const used = campaign.budgetPaise === 0 ? 0 : (campaign.budgetPaise - campaign.remainingPaise) / campaign.budgetPaise;
  const topPayout = campaign.milestones.at(-1)?.payoutPaise ?? 0;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-panel border border-white/[0.07] bg-ink-800/70 p-5 shadow-panel transition-colors hover:border-violet-400/40"
    >
      <div className="flex items-center justify-between gap-2">
        <PlatformBadge platform={campaign.platform} />
        <StatusBadge status={campaign.status} />
      </div>
      <h3 className="mt-4 font-display text-xl leading-snug text-fog-50 group-hover:text-white">{campaign.name}</h3>
      <p className="mt-1 text-sm text-fog-400">by {campaign.brand.name}</p>
      <p className="mt-3 line-clamp-2 text-sm text-fog-300">{campaign.description}</p>

      <div className="mt-5">
        <MilestoneStaircase milestones={campaign.milestones} compact />
      </div>

      <div className="mt-auto pt-5">
        <div className="mb-1.5 flex justify-between text-xs text-fog-400">
          <span>Up to {formatPaise(topPayout)} per post</span>
          <span className="tabular">{formatPaise(campaign.remainingPaise)} left</span>
        </div>
        <ProgressBar value={used} label={`${percent(used)} of budget used`} tone={used > 0.85 ? 'amber' : 'violet'} />
      </div>
    </Link>
  );
}
