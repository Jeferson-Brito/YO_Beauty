import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { PeriodError } from '../domain/periods';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(422).json({
      error: 'Dados inválidos',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof PeriodError) {
    res.status(422).json({ error: error.message, code: 'INVALID_PERIOD' });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: 'Já existe um registro com esses dados.', code: 'DUPLICATE' });
    return;
  }

  console.error('[yo-beauty] erro não tratado');
  res.status(500).json({ error: 'Erro interno. Tente novamente em instantes.', code: 'INTERNAL' });
}
