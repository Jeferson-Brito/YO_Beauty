import { Router, type RequestHandler } from 'express';
import { env } from '../config/env';
import { adminRoutes } from './admin.routes';
import { analyticsRoutes } from './analytics.routes';
import { authRoutes } from './auth.routes';
import { catalogRoutes } from './catalog.routes';
import { healthRoutes } from './health.routes';
import { orderRoutes } from './order.routes';
import { apiRateLimit } from '../middlewares/rate-limit';

export const apiRouter = Router();

const limitApi: RequestHandler = env.NODE_ENV === 'test' ? (_req, _res, next) => next() : apiRateLimit;

apiRouter.use(limitApi);
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use(analyticsRoutes);
apiRouter.use(orderRoutes);
apiRouter.use(catalogRoutes);
