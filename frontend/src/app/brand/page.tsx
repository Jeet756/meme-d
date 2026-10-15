import type { Metadata } from 'next';
import { RequireRole } from '@/features/auth/RequireRole';
import { BrandDashboard } from '@/features/dashboard/BrandDashboard';

export const metadata: Metadata = { title: 'Brand Studio' };

export default function BrandPage() {
  return <RequireRole role="brand"><BrandDashboard /></RequireRole>;
}
