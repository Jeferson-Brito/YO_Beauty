import { Router, type RequestHandler } from 'express';
import { env } from '../config/env';
import { getMyOrder, listMyOrders, placeOrder, quoteCart } from '../controllers/order.controller';
import { requireAuth } from '../middlewares/auth';
import { orderRateLimit } from '../middlewares/rate-limit';

const limitOrder: RequestHandler = env.NODE_ENV === 'test' ? (_req, _res, next) => next() : orderRateLimit;

export const orderRoutes = Router();

orderRoutes.post('/checkout/quote', quoteCart);
orderRoutes.post('/orders', limitOrder, requireAuth, placeOrder);
orderRoutes.get('/orders', requireAuth, listMyOrders);
orderRoutes.get('/orders/:id', requireAuth, getMyOrder);
