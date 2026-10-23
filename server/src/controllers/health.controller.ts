import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../lib/async-handler';

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const detail = databaseFailure(error);
    console.error('[yo-beauty] banco indisponivel', detail);
    res.status(503).json({
      status: 'degraded',
      service: 'yo-beauty-api',
      database: 'down',
      detail,
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

function databaseFailure(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'ERRO';
  const message = error instanceof Error ? error.message : 'Falha ao consultar o banco.';
  const safe = message.split('\n')[0].replace(/postgres(?:ql)?:\/\/\S+/gi, '[url]').slice(0, 220);
  return `${code}: ${safe}`;
}
