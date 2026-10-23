import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';
import { asyncHandler } from '../lib/async-handler';
import { authService } from '../services/auth.service';

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.yb_session;
  if (typeof token !== 'string' || token.length < 20) {
    throw new AppError(401, 'Autenticação necessária.', 'UNAUTHENTICATED');
  }
  req.user = await authService.authenticate(token);
  next();
});

export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.yb_session;
  if (typeof token !== 'string' || token.length < 20) {
    next();
    return;
  }
  try {
    req.user = await authService.authenticate(token);
  } catch {
    req.user = undefined;
  }
  next();
});

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError(401, 'Autenticação necessária.', 'UNAUTHENTICATED'));
    return;
  }
  if (req.user.role !== 'ADMIN') {
    next(new AppError(403, 'Acesso restrito à administração da loja.', 'FORBIDDEN'));
    return;
  }
  next();
}
