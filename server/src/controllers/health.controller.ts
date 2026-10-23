import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../lib/async-handler';

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    res.status(503).json({
      status: 'degraded',
      service: 'yo-beauty-api',
      database: 'down',
      time: new Date().toISOString(),
    });
    return;
  }

  res.json({
    status: 'ok',
    service: 'yo-beauty-api',
    database: 'up',
    time: new Date().toISOString(),
  });
});
