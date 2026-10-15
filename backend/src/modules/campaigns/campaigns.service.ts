import { Prisma, type CampaignStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { AuthenticatedUser } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';
import { buildPageMeta, toSkipTake } from '../../utils/pagination';
import { calculatePayout } from '../payouts/payoutCalculator';
import { toOwnerCampaign, toPublicCampaign } from './campaigns.mapper';
import type { CreateCampaignInput, ListCampaignsQuery } from './campaigns.schemas';

const campaignInclude = {
  milestones: true,
  brand: { select: { id: true, name: true } },
  _count: { select: { submissions: true } },
} satisfies Prisma.CampaignInclude;

export async function createCampaign(brandId: string, input: CreateCampaignInput) {
  const campaign = await prisma.campaign.create({
    data: {
      brandId,
      name: input.name,
      description: input.description,
      platform: input.platform,
      status: input.status,
      budgetPaise: input.budgetPaise,
      milestones: { create: input.milestones.map(({ minViews, payoutPaise }) => ({ minViews, payoutPaise })) },
    },
    include: campaignInclude,
  });
  return toOwnerCampaign(campaign);
}

export async function listCampaigns(query: ListCampaignsQuery, user: AuthenticatedUser | undefined) {
  if (query.mine && user?.role !== 'brand') {
    throw AppError.forbidden('Only brand accounts have campaigns of their own.');
  }

  // Anonymous and creator traffic only ever sees live campaigns. Brands see all of their own.
  const where: Prisma.CampaignWhereInput = query.mine
    ? { brandId: user!.id, ...(query.status ? { status: query.status } : {}) }
    : { status: 'live' };
  if (query.platform) where.platform = query.platform;
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

  const [total, campaigns] = await prisma.$transaction([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({
      where,
      include: campaignInclude,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
    }),
  ]);

  return {
    items: campaigns.map(query.mine ? toOwnerCampaign : toPublicCampaign),
    meta: buildPageMeta(query.page, query.pageSize, total),
  };
}

export async function getCampaign(id: string, user: AuthenticatedUser | undefined) {
  const campaign = await prisma.campaign.findUnique({ where: { id }, include: campaignInclude });
  const isOwner = campaign !== null && user?.role === 'brand' && campaign.brandId === user.id;

  // Drafts and completed campaigns are invisible to everyone but their owner.
  if (!campaign || (campaign.status !== 'live' && !isOwner)) {
    throw AppError.notFound('Campaign not found.');
  }
  return isOwner ? toOwnerCampaign(campaign) : toPublicCampaign(campaign);
}

/** Loads a campaign and verifies the caller owns it. 404 if missing, 403 if it belongs to another brand. */
async function loadOwnedCampaign(id: string, brandId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id }, include: campaignInclude });
  if (!campaign) throw AppError.notFound('Campaign not found.');
  if (campaign.brandId !== brandId) throw AppError.forbidden('This campaign belongs to another brand.');
  return campaign;
}

export async function getCampaignBudget(id: string, brandId: string) {
  const campaign = await loadOwnedCampaign(id, brandId);
  const remainingPaise = campaign.budgetPaise - campaign.spentPaise;

  const [ledgerTotals, submissions] = await Promise.all([
    prisma.payoutLedgerEntry.aggregate({
      where: { campaignId: id },
      _sum: { amountPaise: true },
      _count: true,
    }),
    prisma.submission.findMany({
      where: { campaignId: id },
      select: { viewCount: true, earnedPaise: true, suspicious: true },
    }),
  ]);

  const ledgerTotalPaise = ledgerTotals._sum.amountPaise ?? 0;
  let waitingForBudget = 0;
  let owedPaise = 0;
  for (const submission of submissions) {
    const decision = calculatePayout({
      views: submission.viewCount,
      milestones: campaign.milestones,
      earnedPaise: submission.earnedPaise,
      remainingBudgetPaise: remainingPaise,
    });
    if (decision.outcome === 'insufficient_budget') {
      waitingForBudget += 1;
      owedPaise += decision.blockedPaise;
    }
  }

  return {
    campaignId: campaign.id,
    status: campaign.status,
    budgetPaise: campaign.budgetPaise,
    spentPaise: campaign.spentPaise,
    remainingPaise,
    utilization: campaign.budgetPaise === 0 ? 0 : campaign.spentPaise / campaign.budgetPaise,
    ledgerEntryCount: ledgerTotals._count,
    ledgerTotalPaise,
    // Audit check: the ledger must always explain exactly what the campaign has spent.
    ledgerMatchesSpend: ledgerTotalPaise === campaign.spentPaise,
    submissionCount: submissions.length,
    suspiciousSubmissionCount: submissions.filter((s) => s.suspicious).length,
    submissionsWaitingForBudget: waitingForBudget,
    owedButUnfundedPaise: owedPaise,
  };
}

const allowedTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['live', 'completed'],
  live: ['completed'],
  completed: [],
};

export async function updateCampaignStatus(id: string, brandId: string, status: 'live' | 'completed') {
  const campaign = await loadOwnedCampaign(id, brandId);
  if (!allowedTransitions[campaign.status].includes(status)) {
    throw AppError.conflict(`A ${campaign.status} campaign cannot be changed to ${status}.`);
  }
  const updated = await prisma.campaign.update({ where: { id }, data: { status }, include: campaignInclude });
  return toOwnerCampaign(updated);
}

export { loadOwnedCampaign };
