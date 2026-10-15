import type { Request, Response } from 'express';
import { AppError } from '../../utils/AppError';
import { parseOrThrow, uuidParam } from '../../utils/validate';
import { createSubmissionSchema, listSubmissionsQuerySchema, updateViewsSchema } from './submissions.schemas';
import { createSubmission, listSubmissions, updateSubmissionViews } from './submissions.service';

export async function createSubmissionHandler(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthenticated();
  const campaignId = parseOrThrow(uuidParam, req.params.id);
  const { postUrl } = parseOrThrow(createSubmissionSchema, req.body);
  res.status(201).json({ data: await createSubmission(req.user.id, campaignId, postUrl) });
}

export async function listHandler(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthenticated();
  const query = parseOrThrow(listSubmissionsQuerySchema, req.query);
  const { items, meta } = await listSubmissions(req.user, query);
  res.json({ data: items, meta });
}

export async function updateViewsHandler(req: Request, res: Response) {
  const submissionId = parseOrThrow(uuidParam, req.params.id);
  const { views } = parseOrThrow(updateViewsSchema, req.body);
  res.json({ data: await updateSubmissionViews(submissionId, views) });
}
