import { Router, type RequestHandler } from 'express';
import { env } from '../config/env';
import { ingestEvents, saveConsent } from '../controllers/analytics.controller';
import { optionalAuth } from '../middlewares/auth';
import { analyticsRateLimit } from '../middlewares/rate-limit';

const limitAnalytics: RequestHandler = env.NODE_ENV === 'test' ? (_req, _res, next) => next() : analyticsRateLimit;

export const analyticsRoutes = Router();

analyticsRoutes.post('/analytics/consent', limitAnalytics, saveConsent);
analyticsRoutes.post('/analytics/events', limitAnalytics, optionalAuth, ingestEvents);
