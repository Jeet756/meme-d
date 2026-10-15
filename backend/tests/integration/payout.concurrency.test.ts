import { prisma } from '../../src/config/prisma';
import { applyViewUpdate } from '../../src/modules/payouts/payout.service';
import { AppError } from '../../src/utils/AppError';
import {
  createCampaign,
  createSubmission,
  createUser,
  describeDb,
  expectConsistentBooks,
  resetDatabase,
  rupees,
} from './helpers';

describeDb('payout engine against PostgreSQL', () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  async function setup(options: { budget: number; ladder: [number, number][]; submissions: number; status?: 'draft' | 'live' | 'completed' }) {
    const brand = await createUser('brand');
    const campaign = await createCampaign({
      brandId: brand.id,
      budgetPaise: options.budget,
      status: options.status,
      milestones: options.ladder.map(([minViews, payoutPaise]) => ({ minViews, payoutPaise })),
    });
    const submissions = [];
    for (let i = 0; i < options.submissions; i += 1) {
      const creator = await createUser('creator');
      submissions.push(await createSubmission(campaign.id, creator.id));
    }
    return { campaign, submissions };
  }

  describe('concurrency', () => {
    it('never lets simultaneous updates on DIFFERENT submissions spend the same budget twice', async () => {
      // ₹10,000 budget; each of 5 posts qualifies for ₹6,000, so only one can be funded.
      const { campaign, submissions } = await setup({ budget: rupees(10_000), ladder: [[1_000, rupees(6_000)]], submissions: 5 });

      const results = await Promise.all(submissions.map((s) => applyViewUpdate(s.id, 1_000)));

      expect(results.filter((r) => r.outcome === 'awarded')).toHaveLength(1);
      expect(results.filter((r) => r.outcome === 'insufficient_budget')).toHaveLength(4);
      const books = await expectConsistentBooks(campaign.id);
      expect(books.spentPaise).toBe(rupees(6_000));
      expect(await prisma.payoutLedgerEntry.count({ where: { campaignId: campaign.id } })).toBe(1);
    });

    it('funds exactly as many payouts as the budget allows under heavy parallel load', async () => {
      // ₹5,000 budget, ₹1,000 per post, 12 posts racing: exactly 5 can be paid.
      const { campaign, submissions } = await setup({ budget: rupees(5_000), ladder: [[100, rupees(1_000)]], submissions: 12 });

      const results = await Promise.all(submissions.map((s) => applyViewUpdate(s.id, 100)));

      expect(results.filter((r) => r.outcome === 'awarded')).toHaveLength(5);
      const books = await expectConsistentBooks(campaign.id);
      expect(books.spentPaise).toBe(rupees(5_000));
    });

    it('pays a single submission once when the same update arrives many times at once', async () => {
      const { campaign, submissions } = await setup({ budget: rupees(10_000), ladder: [[1_000, rupees(6_000)]], submissions: 1 });
      const submission = submissions[0]!;

      const results = await Promise.all(Array.from({ length: 10 }, () => applyViewUpdate(submission.id, 1_000)));

      expect(results.filter((r) => r.outcome === 'awarded')).toHaveLength(1);
      expect(await prisma.payoutLedgerEntry.count({ where: { submissionId: submission.id } })).toBe(1);
      const books = await expectConsistentBooks(campaign.id);
      expect(books.spentPaise).toBe(rupees(6_000));
    });

    it('stays consistent when different view counts for one submission race each other', async () => {
      const ladder: [number, number][] = [[10_000, rupees(500)], [50_000, rupees(2_000)], [100_000, rupees(5_000)]];
      const { campaign, submissions } = await setup({ budget: rupees(50_000), ladder, submissions: 1 });
      const submission = submissions[0]!;

      await Promise.all([10_000, 120_000, 50_000, 75_000, 100_000].map((views) => applyViewUpdate(submission.id, views)));

      const books = await expectConsistentBooks(campaign.id);
      const refreshed = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });
      // Whatever order the updates ran in, earned money is a sum of ledger rows that never exceeds the top rung.
      expect(refreshed.earnedPaise).toBeLessThanOrEqual(rupees(5_000));
      expect(books.spentPaise).toBe(refreshed.earnedPaise);
    });
  });

  describe('database-level safety net', () => {
    it('rejects any statement that would push spend above budget, even bypassing the service', async () => {
      const { campaign } = await setup({ budget: rupees(1_000), ladder: [[100, rupees(100)]], submissions: 0 });
      await expect(
        prisma.$executeRaw`UPDATE "Campaign" SET "spentPaise" = "budgetPaise" + 1 WHERE "id" = ${campaign.id}::uuid`,
      ).rejects.toThrow();
    });

    it('rejects a duplicate ledger idempotency key', async () => {
      const { campaign, submissions } = await setup({ budget: rupees(1_000), ladder: [[100, rupees(100)]], submissions: 1 });
      const submission = submissions[0]!;
      await applyViewUpdate(submission.id, 100);
      const entry = await prisma.payoutLedgerEntry.findFirstOrThrow({ where: { submissionId: submission.id } });
      await expect(
        prisma.payoutLedgerEntry.create({
          data: {
            campaignId: campaign.id,
            submissionId: submission.id,
            creatorId: entry.creatorId,
            milestoneId: entry.milestoneId,
            amountPaise: entry.amountPaise,
            previousEarnedPaise: entry.previousEarnedPaise,
            newEarnedPaise: entry.newEarnedPaise,
            viewsAtAward: entry.viewsAtAward,
            idempotencyKey: entry.idempotencyKey,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('sequential behaviour', () => {
    const ladder: [number, number][] = [[10_000, rupees(500)], [50_000, rupees(2_000)], [100_000, rupees(5_000)]];

    it('pays the highest milestone, then only the difference, and never twice', async () => {
      const { campaign, submissions } = await setup({ budget: rupees(50_000), ladder, submissions: 1 });
      const id = submissions[0]!.id;

      expect((await applyViewUpdate(id, 75_000)).awardedPaise).toBe(rupees(2_000));
      expect((await applyViewUpdate(id, 75_000)).outcome).toBe('up_to_date');
      expect((await applyViewUpdate(id, 100_000)).awardedPaise).toBe(rupees(3_000));

      const books = await expectConsistentBooks(campaign.id);
      expect(books.spentPaise).toBe(rupees(5_000));
      expect(await prisma.payoutLedgerEntry.count({ where: { submissionId: id } })).toBe(2);
    });

    it('holds back a payout that does not fit, then releases it once it does', async () => {
      const { campaign, submissions } = await setup({ budget: rupees(5_000), ladder, submissions: 2 });
      const [first, second] = [submissions[0]!, submissions[1]!];

      await applyViewUpdate(first.id, 50_000); // spends ₹2,000, leaving ₹3,000
      const blocked = await applyViewUpdate(second.id, 100_000); // needs ₹5,000

      expect(blocked.outcome).toBe('insufficient_budget');
      expect(blocked.earnedPaise).toBe(0);
      expect((await expectConsistentBooks(campaign.id)).spentPaise).toBe(rupees(2_000));

      // The first post reaching 100k needs only the ₹3,000 difference, which fits exactly.
      expect((await applyViewUpdate(first.id, 100_000)).outcome).toBe('awarded');
      expect((await expectConsistentBooks(campaign.id)).spentPaise).toBe(rupees(5_000));
    });

    it('does not claw back earnings when reported views drop', async () => {
      const { campaign, submissions } = await setup({ budget: rupees(50_000), ladder, submissions: 1 });
      const id = submissions[0]!.id;
      await applyViewUpdate(id, 60_000);

      const result = await applyViewUpdate(id, 500);

      expect(result.viewsDecreased).toBe(true);
      expect(result.earnedPaise).toBe(rupees(2_000));
      expect((await expectConsistentBooks(campaign.id)).spentPaise).toBe(rupees(2_000));
    });

    it('records views but pays nothing on a campaign that is not live', async () => {
      const { campaign, submissions } = await setup({ budget: rupees(50_000), ladder, submissions: 1, status: 'completed' });
      const result = await applyViewUpdate(submissions[0]!.id, 200_000);
      expect(result.outcome).toBe('campaign_not_live');
      expect(result.viewCount).toBe(200_000);
      expect((await expectConsistentBooks(campaign.id)).spentPaise).toBe(0);
    });

    it('flags a sudden spike without blocking the payout', async () => {
      const { submissions } = await setup({ budget: rupees(50_000), ladder, submissions: 1 });
      const result = await applyViewUpdate(submissions[0]!.id, 90_000);
      expect(result.suspicious).toBe(true);
      expect(result.outcome).toBe('awarded');
    });

    it('throws a not-found error for an unknown submission', async () => {
      await expect(applyViewUpdate('00000000-0000-4000-8000-000000000000', 10)).rejects.toBeInstanceOf(AppError);
    });
  });
});
