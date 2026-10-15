import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { submissionInclude, toSubmissionDto } from '../submissions/submissions.mapper';

export async function getBrandOverview(brandId: string) {
  const [totals, campaigns, recentSubmissions, suspiciousCount, payoutCount, dailyRows] = await Promise.all([
    prisma.campaign.aggregate({
      where: { brandId },
      _count: true,
      _sum: { budgetPaise: true, spentPaise: true },
    }),
    prisma.campaign.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        platform: true,
        status: true,
        budgetPaise: true,
        spentPaise: true,
        _count: { select: { submissions: true } },
      },
    }),
    prisma.submission.findMany({
      where: { campaign: { brandId } },
      include: submissionInclude,
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.submission.count({ where: { campaign: { brandId }, suspicious: true } }),
    prisma.payoutLedgerEntry.count({ where: { campaign: { brandId } } }),
    prisma.$queryRaw<{ day: string; amount: bigint }[]>(Prisma.sql`
      SELECT to_char(date_trunc('day', p."createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
             SUM(p."amountPaise")::bigint AS amount
      FROM "PayoutLedgerEntry" p
      JOIN "Campaign" c ON c."id" = p."campaignId"
      WHERE c."brandId" = ${brandId}::uuid AND p."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1`),
  ]);

  // Views per campaign in one grouped query instead of one query per campaign (avoids N+1).
  const viewTotals = await prisma.submission.groupBy({
    by: ['campaignId'],
    where: { campaignId: { in: campaigns.map((campaign) => campaign.id) } },
    _sum: { viewCount: true },
  });
  const viewsByCampaign = new Map(viewTotals.map((row) => [row.campaignId, row._sum.viewCount ?? 0]));

  const allocatedPaise = totals._sum.budgetPaise ?? 0;
  const spentPaise = totals._sum.spentPaise ?? 0;

  return {
    campaignCount: totals._count,
    allocatedPaise,
    spentPaise,
    remainingPaise: allocatedPaise - spentPaise,
    payoutCount,
    suspiciousSubmissionCount: suspiciousCount,
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      status: campaign.status,
      budgetPaise: campaign.budgetPaise,
      spentPaise: campaign.spentPaise,
      submissionCount: campaign._count.submissions,
      totalViews: viewsByCampaign.get(campaign.id) ?? 0,
    })),
    recentSubmissions: recentSubmissions.map((row) => toSubmissionDto(row, { includeCreator: true })),
    spendByDay: dailyRows.map((row) => ({ day: row.day, amountPaise: Number(row.amount) })),
  };
}
