import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { SESSION_COOKIE, sessionCookieOptions } from '../lib/cookies';
import { env } from '../config/env';
import { googleLoginSchema, loginSchema, registerSchema } from '../schemas/auth.schema';
import { authService } from '../services/auth.service';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  await authService.register(body);
  const result = await authService.login(body);
  res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions());
  res.status(201).json({ data: result.user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.login(body);
  res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions());
  res.json({ data: result.user });
});

export const googleConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: { clientId: env.GOOGLE_CLIENT_ID || null } });
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const body = googleLoginSchema.parse(req.body);
  const result = await authService.loginWithGoogle(body.credential);
  res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions());
  res.json({ data: result.user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE];
  await authService.logout(typeof token === 'string' ? token : undefined);
  const { maxAge: _maxAge, ...cookieOptions } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: req.user });
});
