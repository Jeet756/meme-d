import type { Metadata } from 'next';
import { CampaignDetail } from '@/features/campaigns/CampaignDetail';

export const metadata: Metadata = { title: 'Campaign' };

export default function CampaignPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <CampaignDetail id={params.id} />
    </div>
  );
}
