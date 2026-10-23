import type { Request, Response } from 'express';
import { z } from 'zod';
import { PERIOD_PRESETS } from '../domain/periods';
import { asyncHandler } from '../lib/async-handler';
import { dashboardService } from '../services/dashboard.service';

const dashboardQuerySchema = z.object({
  preset: z.enum(PERIOD_PRESETS).default('last_30_days'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function queryOf(req: Request) {
  return dashboardQuerySchema.parse(req.query);
}

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await dashboardService.build(queryOf(req)) });
});

export const exportDashboard = asyncHandler(async (req: Request, res: Response) => {
  const csv = await dashboardService.csv(queryOf(req));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="yo-beauty-indicadores.csv"');
  res.send(csv);
});
