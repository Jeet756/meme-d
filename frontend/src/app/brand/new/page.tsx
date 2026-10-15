import type { Metadata } from 'next';
import { RequireRole } from '@/features/auth/RequireRole';
import { CampaignForm } from '@/features/campaigns/CampaignForm';

export const metadata: Metadata = { title: 'New campaign' };

export default function NewCampaignPage() {
  return (
    <RequireRole role="brand">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl">New campaign</h1>
        <p className="mb-8 mt-2 text-fog-300">Three short steps. Nothing is saved until you launch or save a draft.</p>
        <CampaignForm />
      </div>
    </RequireRole>
  );
}
