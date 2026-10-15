import type { Campaign, Milestone, Submission } from '@prisma/client';
import { describePayoutProgress } from '../payouts/payoutCalculator';

export type SubmissionWithContext = Submission & {
  campaign: Campaign & { milestones: Milestone[] };
  creator?: { id: string; name: string };
};

/**
 * Turns a stored submission into what the UI needs: the money earned, what is still owed,
 * and whether a payout is stuck waiting for campaign budget.
 */
export function toSubmissionDto(submission: SubmissionWithContext, options: { includeCreator: boolean }) {
  const { campaign } = submission;
  const progress = describePayoutProgress({
    views: submission.viewCount,
    milestones: campaign.milestones,
    earnedPaise: submission.earnedPaise,
    remainingBudgetPaise: campaign.budgetPaise - campaign.spentPaise,
    campaignLive: campaign.status === 'live',
  });

  return {
    id: submission.id,
    postUrl: submission.postUrl,
    viewCount: submission.viewCount,
    earnedPaise: submission.earnedPaise,
    payoutStatus: progress.status,
    pendingPaise: progress.pendingPaise,
    nextMilestone: progress.nextMilestone
      ? { minViews: progress.nextMilestone.minViews, payoutPaise: progress.nextMilestone.payoutPaise }
      : null,
    progressToNext: progress.progressToNext,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      status: campaign.status,
      remainingPaise: campaign.budgetPaise - campaign.spentPaise,
      milestones: [...campaign.milestones]
        .sort((a, b) => a.minViews - b.minViews)
        .map(({ id, minViews, payoutPaise }) => ({ id, minViews, payoutPaise })),
    },
    ...(options.includeCreator && submission.creator
      ? { creator: submission.creator, suspicious: submission.suspicious }
      : {}),
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

export const submissionInclude = {
  campaign: { include: { milestones: true } },
  creator: { select: { id: true, name: true } },
} as const;
