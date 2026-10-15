import type { Metadata } from 'next';
import { CampaignBrowser } from '@/features/campaigns/CampaignBrowser';

export const metadata: Metadata = { title: 'Live campaigns' };

export default function CampaignsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Live campaigns</h1>
      <p className="mt-3 max-w-2xl text-fog-300">Every campaign shows its full payout ladder and how much budget is left, so you know what a post can earn before you make it.</p>
      <div className="mt-10"><CampaignBrowser /></div>
    </div>
  );
}
