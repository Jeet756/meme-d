import type { Metadata } from 'next';
import { RequireRole } from '@/features/auth/RequireRole';
import { CreatorDashboard } from '@/features/dashboard/CreatorDashboard';

export const metadata: Metadata = { title: 'Creator Studio' };

export default function CreatorPage() {
  return <RequireRole role="creator"><CreatorDashboard /></RequireRole>;
}
