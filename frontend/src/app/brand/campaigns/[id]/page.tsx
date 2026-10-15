import type { Metadata } from 'next';
import { RequireRole } from '@/features/auth/RequireRole';
import { ManageCampaign } from '@/features/campaigns/ManageCampaign';

export const metadata: Metadata = { title: 'Manage campaign' };

export default function ManageCampaignPage({ params }: { params: { id: string } }) {
  return (
    <RequireRole role="brand">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><ManageCampaign id={params.id} /></div>
    </RequireRole>
  );
}
