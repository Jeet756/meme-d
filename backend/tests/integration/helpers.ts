import bcrypt from 'bcryptjs';
import { prisma } from '../../src/config/prisma';

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

/**
 * Integration tests need a real PostgreSQL database. Without TEST_DATABASE_URL these suites are
 * skipped and Jest reports them as skipped, never as passed.
 */
export const describeDb: jest.Describe = hasTestDatabase ? describe : describe.skip;

export const rupees = (amount: number) => amount * 100;

function assertSafeToWipe() {
  const databaseName = new URL(process.env.DATABASE_URL ?? 'postgresql://x/x').pathname;
  if (!/test/i.test(databaseName)) {
    throw new Error(`Refusing to wipe "${databaseName}": the test database name must contain "test".`);
  }
}

export async function resetDatabase() {
  assertSafeToWipe();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "PayoutLedgerEntry", "Submission", "Milestone", "Campaign", "User" RESTART IDENTITY CASCADE',
  );
}

let userCounter = 0;
export async function createUser(role: 'brand' | 'creator', name = `${role} ${++userCounter}`) {
  const passwordHash = await bcrypt.hash('Passw0rd!', 4); // low cost: tests only
  return prisma.user.create({
    data: { name, role, passwordHash, email: `${role}${++userCounter}-${Date.now()}@test.local` },
  });
}

export interface CampaignFixture {
  brandId: string;
  budgetPaise: number;
  status?: 'draft' | 'live' | 'completed';
  milestones: { minViews: number; payoutPaise: number }[];
}

export async function createCampaign(fixture: CampaignFixture) {
  return prisma.campaign.create({
    data: {
      brandId: fixture.brandId,
      name: 'Test campaign',
      description: 'A campaign created by the test suite.',
      platform: 'instagram',
      status: fixture.status ?? 'live',
      budgetPaise: fixture.budgetPaise,
      milestones: { create: fixture.milestones },
    },
  });
}

let postCounter = 0;
export async function createSubmission(campaignId: string, creatorId: string) {
  return prisma.submission.create({
    data: { campaignId, creatorId, postUrl: `https://www.instagram.com/reel/TEST${++postCounter}` },
  });
}

/** Asserts the accounting invariants that must hold after any sequence of updates. */
export async function expectConsistentBooks(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const ledger = await prisma.payoutLedgerEntry.aggregate({ where: { campaignId }, _sum: { amountPaise: true } });
  const earned = await prisma.submission.aggregate({ where: { campaignId }, _sum: { earnedPaise: true } });
  expect(campaign.spentPaise).toBeLessThanOrEqual(campaign.budgetPaise);
  expect(ledger._sum.amountPaise ?? 0).toBe(campaign.spentPaise);
  expect(earned._sum.earnedPaise ?? 0).toBe(campaign.spentPaise);
  return campaign;
}
