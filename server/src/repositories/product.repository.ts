import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const cardInclude = {
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  categories: { include: { category: true } },
} satisfies Prisma.ProductInclude;

const detailInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  categories: { include: { category: true } },
} satisfies Prisma.ProductInclude;

export type ProductCardRecord = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;
export type ProductDetailRecord = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

export type ProductListFilters = {
  skip: number;
  take: number;
  searchText?: string;
  categorySlug?: string;
  featured?: boolean;
  isNewArrival?: boolean;
  onSale?: boolean;
  inStock?: boolean;
  sort: 'recent' | 'price_asc' | 'price_desc' | 'name';
};

function orderBy(sort: ProductListFilters['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price_asc':
      return [{ effectivePriceCents: 'asc' }, { name: 'asc' }];
    case 'price_desc':
      return [{ effectivePriceCents: 'desc' }, { name: 'asc' }];
    case 'name':
      return [{ name: 'asc' }];
    default:
      return [{ createdAt: 'desc' }, { name: 'asc' }];
  }
}

function whereFrom(filters: Omit<ProductListFilters, 'skip' | 'take' | 'sort'>): Prisma.ProductWhereInput {
  return {
    status: 'ACTIVE',
    ...(filters.searchText ? { searchText: { contains: filters.searchText } } : {}),
    ...(filters.categorySlug
      ? { categories: { some: { category: { slug: filters.categorySlug, active: true } } } }
      : {}),
    ...(filters.featured ? { featured: true } : {}),
    ...(filters.isNewArrival ? { isNewArrival: true } : {}),
    ...(filters.inStock ? { stockQuantity: { gt: 0 } } : {}),
  };
}

export const productRepository = {
  include: { card: cardInclude, detail: detailInclude },

  async list(filters: ProductListFilters): Promise<{ items: ProductCardRecord[]; total: number }> {
    if (filters.onSale) {
      const rows = await prisma.product.findMany({
        where: { ...whereFrom(filters), salePriceCents: { not: null } },
        include: cardInclude,
        orderBy: orderBy(filters.sort),
      });
      const matched = rows.filter((row) => row.salePriceCents != null && row.salePriceCents < row.priceCents);
      return {
        items: matched.slice(filters.skip, filters.skip + filters.take),
        total: matched.length,
      };
    }
    const where = whereFrom(filters);
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: cardInclude,
        orderBy: orderBy(filters.sort),
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },

  findActiveBySlug(slug: string): Promise<ProductDetailRecord | null> {
    return prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: detailInclude,
    });
  },

  async curated(sectionId: string, limit: number): Promise<ProductCardRecord[]> {
    const links = await prisma.homeSectionProduct.findMany({
      where: { sectionId, product: { status: 'ACTIVE' } },
      orderBy: { sortOrder: 'asc' },
      take: limit,
      include: { product: { include: cardInclude } },
    });
    return links.map((link) => link.product);
  },

  async onSale(limit: number): Promise<ProductCardRecord[]> {
    const rows = await prisma.product.findMany({
      where: { status: 'ACTIVE', salePriceCents: { not: null } },
      include: cardInclude,
      orderBy: { effectivePriceCents: 'asc' },
      take: 100,
    });
    return rows.filter((row) => row.salePriceCents != null && row.salePriceCents < row.priceCents).slice(0, limit);
  },

  async bestSellers(limit: number): Promise<ProductCardRecord[]> {
    const grouped = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        order: {
          paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
          orderStatus: { not: 'CANCELLED' },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const ids = grouped.map((row) => row.productId).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      include: cardInclude,
    });
    const position = new Map(ids.map((id, index) => [id, index]));
    return products.sort((left, right) => (position.get(left.id) ?? 0) - (position.get(right.id) ?? 0));
  },
};
