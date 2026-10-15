import type { Campaign, Milestone } from '@prisma/client';

type CampaignWithRelations = Campaign & {
  milestones: Milestone[];
  brand: { id: string; name: string };
  _count?: { submissions: number };
};

const byThreshold = (a: Milestone, b: Milestone) => a.minViews - b.minViews;

/**
 * Shape returned to anyone browsing campaigns. It deliberately omits the brand's email,
 * the amount spent so far and draft-only data. Remaining budget is shown so creators know
 * whether a payout can still be funded.
 */
export function toPublicCampaign(campaign: CampaignWithRelations) {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    platform: campaign.platform,
    status: campaign.status,
    brand: { name: campaign.brand.name },
    budgetPaise: campaign.budgetPaise,
    remainingPaise: campaign.budgetPaise - campaign.spentPaise,
    milestones: [...campaign.milestones].sort(byThreshold).map(({ id, minViews, payoutPaise }) => ({ id, minViews, payoutPaise })),
    submissionCount: campaign._count?.submissions ?? 0,
    createdAt: campaign.createdAt,
  };
}

/** Owner view: everything public plus spend and the owner's own identifiers. */
export function toOwnerCampaign(campaign: CampaignWithRelations) {
  return {
    ...toPublicCampaign(campaign),
    brand: { id: campaign.brand.id, name: campaign.brand.name },
    spentPaise: campaign.spentPaise,
    updatedAt: campaign.updatedAt,
  };
}
