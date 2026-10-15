import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination';

export const MAX_VIEW_COUNT = 2_000_000_000;

export const createSubmissionSchema = z.object({
  postUrl: z.string({ required_error: 'Post link is required.' }).trim().min(1, 'Post link is required.').max(500),
});

export const updateViewsSchema = z.object({
  views: z
    .number({ required_error: 'views is required.', invalid_type_error: 'views must be a number.' })
    .int('views must be a whole number.')
    .min(0, 'views cannot be negative.')
    .max(MAX_VIEW_COUNT, 'views is unrealistically large.'),
});

export const listSubmissionsQuerySchema = paginationQuerySchema.extend({
  campaignId: z.string().uuid().optional(),
});
