import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { describeDb, resetDatabase, rupees } from './helpers';

const app = createApp();

const validCampaign = {
  name: 'Summer Launch Reels',
  description: 'Create a reel featuring our new summer range.',
  platform: 'instagram',
  budgetPaise: rupees(10_000),
  milestones: [
    { minViews: 10_000, payoutPaise: rupees(500) },
    { minViews: 50_000, payoutPaise: rupees(2_000) },
    { minViews: 100_000, payoutPaise: rupees(5_000) },
  ],
};

async function signUpAgent(role: 'brand' | 'creator', label: string) {
  const agent = request.agent(app);
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const res = await agent.post('/api/auth/signup').send({ name: `${label} user`, email, password: 'Passw0rd!', role });
  expect(res.status).toBe(201);
  return { agent, email, user: res.body.data.user as { id: string } };
}

describeDb('REST API', () => {
  beforeAll(resetDatabase);
  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  describe('health and basics', () => {
    it('reports healthy with a reachable database', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.data.database).toBe('up');
    });

    it('returns a JSON 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nope');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects cross-site state-changing requests from untrusted origins', async () => {
      const res = await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({});
      expect(res.status).toBe(403);
    });

    it('does not leak internals for malformed JSON', async () => {
      const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|stack/i);
    });
  });

  describe('authentication', () => {
    it('signs up, sets an HttpOnly cookie, and returns the profile from /me without a password hash', async () => {
      const { agent, email } = await signUpAgent('creator', 'auth');
      const me = await agent.get('/api/auth/me');
      expect(me.status).toBe(200);
      expect(me.body.data.user.email).toBe(email);
      expect(JSON.stringify(me.body)).not.toMatch(/passwordHash/);
    });

    it('sets the session cookie as HttpOnly', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Cookie Check', email: `cookie-${Date.now()}@test.local`, password: 'Passw0rd!', role: 'brand' });
      const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).join(';');
      expect(cookie).toMatch(/memed_token=/);
      expect(cookie).toMatch(/HttpOnly/i);
    });

    it('rejects invalid signup payloads with field errors', async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'A', email: 'nope', password: 'short', role: 'admin' });
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['name', 'email', 'password', 'role']));
    });

    it('rejects a duplicate email with 409', async () => {
      const { email } = await signUpAgent('brand', 'dup');
      const res = await request(app).post('/api/auth/signup').send({ name: 'Again', email, password: 'Passw0rd!', role: 'brand' });
      expect(res.status).toBe(409);
    });

    it('logs in with correct credentials and gives the same error for a wrong password and an unknown email', async () => {
      const { email } = await signUpAgent('creator', 'login');
      const ok = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!' });
      expect(ok.status).toBe(200);
      const wrongPassword = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password1' });
      const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'ghost@test.local', password: 'wrong-password1' });
      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
    });

    it('requires authentication for /me and rejects garbage tokens', async () => {
      expect((await request(app).get('/api/auth/me')).status).toBe(401);
      expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.token')).status).toBe(401);
    });

    it('ends the session on logout', async () => {
      const { agent } = await signUpAgent('creator', 'logout');
      await agent.post('/api/auth/logout').expect(200);
      expect((await agent.get('/api/auth/me')).status).toBe(401);
    });
  });

  describe('campaigns and authorization', () => {
    it('lets a brand create a campaign and returns the owner view', async () => {
      const { agent } = await signUpAgent('brand', 'brandA');
      const res = await agent.post('/api/campaigns').send(validCampaign);
      expect(res.status).toBe(201);
      expect(res.body.data.spentPaise).toBe(0);
      expect(res.body.data.milestones).toHaveLength(3);
    });

    it('forbids creators and anonymous users from creating campaigns', async () => {
      const { agent } = await signUpAgent('creator', 'creatorA');
      expect((await agent.post('/api/campaigns').send(validCampaign)).status).toBe(403);
      expect((await request(app).post('/api/campaigns').send(validCampaign)).status).toBe(401);
    });

    it.each([
      ['duplicate thresholds', { milestones: [{ minViews: 100, payoutPaise: 100 }, { minViews: 100, payoutPaise: 200 }] }],
      ['payouts that do not increase', { milestones: [{ minViews: 100, payoutPaise: 500 }, { minViews: 200, payoutPaise: 400 }] }],
      ['negative payout', { milestones: [{ minViews: 100, payoutPaise: -5 }] }],
      ['top payout above budget', { budgetPaise: 100_00, milestones: [{ minViews: 100, payoutPaise: 100_01 }] }],
      ['no milestones', { milestones: [] }],
      ['fractional budget', { budgetPaise: 100.5 }],
    ])('rejects an invalid campaign: %s', async (_label, overrides) => {
      const { agent } = await signUpAgent('brand', 'brandInvalid');
      const res = await agent.post('/api/campaigns').send({ ...validCampaign, ...overrides });
      expect(res.status).toBe(400);
    });

    it('hides drafts from the public and from other brands, but not from the owner', async () => {
      const owner = await signUpAgent('brand', 'draftOwner');
      const other = await signUpAgent('brand', 'draftOther');
      const draft = await owner.agent.post('/api/campaigns').send({ ...validCampaign, name: 'Secret Draft', status: 'draft' });
      const id = draft.body.data.id as string;

      expect((await request(app).get(`/api/campaigns/${id}`)).status).toBe(404);
      expect((await other.agent.get(`/api/campaigns/${id}`)).status).toBe(404);
      expect((await owner.agent.get(`/api/campaigns/${id}`)).status).toBe(200);

      const publicList = await request(app).get('/api/campaigns?pageSize=50');
      expect(JSON.stringify(publicList.body)).not.toMatch(/Secret Draft/);
      const mine = await owner.agent.get('/api/campaigns?mine=true');
      expect(JSON.stringify(mine.body)).toMatch(/Secret Draft/);
    });

    it('does not expose brand emails or spend on the public list', async () => {
      const { agent } = await signUpAgent('brand', 'publicShape');
      await agent.post('/api/campaigns').send(validCampaign);
      const res = await request(app).get('/api/campaigns');
      expect(res.status).toBe(200);
      const first = res.body.data[0];
      expect(first).not.toHaveProperty('spentPaise');
      expect(first.brand).toEqual({ name: expect.any(String) });
      expect(res.body.meta).toEqual(expect.objectContaining({ page: 1 }));
    });

    it('restricts the budget endpoint to the owning brand', async () => {
      const owner = await signUpAgent('brand', 'budgetOwner');
      const other = await signUpAgent('brand', 'budgetOther');
      const creator = await signUpAgent('creator', 'budgetCreator');
      const id = (await owner.agent.post('/api/campaigns').send(validCampaign)).body.data.id as string;

      const ok = await owner.agent.get(`/api/campaigns/${id}/budget`);
      expect(ok.status).toBe(200);
      expect(ok.body.data.remainingPaise).toBe(rupees(10_000));
      expect(ok.body.data.ledgerMatchesSpend).toBe(true);
      expect((await other.agent.get(`/api/campaigns/${id}/budget`)).status).toBe(403);
      expect((await creator.agent.get(`/api/campaigns/${id}/budget`)).status).toBe(403);
      expect((await request(app).get(`/api/campaigns/${id}/budget`)).status).toBe(401);
      expect((await owner.agent.get('/api/campaigns/00000000-0000-4000-8000-000000000000/budget')).status).toBe(404);
      expect((await owner.agent.get('/api/campaigns/not-a-uuid/budget')).status).toBe(400);
    });

    it('prevents one brand from changing the status of another brand\'s campaign', async () => {
      const owner = await signUpAgent('brand', 'statusOwner');
      const other = await signUpAgent('brand', 'statusOther');
      const id = (await owner.agent.post('/api/campaigns').send(validCampaign)).body.data.id as string;
      expect((await other.agent.patch(`/api/campaigns/${id}/status`).send({ status: 'completed' })).status).toBe(403);
      expect((await owner.agent.patch(`/api/campaigns/${id}/status`).send({ status: 'completed' })).status).toBe(200);
      expect((await owner.agent.patch(`/api/campaigns/${id}/status`).send({ status: 'live' })).status).toBe(409);
    });
  });

  describe('submissions, view updates and payouts end to end', () => {
    it('runs the full payout journey with no duplicate payments and no overspend', async () => {
      const brand = await signUpAgent('brand', 'journeyBrand');
      const creator = await signUpAgent('creator', 'journeyCreator');
      const rival = await signUpAgent('creator', 'journeyRival');

      const campaign = (
        await brand.agent.post('/api/campaigns').send({ ...validCampaign, budgetPaise: rupees(5_000) })
      ).body.data;

      // Submissions: valid, duplicate, bad URL, wrong role, unknown campaign.
      const postUrl = 'https://www.instagram.com/reel/JourneyPost1/?utm_source=ig_web';
      const created = await creator.agent.post(`/api/campaigns/${campaign.id}/submissions`).send({ postUrl });
      expect(created.status).toBe(201);
      expect(created.body.data.postUrl).toBe('https://www.instagram.com/reel/JourneyPost1');
      expect((await creator.agent.post(`/api/campaigns/${campaign.id}/submissions`).send({ postUrl })).status).toBe(409);
      expect((await creator.agent.post(`/api/campaigns/${campaign.id}/submissions`).send({ postUrl: 'https://example.com/x' })).status).toBe(400);
      expect((await brand.agent.post(`/api/campaigns/${campaign.id}/submissions`).send({ postUrl })).status).toBe(403);
      expect((await creator.agent.post('/api/campaigns/00000000-0000-4000-8000-000000000000/submissions').send({ postUrl })).status).toBe(404);

      const submissionId = created.body.data.id as string;

      // Invalid view updates.
      expect((await request(app).patch(`/api/submissions/${submissionId}/views`).send({ views: -1 })).status).toBe(400);
      expect((await request(app).patch(`/api/submissions/${submissionId}/views`).send({ views: 10.5 })).status).toBe(400);
      expect((await request(app).patch(`/api/submissions/${submissionId}/views`).send({})).status).toBe(400);
      expect((await request(app).patch('/api/submissions/not-a-uuid/views').send({ views: 5 })).status).toBe(400);
      expect((await request(app).patch('/api/submissions/00000000-0000-4000-8000-000000000000/views').send({ views: 5 })).status).toBe(404);

      // 75,000 views -> ₹2,000 (highest milestone, not the sum).
      const first = await request(app).patch(`/api/submissions/${submissionId}/views`).send({ views: 75_000 });
      expect(first.status).toBe(200);
      expect(first.body.data.payout.awardedPaise).toBe(rupees(2_000));
      expect(first.body.data.submission.earnedPaise).toBe(rupees(2_000));

      // Repeating the update pays nothing more.
      const repeat = await request(app).patch(`/api/submissions/${submissionId}/views`).send({ views: 75_000 });
      expect(repeat.body.data.payout.outcome).toBe('up_to_date');

      // Creator earnings and payout history reflect exactly one payment.
      const earnings = await creator.agent.get('/api/creator/earnings');
      expect(earnings.body.data.totalEarnedPaise).toBe(rupees(2_000));
      const payouts = await creator.agent.get('/api/creator/payouts');
      expect(payouts.body.data).toHaveLength(1);

      // Privacy: another creator sees none of it, and a brand cannot read creator endpoints.
      expect((await rival.agent.get('/api/submissions')).body.data).toHaveLength(0);
      expect((await rival.agent.get('/api/creator/payouts')).body.data).toHaveLength(0);
      expect((await brand.agent.get('/api/creator/earnings')).status).toBe(403);
      expect((await creator.agent.get('/api/submissions')).body.data).toHaveLength(1);

      // A second creator racing for the remainder: ₹3,000 left, ₹5,000 owed -> blocked, nothing spent.
      const rivalPost = await rival.agent
        .post(`/api/campaigns/${campaign.id}/submissions`)
        .send({ postUrl: 'https://www.instagram.com/reel/JourneyPost2' });
      const blocked = await request(app).patch(`/api/submissions/${rivalPost.body.data.id}/views`).send({ views: 150_000 });
      expect(blocked.body.data.payout.outcome).toBe('insufficient_budget');
      expect(blocked.body.data.submission.payoutStatus).toBe('waiting_for_budget');
      expect(blocked.body.data.submission.earnedPaise).toBe(0);

      // Budget check: the ledger explains the spend and the cap holds.
      const budget = await brand.agent.get(`/api/campaigns/${campaign.id}/budget`);
      expect(budget.body.data.spentPaise).toBe(rupees(2_000));
      expect(budget.body.data.spentPaise).toBeLessThanOrEqual(budget.body.data.budgetPaise);
      expect(budget.body.data.ledgerMatchesSpend).toBe(true);
      expect(budget.body.data.submissionsWaitingForBudget).toBe(1);

      // The brand sees submissions on its campaign; the rival brand-less creator cannot.
      const brandView = await brand.agent.get(`/api/campaigns/${campaign.id}/submissions`);
      expect(brandView.body.data).toHaveLength(2);
      expect((await creator.agent.get(`/api/campaigns/${campaign.id}/submissions`)).status).toBe(403);

      // Brand overview aggregates real numbers.
      const overview = await brand.agent.get('/api/brand/overview');
      expect(overview.body.data.spentPaise).toBe(rupees(2_000));
      expect(overview.body.data.campaignCount).toBe(1);
    });
  });
});
