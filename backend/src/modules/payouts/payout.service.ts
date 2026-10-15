/**
 * The only place in the codebase that moves money.
 *
 * INVARIANTS (enforced by code AND by the database):
 *   1. Campaign.spentPaise <= Campaign.budgetPaise            -> CHECK constraint + guarded UPDATE
 *   2. Campaign.spentPaise == SUM(PayoutLedgerEntry.amount)    -> both change in the same transaction
 *   3. A submission's earned total is recorded at most once    -> UNIQUE(idempotencyKey)
 *   4. Earned money never decreases                            -> calculator clamps increments at zero
 *
 * CONCURRENCY: every view update takes a row lock on the CAMPAIGN first (SELECT ... FOR UPDATE),
 * then on the SUBMISSION. Because every payout in a campaign must pass through that one campaign lock,
 * two updates can never read the same "remaining budget" at the same time, whether they target the
 * same submission or different ones. The lock order is always campaign -> submission; never reverse it,
 * or two requests could deadlock. The transaction uses READ COMMITTED: after a waiter acquires the lock
 * its next statement sees the winner's committed data, which is exactly what we need.
 *
 * No network calls happen inside the transaction, so the lock is held for a few milliseconds.
 */
import { Prisma, type CampaignStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { calculatePayout, type PayoutOutcome } from './payoutCalculator';
import { isSuspiciousViewSpike } from './spikeDetector';

interface LockedCampaignRow {
  id: string;
  status: CampaignStatus;
  budgetPaise: number;
  spentPaise: number;
}

interface LockedSubmissionRow {
  id: string;
  creatorId: string;
  viewCount: number;
  earnedPaise: number;
  suspicious: boolean;
  viewsUpdatedAt: Date;
}

export interface ViewUpdateResult {
  submissionId: string;
  campaignId: string;
  viewCount: number;
  earnedPaise: number;
  outcome: PayoutOutcome | 'campaign_not_live';
  awardedPaise: number;
  blockedPaise: number;
  suspicious: boolean;
  viewsDecreased: boolean;
}

/** Thrown if the guarded budget UPDATE affects no row. Should be impossible under the lock; rolls everything back. */
class BudgetInvariantError extends Error {}

const MAX_ATTEMPTS = 4;

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  // P2034: write conflict or deadlock. P2002: lost an idempotency race, a retry will see the winner's row.
  if (error.code === 'P2034' || error.code === 'P2002') return true;
  const sqlState = (error.meta as { code?: string } | undefined)?.code;
  return error.code === 'P2010' && (sqlState === '40001' || sqlState === '40P01');
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function applyViewUpdate(
  submissionId: string,
  newViews: number,
  now: () => Date = () => new Date(),
): Promise<ViewUpdateResult> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await runViewUpdateTransaction(submissionId, newViews, now());
    } catch (error) {
      // Bounded retry: transient lock conflicts are retried a few times, then surfaced.
      if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) throw error;
      await sleep(15 * attempt + Math.floor(Math.random() * 20));
    }
  }
}

function runViewUpdateTransaction(submissionId: string, newViews: number, now: Date): Promise<ViewUpdateResult> {
  return prisma.$transaction(
    async (tx) => {
      // Plain read to learn which campaign to lock. campaignId never changes, so this is safe.
      const owner = await tx.submission.findUnique({ where: { id: submissionId }, select: { campaignId: true } });
      if (!owner) throw AppError.notFound('Submission not found.');
      const { campaignId } = owner;

      const [campaign] = await tx.$queryRaw<LockedCampaignRow[]>`
        SELECT "id", "status", "budgetPaise", "spentPaise"
        FROM "Campaign" WHERE "id" = ${campaignId}::uuid FOR UPDATE`;
      const [submission] = await tx.$queryRaw<LockedSubmissionRow[]>`
        SELECT "id", "creatorId", "viewCount", "earnedPaise", "suspicious", "viewsUpdatedAt"
        FROM "Submission" WHERE "id" = ${submissionId}::uuid FOR UPDATE`;
      if (!campaign || !submission) throw AppError.notFound('Submission not found.');

      const milestones = await tx.milestone.findMany({
        where: { campaignId },
        select: { id: true, minViews: true, payoutPaise: true },
      });

      const suspicious =
        submission.suspicious ||
        isSuspiciousViewSpike({
          previousViews: submission.viewCount,
          newViews,
          previousUpdatedAt: submission.viewsUpdatedAt,
          now,
        });

      let outcome: ViewUpdateResult['outcome'] = 'campaign_not_live';
      let awardedPaise = 0;
      let blockedPaise = 0;
      let earnedPaise = submission.earnedPaise;

      // Money only moves while a campaign is live. Views are still recorded for drafts and completed campaigns.
      if (campaign.status === 'live') {
        const decision = calculatePayout({
          views: newViews,
          milestones,
          earnedPaise: submission.earnedPaise,
          remainingBudgetPaise: campaign.budgetPaise - campaign.spentPaise,
        });
        outcome = decision.outcome;
        blockedPaise = decision.blockedPaise;

        if (decision.outcome === 'awarded' && decision.qualifiedMilestone) {
          awardedPaise = decision.awardPaise;
          earnedPaise = decision.targetPaise;

          // 1) Ledger first: the unique idempotency key rejects a duplicate before any balance moves.
          await tx.payoutLedgerEntry.create({
            data: {
              campaignId,
              submissionId,
              creatorId: submission.creatorId,
              milestoneId: decision.qualifiedMilestone.id,
              amountPaise: awardedPaise,
              previousEarnedPaise: submission.earnedPaise,
              newEarnedPaise: decision.targetPaise,
              viewsAtAward: newViews,
              idempotencyKey: `${submissionId}:${decision.targetPaise}`,
            },
          });

          // 2) Guarded atomic spend. The WHERE clause re-checks the cap inside the statement itself.
          const rowsUpdated = await tx.$executeRaw`
            UPDATE "Campaign"
            SET "spentPaise" = "spentPaise" + ${awardedPaise}::int, "updatedAt" = NOW()
            WHERE "id" = ${campaignId}::uuid AND "spentPaise" + ${awardedPaise}::int <= "budgetPaise"`;
          if (rowsUpdated !== 1) {
            throw new BudgetInvariantError(`Budget guard rejected a payout for campaign ${campaignId}`);
          }
        }
      }

      // 3) Record the new view count (and any earnings) on the submission.
      await tx.submission.update({
        where: { id: submissionId },
        data: { viewCount: newViews, earnedPaise, suspicious, viewsUpdatedAt: now },
      });

      return {
        submissionId,
        campaignId,
        viewCount: newViews,
        earnedPaise,
        outcome,
        awardedPaise,
        blockedPaise,
        suspicious,
        viewsDecreased: newViews < submission.viewCount,
      };
    },
    { maxWait: 5_000, timeout: 10_000 },
  );
}
