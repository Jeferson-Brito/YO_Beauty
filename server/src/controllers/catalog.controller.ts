import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { categoryListSchema, productListSchema, slugSchema } from '../schemas/catalog.schema';
import { catalogService } from '../services/catalog.service';

export const getStore = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await catalogService.store() });
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const query = categoryListSchema.parse(req.query);
  res.json({ data: await catalogService.categories(query.placement) });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const params = slugSchema.parse(req.params);
  const query = productListSchema.parse(req.query);
  res.json({ data: await catalogService.category(params.slug, query) });
});

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = productListSchema.parse(req.query);
  res.json(await catalogService.products(query));
});

export const getFeaturedProducts = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await catalogService.featured());
});

export const getNewArrivals = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await catalogService.newArrivals());
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const params = slugSchema.parse(req.params);
  res.json({ data: await catalogService.product(params.slug) });
});

export const getBanners = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await catalogService.banners() });
});

export const getHomeSections = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await catalogService.sections() });
});

export const getHome = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await catalogService.home() });
});

export const getPage = asyncHandler(async (req: Request, res: Response) => {
  const params = slugSchema.parse(req.params);
  res.json({ data: await catalogService.page(params.slug) });
});
