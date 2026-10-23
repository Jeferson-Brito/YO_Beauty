import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { slugSchema } from '../schemas/catalog.schema';
import { reviewWriteSchema } from '../schemas/review.schema';
import { reviewService } from '../services/review.service';
import { AppError } from '../lib/errors';
import { z } from 'zod';

const reviewParamsSchema = slugSchema.extend({
  reviewId: z.string().trim().min(1),
});

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const params = slugSchema.parse(req.params);
  res.json({ data: await reviewService.list(params.slug, req.user?.id) });
});

export const saveReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Autenticação necessária.', 'UNAUTHENTICATED');
  const params = slugSchema.parse(req.params);
  const body = reviewWriteSchema.parse(req.body);
  const review = await reviewService.save(params.slug, req.user, body);
  res.status(200).json({ data: review });
});

export const removeReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Autenticação necessária.', 'UNAUTHENTICATED');
  const params = reviewParamsSchema.parse(req.params);
  await reviewService.remove(params.slug, params.reviewId, req.user);
  res.status(204).send();
});
