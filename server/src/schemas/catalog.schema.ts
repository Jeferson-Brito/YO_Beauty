import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const productListSchema = paginationSchema.extend({
  q: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
  category: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
  sort: z.enum(['recent', 'price_asc', 'price_desc', 'name']).default('recent'),
  availability: z.enum(['all', 'in_stock']).default('all'),
  collection: z.enum(['new', 'sale']).optional(),
});

export const categoryListSchema = z.object({
  placement: z.enum(['all', 'menu', 'home']).default('all'),
});

export const slugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido.'),
});

export function pageWindow(page: number, pageSize: number) {
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function pageMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
