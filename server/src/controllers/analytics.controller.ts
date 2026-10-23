import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { analyticsEventSchema, consentSchema } from '../schemas/analytics.schema';
import { analyticsService } from '../services/analytics.service';

export const saveConsent = asyncHandler(async (req: Request, res: Response) => {
  const body = consentSchema.parse(req.body);
  res.json({ data: await analyticsService.saveConsent(body.anonymousId, body.status) });
});

export const ingestEvents = asyncHandler(async (req: Request, res: Response) => {
  const body = analyticsEventSchema.parse(req.body);
  res.json({ data: await analyticsService.ingest(body, req.user?.id ?? null) });
});
