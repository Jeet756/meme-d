/**
 * Demo data for local development. Everything here is clearly fake: the accounts end in @memed.demo
 * and the post links point at placeholder ids. Payouts are produced by the real payout service,
 * so the ledger, budgets and earnings are internally consistent.
 *
 *   npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { applyViewUpdate } from '../src/modules/payouts/payout.service';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@12345';
const rupees = (amount: number) => amount * 100;

async function createUser(name: string, email: string, role: 'brand' | 'creator') {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.create({ data: { name, email, role, passwordHash } });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data while NODE_ENV=production.');
  }
  if (await prisma.user.findUnique({ where: { email: 'brand@memed.demo' } })) {
    console.log('Demo data already exists. Nothing to do.');
    return;
  }

  const brand = await createUser('Aurora Labs (demo)', 'brand@memed.demo', 'brand');
  const asha = await createUser('Asha Verma (demo)', 'asha@memed.demo', 'creator');
  const kabir = await createUser('Kabir Rao (demo)', 'kabir@memed.demo', 'creator');
  const meera = await createUser('Meera Nair (demo)', 'meera@memed.demo', 'creator');

  const monsoon = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      name: 'Monsoon Drop: Reel Challenge',
      description: 'Show how you style the Monsoon Drop jacket in a 15 to 30 second reel. Original audio preferred.',
      platform: 'instagram',
      status: 'live',
      budgetPaise: rupees(50_000),
      milestones: {
        create: [
          { minViews: 10_000, payoutPaise: rupees(500) },
          { minViews: 50_000, payoutPaise: rupees(2_000) },
          { minViews: 100_000, payoutPaise: rupees(5_000) },
        ],
      },
    },
  });

  // Deliberately small budget so the "waiting for budget" state is visible in the demo.
  const studio = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      name: 'Studio Tour Shorts',
      description: 'Give your audience a 60 second tour of your creative workspace using our desk setup.',
      platform: 'youtube',
      status: 'live',
      budgetPaise: rupees(8_000),
      milestones: {
        create: [
          { minViews: 5_000, payoutPaise: rupees(800) },
          { minViews: 25_000, payoutPaise: rupees(3_000) },
          { minViews: 75_000, payoutPaise: rupees(6_000) },
        ],
      },
    },
  });

  await prisma.campaign.create({
    data: {
      brandId: brand.id,
      name: 'Winter Capsule Teaser (draft)',
      description: 'Teaser concepts for the winter capsule collection. Not launched yet.',
      platform: 'instagram',
      status: 'draft',
      budgetPaise: rupees(20_000),
      milestones: { create: [{ minViews: 20_000, payoutPaise: rupees(1_000) }] },
    },
  });

  const submit = (campaignId: string, creatorId: string, postUrl: string) =>
    prisma.submission.create({ data: { campaignId, creatorId, postUrl } });

  const ashaReel = await submit(monsoon.id, asha.id, 'https://www.instagram.com/reel/DEMOashaReel01');
  const kabirReel = await submit(monsoon.id, kabir.id, 'https://www.instagram.com/reel/DEMOkabirReel1');
  const ashaTour = await submit(studio.id, asha.id, 'https://www.youtube.com/watch?v=DEMOashaTour');
  const meeraTour = await submit(studio.id, meera.id, 'https://www.youtube.com/watch?v=DEMOmeeraTour');

  await applyViewUpdate(ashaReel.id, 75_000); // earns ₹2,000, the highest milestone crossed, not ₹2,500
  await applyViewUpdate(kabirReel.id, 12_400); // earns ₹500
  await applyViewUpdate(ashaTour.id, 30_000); // earns ₹3,000
  await applyViewUpdate(meeraTour.id, 80_000); // owes ₹6,000 but only ₹5,000 is left: waits for budget

  console.log('Seeded demo data. Sign in with password "%s":', DEMO_PASSWORD);
  console.log('  brand:    brand@memed.demo');
  console.log('  creators: asha@memed.demo, kabir@memed.demo, meera@memed.demo');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
