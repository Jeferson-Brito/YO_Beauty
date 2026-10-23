import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { AppError } from '../lib/errors';
import { checkoutSchema, orderListSchema, quoteSchema } from '../schemas/order.schema';
import { idSchema } from '../schemas/admin.schema';
import { orderService } from '../services/order.service';

function actor(req: Request) {
  if (!req.user) throw new AppError(401, 'Autenticação necessária.', 'UNAUTHENTICATED');
  return req.user;
}

export const quoteCart = asyncHandler(async (req: Request, res: Response) => {
  const body = quoteSchema.parse(req.body);
  res.json({ data: await orderService.quote(body.items) });
});

export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  const user = actor(req);
  const body = checkoutSchema.parse(req.body);
  res.status(201).json({ data: await orderService.place(user, body) });
});

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await orderService.listMine(actor(req).id) });
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await orderService.getForUser(params.id, actor(req)) });
});

export const listAdminOrders = asyncHandler(async (req: Request, res: Response) => {
  res.json(await orderService.listAdmin(orderListSchema.parse(req.query)));
});

export const getAdminOrder = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await orderService.getForUser(params.id, actor(req)) });
});

export const cancelAdminOrder = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await orderService.cancel(params.id) });
});
