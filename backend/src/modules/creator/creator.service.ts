import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { buildPageMeta, toSkipTake } from '../../utils/pagination';
import { describePayoutProgress } from '../payouts/payoutCalculator';

export interface DailyAmount {
  day: string;
  amountPaise: number;
}

export async function getCreatorEarnings(creatorId: string) {
  const [submissions, dailyRows] = await Promise.all([
    prisma.submission.findMany({
      where: { creatorId },
      select: {
        viewCount: true,
        earnedPaise: true,
        campaign: { select: { id: true, status: true, budgetPaise: true, spentPaise: true, milestones: true } },
      },
    }),
    // SUM() returns bigint in Postgres, so it is cast and converted explicitly.
    prisma.$queryRaw<{ day: string; amount: bigint }[]>(Prisma.sql`
      SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
             SUM("amountPaise")::bigint AS amount
      FROM "PayoutLedgerEntry"
      WHERE "creatorId" = ${creatorId}::uuid AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1`),
  ]);

  let totalEarnedPaise = 0;
  let blockedPaise = 0;
  let totalViews = 0;
  let submissionsWaitingForBudget = 0;
  const liveCampaignIds = new Set<string>();

  for (const submission of submissions) {
    const { campaign } = submission;
    totalEarnedPaise += submission.earnedPaise;
    totalViews += submission.viewCount;
    if (campaign.status === 'live') liveCampaignIds.add(campaign.id);

    const progress = describePayoutProgress({
      views: submission.viewCount,
      milestones: campaign.milestones,
      earnedPaise: submission.earnedPaise,
      remainingBudgetPaise: campaign.budgetPaise - campaign.spentPaise,
      campaignLive: campaign.status === 'live',
    });
    if (progress.status === 'waiting_for_budget') {
      blockedPaise += progress.pendingPaise;
      submissionsWaitingForBudget += 1;
    }
  }

  const earningsByDay: DailyAmount[] = dailyRows.map((row) => ({ day: row.day, amountPaise: Number(row.amount) }));

  return {
    totalEarnedPaise,
    blockedPaise,
    submissionsWaitingForBudget,
    activeCampaigns: liveCampaignIds.size,
    submissionCount: submissions.length,
    totalViews,
    earningsByDay,
  };
}

export async function getCreatorPayouts(creatorId: string, pagination: { page: number; pageSize: number }) {
  const where = { creatorId };
  const [total, entries] = await prisma.$transaction([
    prisma.payoutLedgerEntry.count({ where }),
    prisma.payoutLedgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(pagination),
      select: {
        id: true,
        amountPaise: true,
        previousEarnedPaise: true,
        newEarnedPaise: true,
        viewsAtAward: true,
        createdAt: true,
        campaign: { select: { id: true, name: true, platform: true } },
        submission: { select: { id: true, postUrl: true } },
        milestone: { select: { minViews: true, payoutPaise: true } },
      },
    }),
  ]);
  return { items: entries, meta: buildPageMeta(pagination.page, pagination.pageSize, total) };
}
