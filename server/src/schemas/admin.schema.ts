import { z } from 'zod';

const money = z.number().int().min(0).max(100_000_000);
const sortOrder = z.number().int().min(0).max(999);

const optionalLink = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((value) => {
    const text = value?.trim() ?? '';
    return text ? text : null;
  })
  .refine(
    (value) => value === null || value.startsWith('/') || /^https?:\/\//.test(value),
    'Use um caminho da loja, como /produtos, ou um link http(s).',
  );

export const adminProductQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ALL'),
  categoryId: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const productWriteSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().max(80).optional(),
    description: z.string().trim().min(1).max(5000),
    shortDescription: z.string().trim().max(240).optional().nullable(),
    sku: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => {
        const text = value?.trim() ?? '';
        return text ? text : undefined;
      })
      .refine((value) => value === undefined || value.length >= 2, 'O SKU precisa ter pelo menos 2 caracteres.'),
    priceCents: money,
    salePriceCents: money.nullable().optional(),
    stockQuantity: z.number().int().min(0).max(1_000_000),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
    featured: z.boolean(),
    isNewArrival: z.boolean(),
    categories: z
      .array(
        z.object({
          categoryId: z.string().trim().min(1).max(80),
          isPrimary: z.boolean(),
        }),
      )
      .min(1)
      .max(12),
  })
  .superRefine((value, ctx) => {
    if (value.salePriceCents != null && value.salePriceCents >= value.priceCents) {
      ctx.addIssue({
        code: 'custom',
        path: ['salePriceCents'],
        message: 'O preço promocional precisa ser menor que o preço.',
      });
    }
    if (value.categories.filter((item) => item.isPrimary).length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['categories'],
        message: 'Escolha uma categoria principal.',
      });
    }
    const ids = new Set(value.categories.map((item) => item.categoryId));
    if (ids.size !== value.categories.length) {
      ctx.addIssue({ code: 'custom', path: ['categories'], message: 'Há uma categoria repetida.' });
    }
  });

export const categoryWriteSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).default(''),
  imageUrl: z.string().trim().max(300).nullable().optional(),
  active: z.boolean(),
  showInMenu: z.boolean(),
  showOnHome: z.boolean(),
  sortOrder,
});

export const sectionWriteSchema = z
  .object({
    title: z.string().trim().min(2).max(80),
    subtitle: z.string().trim().max(160).default(''),
    description: z.string().trim().max(500).default(''),
    type: z.enum(['manual', 'featured', 'new_arrivals', 'promotions', 'best_sellers', 'category']),
    placement: z.enum(['home-grid', 'home-extra', 'home-block']),
    active: z.boolean(),
    sortOrder,
    productsLimit: z.number().int().min(1).max(24),
    categoryId: z.string().trim().min(1).max(80).nullable().optional(),
    buttonText: z.string().trim().max(40).optional().nullable(),
    buttonUrl: optionalLink,
    productIds: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'category' && !value.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Escolha a categoria da seção.' });
    }
    if (new Set(value.productIds).size !== value.productIds.length) {
      ctx.addIssue({ code: 'custom', path: ['productIds'], message: 'Há um produto repetido na seção.' });
    }
  });

export const bannerWriteSchema = z.object({
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(200).default(''),
  eyebrow: z.string().trim().max(120).default(''),
  altText: z.string().trim().max(160).default(''),
  buttonText: z.string().trim().max(40).optional().nullable(),
  buttonUrl: optionalLink,
  position: z.enum(['hero', 'promo-left', 'promo-right']),
  active: z.boolean(),
  sortOrder,
  imageUrl: z.string().trim().max(300).nullable().optional(),
});

const httpUrl = z
  .string()
  .trim()
  .max(200)
  .refine((value) => value === '' || /^https?:\/\//.test(value), 'Informe um link http(s) ou deixe em branco.');

export const settingsWriteSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(120),
  whatsappNumber: z
    .string()
    .trim()
    .max(20)
    .refine((value) => value === '' || /^[0-9+\s()-]+$/.test(value), 'Informe o WhatsApp só com números.'),
  whatsappMessage: z.string().trim().max(240),
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === '' || z.string().email().safeParse(value).success, 'E-mail de contato inválido.'),
  contactPhone: z.string().trim().max(30),
  freeShippingMessage: z.string().trim().max(120),
  freeShippingThresholdCents: money,
  installmentMessage: z.string().trim().max(120),
  supportBarMessage: z.string().trim().max(120),
  businessHours: z.string().trim().max(120),
  footerNote: z.string().trim().max(180),
  socialLinks: z.object({
    instagram: httpUrl,
    facebook: httpUrl,
    tiktok: httpUrl,
    youtube: httpUrl,
  }),
  paymentMethods: z.object({
    cash: z.boolean(),
    pix: z.boolean(),
    creditCard: z.boolean(),
    debitCard: z.boolean(),
  }),
  benefits: z
    .array(
      z.object({
        icon: z.string().trim().max(40).optional(),
        title: z.string().trim().min(2).max(80),
        description: z.string().trim().max(120).optional(),
      }),
    )
    .max(6),
  lowStockThreshold: z.number().int().min(0).max(100),
});

export const pageWriteSchema = z.object({
  title: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  content: z.string().trim().min(1).max(20000),
  active: z.boolean(),
});

export const imageAltSchema = z.object({
  altText: z.string().trim().max(160),
});

export const reorderSchema = z.object({
  imageIds: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
});

export const idSchema = z.object({
  id: z.string().trim().min(1).max(80),
});

export const imageParamsSchema = z.object({
  id: z.string().trim().min(1).max(80),
  imageId: z.string().trim().min(1).max(80),
});
