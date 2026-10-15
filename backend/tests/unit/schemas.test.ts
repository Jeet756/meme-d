import { signupSchema } from '../../src/modules/auth/auth.schemas';
import { createCampaignSchema } from '../../src/modules/campaigns/campaigns.schemas';
import { updateViewsSchema } from '../../src/modules/submissions/submissions.schemas';

const validCampaign = {
  name: 'Launch Reels',
  description: 'Make a reel about the launch.',
  platform: 'instagram',
  budgetPaise: 1_000_000,
  milestones: [
    { minViews: 1_000, payoutPaise: 10_000 },
    { minViews: 5_000, payoutPaise: 50_000 },
  ],
};

describe('signupSchema', () => {
  it('normalises the email and accepts a good payload', () => {
    const parsed = signupSchema.parse({ name: ' Asha ', email: 'ASHA@Example.COM ', password: 'abcdef12', role: 'creator' });
    expect(parsed.email).toBe('asha@example.com');
    expect(parsed.name).toBe('Asha');
  });

  it.each([
    ['too short', 'a1'],
    ['no number', 'abcdefgh'],
    ['no letter', '12345678'],
    ['over 72 characters', `a1${'x'.repeat(80)}`],
  ])('rejects a password that is %s', (_label, password) => {
    expect(signupSchema.safeParse({ name: 'Asha', email: 'a@b.co', password, role: 'creator' }).success).toBe(false);
  });

  it('rejects unknown roles such as admin', () => {
    expect(signupSchema.safeParse({ name: 'Asha', email: 'a@b.co', password: 'abcdef12', role: 'admin' }).success).toBe(false);
  });
});

describe('createCampaignSchema', () => {
  it('accepts a valid campaign and defaults status to live', () => {
    expect(createCampaignSchema.parse(validCampaign).status).toBe('live');
  });

  it('rejects an invalid milestone ladder', () => {
    const result = createCampaignSchema.safeParse({
      ...validCampaign,
      milestones: [{ minViews: 1_000, payoutPaise: 100 }, { minViews: 1_000, payoutPaise: 200 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects budgets above the ₹1 crore ceiling and non-integers', () => {
    expect(createCampaignSchema.safeParse({ ...validCampaign, budgetPaise: 1_000_000_001 }).success).toBe(false);
    expect(createCampaignSchema.safeParse({ ...validCampaign, budgetPaise: 99.5 }).success).toBe(false);
  });

  it('rejects unsupported platforms', () => {
    expect(createCampaignSchema.safeParse({ ...validCampaign, platform: 'tiktok' }).success).toBe(false);
  });
});

describe('updateViewsSchema', () => {
  it('accepts zero and ordinary counts', () => {
    expect(updateViewsSchema.safeParse({ views: 0 }).success).toBe(true);
    expect(updateViewsSchema.safeParse({ views: 123_456 }).success).toBe(true);
  });

  it.each([[-1], [1.5], ['100'], [null], [3_000_000_000]])('rejects %p', (views) => {
    expect(updateViewsSchema.safeParse({ views }).success).toBe(false);
  });
});
