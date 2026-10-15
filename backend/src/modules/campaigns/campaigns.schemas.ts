import { z } from 'zod';
import { MAX_CAMPAIGN_BUDGET_PAISE } from '../../utils/money';
import { paginationQuerySchema } from '../../utils/pagination';
import { findLadderProblems } from '../payouts/payoutCalculator';

const MAX_VIEWS = 2_000_000_000;

const milestoneSchema = z.object({
  minViews: z
    .number({ invalid_type_error: 'View threshold must be a number.' })
    .int('View threshold must be a whole number.')
    .min(1, 'View threshold must be at least 1.')
    .max(MAX_VIEWS),
  payoutPaise: z
    .number({ invalid_type_error: 'Payout must be a number.' })
    .int('Payout must be a whole number of paise.')
    .min(1, 'Payout must be greater than zero.')
    .max(MAX_CAMPAIGN_BUDGET_PAISE),
});

export const createCampaignSchema = z
  .object({
    name: z.string({ required_error: 'Campaign name is required.' }).trim().min(3, 'Name must be at least 3 characters.').max(120),
    description: z
      .string({ required_error: 'Description is required.' })
      .trim()
      .min(10, 'Describe the campaign in at least 10 characters.')
      .max(2000),
    platform: z.enum(['instagram', 'youtube'], { errorMap: () => ({ message: 'Choose Instagram or YouTube.' }) }),
    budgetPaise: z
      .number({ required_error: 'Budget is required.', invalid_type_error: 'Budget must be a number.' })
      .int('Budget must be a whole number of paise.')
      .min(100, 'Budget must be at least ₹1.')
      .max(MAX_CAMPAIGN_BUDGET_PAISE, 'Budget cannot exceed ₹1,00,00,000.'),
    status: z.enum(['draft', 'live']).default('live'),
    milestones: z.array(milestoneSchema).min(1, 'Add at least one milestone.').max(12, 'Use at most 12 milestones.'),
  })
  .superRefine((value, ctx) => {
    for (const problem of findLadderProblems(value.milestones, value.budgetPaise)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['milestones'], message: problem });
    }
  });

export const listCampaignsQuerySchema = paginationQuerySchema.extend({
  platform: z.enum(['instagram', 'youtube']).optional(),
  status: z.enum(['draft', 'live', 'completed']).optional(),
  search: z.string().trim().min(1).max(80).optional(),
  mine: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const updateCampaignStatusSchema = z.object({
  status: z.enum(['live', 'completed'], { errorMap: () => ({ message: 'Status must be live or completed.' }) }),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
