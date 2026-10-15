import type { Request, Response } from 'express';
import { AppError } from '../../utils/AppError';
import { paginationQuerySchema } from '../../utils/pagination';
import { parseOrThrow, uuidParam } from '../../utils/validate';
import { listSubmissionsForCampaign } from '../submissions/submissions.service';
import {
  createCampaignSchema,
  listCampaignsQuerySchema,
  updateCampaignStatusSchema,
} from './campaigns.schemas';
import {
  createCampaign,
  getCampaign,
  getCampaignBudget,
  listCampaigns,
  updateCampaignStatus,
} from './campaigns.service';

function requireUser(req: Request) {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}

const campaignId = (req: Request) => parseOrThrow(uuidParam, req.params.id);

export async function create(req: Request, res: Response) {
  const input = parseOrThrow(createCampaignSchema, req.body);
  res.status(201).json({ data: await createCampaign(requireUser(req).id, input) });
}

export async function list(req: Request, res: Response) {
  const query = parseOrThrow(listCampaignsQuerySchema, req.query);
  const { items, meta } = await listCampaigns(query, req.user);
  res.json({ data: items, meta });
}

export async function getOne(req: Request, res: Response) {
  res.json({ data: await getCampaign(campaignId(req), req.user) });
}

export async function getBudget(req: Request, res: Response) {
  res.json({ data: await getCampaignBudget(campaignId(req), requireUser(req).id) });
}

export async function changeStatus(req: Request, res: Response) {
  const { status } = parseOrThrow(updateCampaignStatusSchema, req.body);
  res.json({ data: await updateCampaignStatus(campaignId(req), requireUser(req).id, status) });
}

export async function listSubmissions(req: Request, res: Response) {
  const pagination = parseOrThrow(paginationQuerySchema, req.query);
  const { items, meta } = await listSubmissionsForCampaign(campaignId(req), requireUser(req).id, pagination);
  res.json({ data: items, meta });
}
