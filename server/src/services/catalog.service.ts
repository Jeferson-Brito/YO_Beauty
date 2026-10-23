import { prisma } from '../config/prisma';
import { AppError } from '../lib/errors';
import type { z } from 'zod';
import { pageMeta, pageWindow, productListSchema } from '../schemas/catalog.schema';
import { categoryRepository } from '../repositories/category.repository';
import { contentRepository } from '../repositories/content.repository';
import { productRepository } from '../repositories/product.repository';
import { normalizeSearch } from '../utils/search';
import {
  toBanner,
  toCategory,
  toPage,
  toProductCard,
  toProductDetail,
  toPublicSettings,
} from '../mappers/catalog.mapper';

type ProductQuery = z.infer<typeof productListSchema>;

async function lowStockThreshold(): Promise<number> {
  const settings = await contentRepository.settings();
  return settings?.lowStockThreshold ?? 5;
}

export const catalogService = {
  async store() {
    const settings = await contentRepository.settings();
    if (!settings) throw new AppError(503, 'A loja ainda não foi configurada. Execute o seed.', 'STORE_NOT_READY');
    return toPublicSettings(settings);
  },

  async categories(placement: 'all' | 'menu' | 'home') {
    const categories = await categoryRepository.list(placement);
    return categories.map(toCategory);
  },

  async category(slug: string, query: ProductQuery) {
    const category = await categoryRepository.findActiveBySlug(slug);
    if (!category) throw new AppError(404, 'Categoria não encontrada.', 'CATEGORY_NOT_FOUND');
    const products = await this.products({ ...query, category: slug });
    return { category: toCategory(category), products };
  },

  async products(query: ProductQuery) {
    const window = pageWindow(query.page, query.pageSize);
    const threshold = await lowStockThreshold();
    const result = await productRepository.list({
      ...window,
      searchText: query.q ? normalizeSearch(query.q) : undefined,
      categorySlug: query.category,
      inStock: query.availability === 'in_stock',
      isNewArrival: query.collection === 'new',
      onSale: query.collection === 'sale',
      sort: query.sort,
    });
    return {
      data: result.items.map((product) => toProductCard(product, threshold)),
      meta: pageMeta(query.page, query.pageSize, result.total),
    };
  },

  async featured(pageSize = 12) {
    const threshold = await lowStockThreshold();
    const result = await productRepository.list({
      skip: 0,
      take: pageSize,
      featured: true,
      sort: 'name',
    });
    return {
      data: result.items.map((product) => toProductCard(product, threshold)),
      meta: pageMeta(1, pageSize, result.total),
    };
  },

  async newArrivals(pageSize = 12) {
    const threshold = await lowStockThreshold();
    const result = await productRepository.list({
      skip: 0,
      take: pageSize,
      isNewArrival: true,
      sort: 'recent',
    });
    return {
      data: result.items.map((product) => toProductCard(product, threshold)),
      meta: pageMeta(1, pageSize, result.total),
    };
  },

  async product(slug: string) {
    const [product, threshold] = await Promise.all([
      productRepository.findActiveBySlug(slug),
      lowStockThreshold(),
    ]);
    if (!product) throw new AppError(404, 'Produto não encontrado.', 'PRODUCT_NOT_FOUND');
    return toProductDetail(product, threshold);
  },

  async banners() {
    const banners = await contentRepository.banners();
    return banners.map(toBanner);
  },

  async sections() {
    const [sections, threshold] = await Promise.all([contentRepository.sections(), lowStockThreshold()]);
    const data = await Promise.all(
      sections.map(async (section) => ({
        id: section.id,
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        type: section.type,
        placement: section.placement,
        sortOrder: section.sortOrder,
        productsLimit: section.productsLimit,
        buttonText: section.buttonText,
        buttonUrl: section.buttonUrl,
        bannerImageUrl: section.bannerImageUrl,
        products: (await productsForSection(section, threshold)).map((product) =>
          toProductCard(product, threshold),
        ),
      })),
    );
    return data;
  },

  async page(slug: string) {
    const page = await contentRepository.page(slug);
    if (!page) throw new AppError(404, 'Página não encontrada.', 'PAGE_NOT_FOUND');
    return toPage(page);
  },

  async home() {
    const [store, menuCategories, homeCategories, banners, sections] = await Promise.all([
      this.store(),
      this.categories('menu'),
      this.categories('home'),
      this.banners(),
      this.sections(),
    ]);
    return { store, menuCategories, homeCategories: await productImagesByCategory(homeCategories), banners, sections };
  },
};

async function productImagesByCategory<T extends { id: string }>(categories: T[]) {
  if (categories.length === 0) return categories.map((category) => ({ ...category, productImageUrls: [] as string[] }));
  const rows = await prisma.productImage.findMany({
    where: {
      product: {
        status: 'ACTIVE',
        categories: { some: { categoryId: { in: categories.map((category) => category.id) } } },
      },
    },
    select: {
      imageUrl: true,
      product: { select: { categories: { select: { categoryId: true } } } },
    },
    orderBy: [{ product: { name: 'asc' } }, { sortOrder: 'asc' }],
  });
  const byCategory = new Map<string, string[]>();
  for (const row of rows) {
    for (const link of row.product.categories) {
      const urls = byCategory.get(link.categoryId) ?? [];
      if (urls.length >= 12 || urls.includes(row.imageUrl)) continue;
      urls.push(row.imageUrl);
      byCategory.set(link.categoryId, urls);
    }
  }
  return categories.map((category) => ({ ...category, productImageUrls: byCategory.get(category.id) ?? [] }));
}

async function productsForSection(
  section: {
    id: string;
    type: string;
    productsLimit: number;
    categoryId: string | null;
  },
  _threshold: number,
) {
  switch (section.type) {
    case 'manual':
      return productRepository.curated(section.id, section.productsLimit);
    case 'featured':
      return (
        await productRepository.list({ skip: 0, take: section.productsLimit, featured: true, sort: 'name' })
      ).items;
    case 'new_arrivals':
      return (
        await productRepository.list({
          skip: 0,
          take: section.productsLimit,
          isNewArrival: true,
          sort: 'recent',
        })
      ).items;
    case 'promotions':
      return productRepository.onSale(section.productsLimit);
    case 'best_sellers':
      return productRepository.bestSellers(section.productsLimit);
    case 'category': {
      if (!section.categoryId) return [];
      const category = await categoryRepository.findById(section.categoryId);
      if (!category || !category.active) return [];
      return (
        await productRepository.list({
          skip: 0,
          take: section.productsLimit,
          categorySlug: category.slug,
          sort: 'name',
        })
      ).items;
    }
    default:
      return [];
  }
}
