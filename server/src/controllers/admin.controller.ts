import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { AppError } from '../lib/errors';
import {
  adminProductQuerySchema,
  bannerWriteSchema,
  categoryWriteSchema,
  idSchema,
  imageAltSchema,
  imageParamsSchema,
  pageWriteSchema,
  productWriteSchema,
  reorderSchema,
  sectionWriteSchema,
  settingsWriteSchema,
} from '../schemas/admin.schema';
import { adminCatalogService } from '../services/admin-catalog.service';

function actorId(req: Request): string {
  if (!req.user) throw new AppError(401, 'Autenticação necessária.', 'UNAUTHENTICATED');
  return req.user.id;
}

function imageBuffer(req: Request): Buffer {
  if (!req.file?.buffer?.length) throw new AppError(422, 'Escolha uma imagem.', 'IMAGE_REQUIRED');
  return req.file.buffer;
}

function altText(req: Request): string {
  return typeof req.body?.altText === 'string' ? req.body.altText.trim().slice(0, 160) : '';
}

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  res.json(await adminCatalogService.listProducts(adminProductQuerySchema.parse(req.query)));
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.product(params.id) });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = productWriteSchema.parse(req.body);
  res.status(201).json({ data: await adminCatalogService.createProduct(body, actorId(req)) });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  const body = productWriteSchema.parse(req.body);
  res.json({ data: await adminCatalogService.updateProduct(params.id, body, actorId(req)) });
});

export const listChanges = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.changes(params.id) });
});

export const addImage = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.status(201).json({ data: await adminCatalogService.addImage(params.id, imageBuffer(req), altText(req)) });
});

export const updateImage = asyncHandler(async (req: Request, res: Response) => {
  const params = imageParamsSchema.parse(req.params);
  const body = imageAltSchema.parse(req.body);
  res.json({ data: await adminCatalogService.updateImageAlt(params.id, params.imageId, body.altText) });
});

export const reorderImages = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  const body = reorderSchema.parse(req.body);
  res.json({ data: await adminCatalogService.reorderImages(params.id, body.imageIds) });
});

export const removeImage = asyncHandler(async (req: Request, res: Response) => {
  const params = imageParamsSchema.parse(req.params);
  await adminCatalogService.removeImage(params.id, params.imageId);
  res.status(204).end();
});

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await adminCatalogService.categories() });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ data: await adminCatalogService.createCategory(categoryWriteSchema.parse(req.body)) });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.updateCategory(params.id, categoryWriteSchema.parse(req.body)) });
});

export const removeCategory = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  await adminCatalogService.deleteCategory(params.id);
  res.status(204).end();
});

export const uploadCategoryImage = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.setCategoryImage(params.id, imageBuffer(req)) });
});

export const listSections = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await adminCatalogService.sections() });
});

export const createSection = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ data: await adminCatalogService.saveSection(sectionWriteSchema.parse(req.body)) });
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.saveSection(sectionWriteSchema.parse(req.body), params.id) });
});

export const removeSection = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  await adminCatalogService.deleteSection(params.id);
  res.status(204).end();
});

export const uploadSectionImage = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.setSectionImage(params.id, imageBuffer(req)) });
});

export const listBanners = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await adminCatalogService.banners() });
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ data: await adminCatalogService.saveBanner(bannerWriteSchema.parse(req.body)) });
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.saveBanner(bannerWriteSchema.parse(req.body), params.id) });
});

export const removeBanner = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  await adminCatalogService.deleteBanner(params.id);
  res.status(204).end();
});

export const uploadBannerImage = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.setBannerImage(params.id, imageBuffer(req)) });
});

export const listPages = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await adminCatalogService.pages() });
});

export const createPage = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ data: await adminCatalogService.savePage(pageWriteSchema.parse(req.body)) });
});

export const updatePage = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  res.json({ data: await adminCatalogService.savePage(pageWriteSchema.parse(req.body), params.id) });
});

export const removePage = asyncHandler(async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  await adminCatalogService.deletePage(params.id);
  res.status(204).end();
});

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await adminCatalogService.settings() });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await adminCatalogService.updateSettings(settingsWriteSchema.parse(req.body)) });
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await adminCatalogService.setLogo(imageBuffer(req)) });
});
