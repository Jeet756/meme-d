import { Badge } from '@/components/ui/Badge';
import { platformLabel } from '@/lib/format';
import type { CampaignStatus, Platform } from '@/types/api';

export const PlatformBadge = ({ platform }: { platform: Platform }) => <Badge tone="violet">{platformLabel(platform)}</Badge>;

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const tone = status === 'live' ? 'lime' : status === 'draft' ? 'amber' : 'neutral';
  return <Badge tone={tone}>{status === 'live' ? 'Live' : status === 'draft' ? 'Draft' : 'Completed'}</Badge>;
}
