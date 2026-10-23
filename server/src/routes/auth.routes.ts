import { Router, type RequestHandler } from 'express';
import { env } from '../config/env';
import { googleConfig, googleLogin, login, logout, me, register } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';
import { authRateLimit } from '../middlewares/rate-limit';

const limitAuth: RequestHandler = env.NODE_ENV === 'test' ? (_req, _res, next) => next() : authRateLimit;

export const authRoutes = Router();

authRoutes.post('/register', limitAuth, register);
authRoutes.post('/login', limitAuth, login);
authRoutes.get('/google/config', googleConfig);
authRoutes.post('/google', limitAuth, googleLogin);
authRoutes.post('/logout', logout);
authRoutes.get('/me', requireAuth, me);
