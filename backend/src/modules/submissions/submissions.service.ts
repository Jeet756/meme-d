import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { AuthenticatedUser } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';
import { buildPageMeta, toSkipTake } from '../../utils/pagination';
import { normalizePostUrl } from '../../utils/postUrl';
import { loadOwnedCampaign } from '../campaigns/campaigns.service';
import { applyViewUpdate, type ViewUpdateResult } from '../payouts/payout.service';
import { submissionInclude, toSubmissionDto } from './submissions.mapper';

export async function createSubmission(creatorId: string, campaignId: string, rawPostUrl: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, status: true, platform: true } });
  if (!campaign || campaign.status !== 'live') {
    throw AppError.notFound('Campaign not found or no longer accepting submissions.');
  }

  const normalized = normalizePostUrl(rawPostUrl, campaign.platform);
  if (!normalized.ok) throw AppError.validation(normalized.reason, { postUrl: normalized.reason });

  try {
    const created = await prisma.submission.create({
      data: { campaignId, creatorId, postUrl: normalized.normalizedUrl },
      include: submissionInclude,
    });
    return toSubmissionDto(created, { includeCreator: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict('This post has already been submitted to this campaign.');
    }
    throw error;
  }
}

export async function listSubmissions(
  user: AuthenticatedUser,
  query: { page: number; pageSize: number; campaignId?: string },
) {
  // Creators only ever see their own posts. Brands only see posts on campaigns they own.
  const where: Prisma.SubmissionWhereInput =
    user.role === 'creator' ? { creatorId: user.id } : { campaign: { brandId: user.id } };
  if (query.campaignId) where.campaignId = query.campaignId;

  const [total, rows] = await prisma.$transaction([
    prisma.submission.count({ where }),
    prisma.submission.findMany({
      where,
      include: submissionInclude,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
    }),
  ]);
  return {
    items: rows.map((row) => toSubmissionDto(row, { includeCreator: user.role === 'brand' })),
    meta: buildPageMeta(query.page, query.pageSize, total),
  };
}

export async function listSubmissionsForCampaign(
  campaignId: string,
  brandId: string,
  pagination: { page: number; pageSize: number },
) {
  await loadOwnedCampaign(campaignId, brandId);
  return listSubmissions({ id: brandId, role: 'brand' }, { ...pagination, campaignId });
}

/**
 * Simulated platform-analytics update. Deliberately has no role check (per the product brief),
 * so it returns only payout-relevant fields and never exposes creator or brand details.
 */
export async function updateSubmissionViews(submissionId: string, views: number) {
  const result = await applyViewUpdate(submissionId, views);
  return toViewUpdateResponse(result);
}

async function toViewUpdateResponse(result: ViewUpdateResult) {
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: result.submissionId },
    include: submissionInclude,
  });
  const dto = toSubmissionDto(submission, { includeCreator: false });
  return {
    submission: {
      id: dto.id,
      viewCount: dto.viewCount,
      earnedPaise: dto.earnedPaise,
      payoutStatus: dto.payoutStatus,
      pendingPaise: dto.pendingPaise,
      nextMilestone: dto.nextMilestone,
      progressToNext: dto.progressToNext,
    },
    payout: {
      outcome: result.outcome,
      awardedPaise: result.awardedPaise,
      blockedPaise: result.blockedPaise,
      viewsDecreased: result.viewsDecreased,
    },
  };
}
