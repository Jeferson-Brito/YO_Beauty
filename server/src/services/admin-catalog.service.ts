import { randomBytes } from 'node:crypto';
import type { Prisma, Product, ProductStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { effectivePriceCents } from '../domain/pricing';
import { AppError } from '../lib/errors';
import { pageMeta, pageWindow } from '../schemas/catalog.schema';
import { localDiskStorage } from '../storage/local-disk-storage';
import { contentTypeOf, detectImage, imageKey, type ImageExtension } from '../utils/images';
import { normalizeSearch } from '../utils/search';
import { slugify } from '../utils/slug';

const MAX_IMAGES = 8;
const PROTECTED_PAGES = new Set(['sobre', 'privacidade', 'termos', 'contato']);

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  categories: { include: { category: true } },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function blank(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text ? text : null;
}

function searchTextOf(input: { name: string; sku: string; shortDescription?: string | null; description: string }) {
  return normalizeSearch([input.name, input.sku, input.shortDescription, input.description].filter(Boolean).join(' '));
}

async function uniqueSlug(
  desired: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(desired);
  let slug = base;
  let index = 2;
  while (await taken(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}

function toProduct(product: ProductRecord) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    sku: product.sku,
    priceCents: product.priceCents,
    salePriceCents: product.salePriceCents,
    effectivePriceCents: product.effectivePriceCents,
    stockQuantity: product.stockQuantity,
    status: product.status,
    featured: product.featured,
    isNewArrival: product.isNewArrival,
    images: product.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
    })),
    categories: product.categories
      .map((link) => ({
        id: link.category.id,
        name: link.category.name,
        slug: link.category.slug,
        isPrimary: link.isPrimary,
      }))
      .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function loadProduct(id: string): Promise<ProductRecord> {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw new AppError(404, 'Produto não encontrado.', 'PRODUCT_NOT_FOUND');
  return product;
}

async function ensureCategories(ids: string[]) {
  const found = await prisma.category.findMany({ where: { id: { in: ids } } });
  if (found.length !== ids.length) {
    throw new AppError(422, 'Uma das categorias informadas não existe.', 'CATEGORY_NOT_FOUND');
  }
}

async function ensureSku(sku: string, exceptId?: string) {
  const owner = await prisma.product.findUnique({ where: { sku } });
  if (owner && owner.id !== exceptId) {
    throw new AppError(409, 'Já existe um produto com este SKU.', 'DUPLICATE_SKU');
  }
}

async function generatedSku() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const sku = `YB-${randomBytes(3).toString('hex').toUpperCase()}`;
    const owner = await prisma.product.findUnique({ where: { sku } });
    if (!owner) return sku;
  }
  throw new AppError(500, 'Não foi possível gerar o SKU.', 'SKU_GENERATION_FAILED');
}

function productData(
  input: {
    name: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    sku: string;
    priceCents: number;
    salePriceCents?: number | null;
    stockQuantity: number;
    status: ProductStatus;
    featured: boolean;
    isNewArrival: boolean;
  },
): Prisma.ProductCreateInput {
  const salePriceCents = input.salePriceCents ?? null;
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    shortDescription: blank(input.shortDescription),
    sku: input.sku,
    priceCents: input.priceCents,
    salePriceCents,
    effectivePriceCents: effectivePriceCents(input.priceCents, salePriceCents),
    stockQuantity: input.stockQuantity,
    status: input.status,
    featured: input.featured,
    isNewArrival: input.isNewArrival,
    searchText: searchTextOf(input),
  };
}

function changeNotes(before: Product, after: Product, categoriesChanged: boolean): string[] {
  const notes: string[] = [];
  if (before.name !== after.name) notes.push('nome');
  if (before.priceCents !== after.priceCents || before.salePriceCents !== after.salePriceCents) notes.push('preço');
  if (before.stockQuantity !== after.stockQuantity) notes.push('estoque');
  if (before.status !== after.status) notes.push('status');
  if (before.sku !== after.sku) notes.push('SKU');
  if (before.description !== after.description || before.shortDescription !== after.shortDescription) notes.push('descrição');
  if (before.featured !== after.featured) notes.push(after.featured ? 'destaque ligado' : 'destaque desligado');
  if (before.isNewArrival !== after.isNewArrival) notes.push(after.isNewArrival ? 'lançamento ligado' : 'lançamento desligado');
  if (categoriesChanged) notes.push('categorias');
  return notes;
}

async function saveImage(folder: string, data: Buffer) {
  const extension = detectImage(data);
  if (!extension) {
    throw new AppError(422, 'Envie uma imagem JPG, PNG, WEBP ou GIF.', 'INVALID_IMAGE');
  }
  return localDiskStorage.save({
    key: imageKey(folder, extension),
    contentType: contentTypeOf(extension as ImageExtension),
    data,
  });
}

async function removeStored(url: string | null | undefined) {
  if (!url?.startsWith('/uploads/')) return;
  await localDiskStorage.delete(decodeURIComponent(url.slice('/uploads/'.length)));
}

async function requireSettings() {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  if (!settings) throw new AppError(503, 'A loja ainda não foi configurada. Execute o seed.', 'STORE_NOT_READY');
  return settings;
}

export const adminCatalogService = {
  async listProducts(query: { q?: string; status: 'ALL' | ProductStatus; categoryId?: string; page: number; pageSize: number }) {
    const window = pageWindow(query.page, query.pageSize);
    const where: Prisma.ProductWhereInput = {
      ...(query.status === 'ALL' ? {} : { status: query.status }),
      ...(query.q ? { searchText: { contains: normalizeSearch(query.q) } } : {}),
      ...(query.categoryId ? { categories: { some: { categoryId: query.categoryId } } } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
        skip: window.skip,
        take: window.take,
      }),
      prisma.product.count({ where }),
    ]);
    return {
      data: items.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        priceCents: product.priceCents,
        salePriceCents: product.salePriceCents,
        effectivePriceCents: product.effectivePriceCents,
        stockQuantity: product.stockQuantity,
        status: product.status,
        featured: product.featured,
        isNewArrival: product.isNewArrival,
        coverImageUrl: product.images[0]?.imageUrl ?? null,
        updatedAt: product.updatedAt.toISOString(),
      })),
      meta: pageMeta(query.page, query.pageSize, total),
    };
  },

  async product(id: string) {
    return toProduct(await loadProduct(id));
  },

  async createProduct(
    input: {
      name: string;
      slug?: string;
      description: string;
      shortDescription?: string | null;
      sku?: string;
      priceCents: number;
      salePriceCents?: number | null;
      stockQuantity: number;
      status: ProductStatus;
      featured: boolean;
      isNewArrival: boolean;
      categories: { categoryId: string; isPrimary: boolean }[];
    },
    actorId: string,
  ) {
    const sku = input.sku ?? (await generatedSku());
    await ensureSku(sku);
    await ensureCategories(input.categories.map((item) => item.categoryId));
    const slug = await uniqueSlug(input.slug || input.name, async (candidate) => {
      const found = await prisma.product.findUnique({ where: { slug: candidate } });
      return Boolean(found);
    });
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: productData({ ...input, sku, slug }) });
      await tx.productCategory.createMany({
        data: input.categories.map((item) => ({
          productId: product.id,
          categoryId: item.categoryId,
          isPrimary: item.isPrimary,
        })),
      });
      await tx.productChangeLog.create({
        data: {
          productId: product.id,
          actorId,
          action: 'created',
          summary: 'Produto criado.',
        },
      });
      return product;
    });
    return toProduct(await loadProduct(created.id));
  },

  async updateProduct(
    id: string,
    input: {
      name: string;
      slug?: string;
      description: string;
      shortDescription?: string | null;
      sku?: string;
      priceCents: number;
      salePriceCents?: number | null;
      stockQuantity: number;
      status: ProductStatus;
      featured: boolean;
      isNewArrival: boolean;
      categories: { categoryId: string; isPrimary: boolean }[];
    },
    actorId: string,
  ) {
    const current = await loadProduct(id);
    const sku = input.sku ?? current.sku;
    await ensureSku(sku, id);
    await ensureCategories(input.categories.map((item) => item.categoryId));
    const desired = slugify(input.slug || input.name);
    const slug = await uniqueSlug(desired, async (candidate) => {
      if (candidate === current.slug) return false;
      const found = await prisma.product.findUnique({ where: { slug: candidate } });
      return Boolean(found);
    });
    const nextCategories = input.categories
      .map((item) => `${item.categoryId}:${item.isPrimary ? '1' : '0'}`)
      .sort()
      .join(',');
    const previousCategories = current.categories
      .map((item) => `${item.categoryId}:${item.isPrimary ? '1' : '0'}`)
      .sort()
      .join(',');

    await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: productData({ ...input, sku, slug }),
      });
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.productCategory.createMany({
        data: input.categories.map((item) => ({
          productId: id,
          categoryId: item.categoryId,
          isPrimary: item.isPrimary,
        })),
      });
      const notes = changeNotes(current, updated, nextCategories !== previousCategories);
      if (notes.length > 0) {
        await tx.productChangeLog.create({
          data: {
            productId: id,
            actorId,
            action: 'updated',
            summary: `Alterou ${notes.join(', ')}.`,
          },
        });
      }
    });
    return toProduct(await loadProduct(id));
  },

  async changes(productId: string) {
    await loadProduct(productId);
    const rows = await prisma.productChangeLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { actor: { select: { name: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      summary: row.summary,
      actorName: row.actor?.name ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  },

  async addImage(productId: string, file: Buffer, altText: string) {
    const product = await loadProduct(productId);
    if (product.images.length >= MAX_IMAGES) {
      throw new AppError(422, 'Este produto já tem o máximo de 8 imagens.', 'IMAGE_LIMIT');
    }
    const stored = await saveImage('products', file);
    const image = await prisma.productImage.create({
      data: {
        productId,
        imageUrl: stored.url,
        altText: altText.slice(0, 160),
        sortOrder: product.images.length,
      },
    });
    return {
      id: image.id,
      imageUrl: image.imageUrl,
      altText: image.altText,
      sortOrder: image.sortOrder,
    };
  },

  async updateImageAlt(productId: string, imageId: string, altText: string) {
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new AppError(404, 'Imagem não encontrada.', 'IMAGE_NOT_FOUND');
    const updated = await prisma.productImage.update({ where: { id: imageId }, data: { altText } });
    return { id: updated.id, imageUrl: updated.imageUrl, altText: updated.altText, sortOrder: updated.sortOrder };
  },

  async reorderImages(productId: string, imageIds: string[]) {
    const product = await loadProduct(productId);
    const current = new Set(product.images.map((image) => image.id));
    if (imageIds.length !== product.images.length || imageIds.some((id) => !current.has(id))) {
      throw new AppError(422, 'A ordem precisa incluir todas as imagens do produto.', 'INVALID_ORDER');
    }
    await prisma.$transaction(
      imageIds.map((id, index) => prisma.productImage.update({ where: { id }, data: { sortOrder: index } })),
    );
    return toProduct(await loadProduct(productId));
  },

  async removeImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new AppError(404, 'Imagem não encontrada.', 'IMAGE_NOT_FOUND');
    await prisma.productImage.delete({ where: { id: imageId } });
    await removeStored(image.imageUrl);
    const remaining = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
    await prisma.$transaction(
      remaining.map((item, index) => prisma.productImage.update({ where: { id: item.id }, data: { sortOrder: index } })),
    );
  },

  async categories() {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      active: category.active,
      showInMenu: category.showInMenu,
      showOnHome: category.showOnHome,
      sortOrder: category.sortOrder,
      productCount: category._count.products,
    }));
  },

  async createCategory(input: {
    name: string;
    slug?: string;
    description: string;
    imageUrl?: string | null;
    active: boolean;
    showInMenu: boolean;
    showOnHome: boolean;
    sortOrder: number;
  }) {
    const slug = await uniqueSlug(input.slug || input.name, async (candidate) => {
      const found = await prisma.category.findUnique({ where: { slug: candidate } });
      return Boolean(found);
    });
    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        imageUrl: blank(input.imageUrl),
        active: input.active,
        showInMenu: input.showInMenu,
        showOnHome: input.showOnHome,
        sortOrder: input.sortOrder,
      },
    });
    return { ...category, productCount: 0, createdAt: undefined, updatedAt: undefined };
  },

  async updateCategory(
    id: string,
    input: {
      name: string;
      slug?: string;
      description: string;
      imageUrl?: string | null;
      active: boolean;
      showInMenu: boolean;
      showOnHome: boolean;
      sortOrder: number;
    },
  ) {
    const current = await prisma.category.findUnique({ where: { id } });
    if (!current) throw new AppError(404, 'Categoria não encontrada.', 'CATEGORY_NOT_FOUND');
    const desired = slugify(input.slug || input.name);
    const slug = await uniqueSlug(desired, async (candidate) => {
      if (candidate === current.slug) return false;
      const found = await prisma.category.findUnique({ where: { slug: candidate } });
      return Boolean(found);
    });
    const nextUrl = input.imageUrl === undefined ? current.imageUrl : blank(input.imageUrl);
    if (current.imageUrl && current.imageUrl !== nextUrl) await removeStored(current.imageUrl);
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug,
        description: input.description,
        imageUrl: nextUrl,
        active: input.active,
        showInMenu: input.showInMenu,
        showOnHome: input.showOnHome,
        sortOrder: input.sortOrder,
      },
      include: { _count: { select: { products: true } } },
    });
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      active: category.active,
      showInMenu: category.showInMenu,
      showOnHome: category.showOnHome,
      sortOrder: category.sortOrder,
      productCount: category._count.products,
    };
  },

  async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new AppError(404, 'Categoria não encontrada.', 'CATEGORY_NOT_FOUND');
    if (category._count.products > 0) {
      throw new AppError(409, 'Desative a categoria ou desvincule os produtos antes de excluir.', 'CATEGORY_IN_USE');
    }
    await prisma.category.delete({ where: { id } });
    await removeStored(category.imageUrl);
  },

  async setCategoryImage(id: string, file: Buffer) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new AppError(404, 'Categoria não encontrada.', 'CATEGORY_NOT_FOUND');
    const stored = await saveImage('categories', file);
    await prisma.category.update({ where: { id }, data: { imageUrl: stored.url } });
    await removeStored(category.imageUrl);
    return { imageUrl: stored.url };
  },

  async sections() {
    const sections = await prisma.homeSection.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        products: { orderBy: { sortOrder: 'asc' }, select: { productId: true } },
      },
    });
    return sections.map((section) => ({
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      description: section.description,
      type: section.type,
      placement: section.placement,
      active: section.active,
      sortOrder: section.sortOrder,
      productsLimit: section.productsLimit,
      categoryId: section.categoryId,
      categoryName: section.category?.name ?? null,
      bannerImageUrl: section.bannerImageUrl,
      buttonText: section.buttonText,
      buttonUrl: section.buttonUrl,
      productIds: section.products.map((item) => item.productId),
    }));
  },

  async saveSection(
    input: {
      title: string;
      subtitle: string;
      description: string;
      type: string;
      placement: string;
      active: boolean;
      sortOrder: number;
      productsLimit: number;
      categoryId?: string | null;
      buttonText?: string | null;
      buttonUrl?: string | null;
      productIds: string[];
    },
    id?: string,
  ) {
    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new AppError(422, 'A categoria da seção não existe.', 'CATEGORY_NOT_FOUND');
    }
    if (input.type === 'manual' && input.productIds.length > 0) {
      const count = await prisma.product.count({ where: { id: { in: input.productIds } } });
      if (count !== input.productIds.length) {
        throw new AppError(422, 'Um dos produtos da seção não existe.', 'PRODUCT_NOT_FOUND');
      }
    }
    const sectionId = id
      ? id
      : await uniqueSlug(input.title, async (candidate) => {
          const found = await prisma.homeSection.findUnique({ where: { id: candidate } });
          return Boolean(found);
        });
    if (id) {
      const current = await prisma.homeSection.findUnique({ where: { id } });
      if (!current) throw new AppError(404, 'Seção não encontrada.', 'SECTION_NOT_FOUND');
    }
    const data = {
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      type: input.type,
      placement: input.placement,
      active: input.active,
      sortOrder: input.sortOrder,
      productsLimit: input.productsLimit,
      categoryId: input.type === 'category' ? input.categoryId ?? null : input.categoryId ?? null,
      buttonText: blank(input.buttonText),
      buttonUrl: input.buttonUrl ?? null,
    };
    await prisma.$transaction(async (tx) => {
      if (id) await tx.homeSection.update({ where: { id: sectionId }, data });
      else await tx.homeSection.create({ data: { id: sectionId, ...data } });
      await tx.homeSectionProduct.deleteMany({ where: { sectionId } });
      if (input.type === 'manual') {
        await tx.homeSectionProduct.createMany({
          data: input.productIds.map((productId, index) => ({ sectionId, productId, sortOrder: index })),
        });
      }
    });
    const saved = await prisma.homeSection.findUniqueOrThrow({
      where: { id: sectionId },
      include: { products: { orderBy: { sortOrder: 'asc' } } },
    });
    return { id: saved.id, productIds: saved.products.map((item) => item.productId) };
  },

  async deleteSection(id: string) {
    const section = await prisma.homeSection.findUnique({ where: { id } });
    if (!section) throw new AppError(404, 'Seção não encontrada.', 'SECTION_NOT_FOUND');
    await prisma.homeSection.delete({ where: { id } });
    await removeStored(section.bannerImageUrl);
  },

  async setSectionImage(id: string, file: Buffer) {
    const section = await prisma.homeSection.findUnique({ where: { id } });
    if (!section) throw new AppError(404, 'Seção não encontrada.', 'SECTION_NOT_FOUND');
    const stored = await saveImage('sections', file);
    await prisma.homeSection.update({ where: { id }, data: { bannerImageUrl: stored.url } });
    await removeStored(section.bannerImageUrl);
    return { imageUrl: stored.url };
  },

  async banners() {
    return prisma.storeBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  },

  async saveBanner(
    input: {
      title: string;
      subtitle: string;
      eyebrow: string;
      altText: string;
      buttonText?: string | null;
      buttonUrl?: string | null;
      position: string;
      active: boolean;
      sortOrder: number;
      imageUrl?: string | null;
    },
    id?: string,
  ) {
    const data = {
      title: input.title,
      subtitle: input.subtitle,
      eyebrow: input.eyebrow,
      altText: input.altText,
      buttonText: blank(input.buttonText),
      buttonUrl: input.buttonUrl ?? null,
      position: input.position,
      active: input.active,
      sortOrder: input.sortOrder,
    };
    if (!id) {
      const bannerId = await uniqueSlug(input.title, async (candidate) => {
        const found = await prisma.storeBanner.findUnique({ where: { id: candidate } });
        return Boolean(found);
      });
      return prisma.storeBanner.create({
        data: { id: bannerId, ...data, imageUrl: blank(input.imageUrl) },
      });
    }
    const current = await prisma.storeBanner.findUnique({ where: { id } });
    if (!current) throw new AppError(404, 'Banner não encontrado.', 'BANNER_NOT_FOUND');
    const nextUrl = input.imageUrl === undefined ? current.imageUrl : blank(input.imageUrl);
    if (current.imageUrl && current.imageUrl !== nextUrl) await removeStored(current.imageUrl);
    return prisma.storeBanner.update({ where: { id }, data: { ...data, imageUrl: nextUrl } });
  },

  async deleteBanner(id: string) {
    const banner = await prisma.storeBanner.findUnique({ where: { id } });
    if (!banner) throw new AppError(404, 'Banner não encontrado.', 'BANNER_NOT_FOUND');
    await prisma.storeBanner.delete({ where: { id } });
    await removeStored(banner.imageUrl);
  },

  async setBannerImage(id: string, file: Buffer) {
    const banner = await prisma.storeBanner.findUnique({ where: { id } });
    if (!banner) throw new AppError(404, 'Banner não encontrado.', 'BANNER_NOT_FOUND');
    const stored = await saveImage('banners', file);
    await prisma.storeBanner.update({ where: { id }, data: { imageUrl: stored.url } });
    await removeStored(banner.imageUrl);
    return { imageUrl: stored.url };
  },

  async pages() {
    const pages = await prisma.storePage.findMany({ orderBy: { title: 'asc' } });
    return pages.map((page) => ({
      id: page.id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      active: page.active,
      updatedAt: page.updatedAt.toISOString(),
    }));
  },

  async savePage(
    input: { title: string; slug?: string; content: string; active: boolean },
    id?: string,
  ) {
    if (!id) {
      const slug = await uniqueSlug(input.slug || input.title, async (candidate) => {
        const found = await prisma.storePage.findUnique({ where: { slug: candidate } });
        return Boolean(found);
      });
      const page = await prisma.storePage.create({
        data: { slug, title: input.title, content: input.content, active: input.active },
      });
      return { id: page.id, slug: page.slug };
    }
    const current = await prisma.storePage.findUnique({ where: { id } });
    if (!current) throw new AppError(404, 'Página não encontrada.', 'PAGE_NOT_FOUND');
    const page = await prisma.storePage.update({
      where: { id },
      data: { title: input.title, content: input.content, active: input.active },
    });
    return { id: page.id, slug: page.slug };
  },

  async deletePage(id: string) {
    const page = await prisma.storePage.findUnique({ where: { id } });
    if (!page) throw new AppError(404, 'Página não encontrada.', 'PAGE_NOT_FOUND');
    if (PROTECTED_PAGES.has(page.slug)) {
      throw new AppError(409, 'Esta página institucional faz parte da loja e não pode ser excluída.', 'PAGE_PROTECTED');
    }
    await prisma.storePage.delete({ where: { id } });
  },

  async settings() {
    const settings = await requireSettings();
    return {
      storeName: settings.storeName,
      tagline: settings.tagline,
      logoUrl: settings.logoUrl,
      whatsappNumber: settings.whatsappNumber,
      whatsappMessage: settings.whatsappMessage,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      freeShippingMessage: settings.freeShippingMessage,
      freeShippingThresholdCents: settings.freeShippingThresholdCents,
      installmentMessage: settings.installmentMessage,
      supportBarMessage: settings.supportBarMessage,
      businessHours: settings.businessHours,
      footerNote: settings.footerNote,
      socialLinks: settings.socialLinks,
      paymentMethods: settings.paymentMethods,
      benefits: settings.benefits,
      lowStockThreshold: settings.lowStockThreshold,
    };
  },

  async updateSettings(input: {
    storeName: string;
    tagline: string;
    whatsappNumber: string;
    whatsappMessage: string;
    contactEmail: string;
    contactPhone: string;
    freeShippingMessage: string;
    freeShippingThresholdCents: number;
    installmentMessage: string;
    supportBarMessage: string;
    businessHours: string;
    footerNote: string;
    socialLinks: { instagram: string; facebook: string; tiktok: string; youtube: string };
    paymentMethods: { cash: boolean; pix: boolean; creditCard: boolean; debitCard: boolean };
    benefits: { icon?: string; title: string; description?: string }[];
    lowStockThreshold: number;
  }) {
    await requireSettings();
    await prisma.storeSettings.update({
      where: { id: 'default' },
      data: {
        storeName: input.storeName,
        tagline: input.tagline,
        whatsappNumber: input.whatsappNumber,
        whatsappMessage: input.whatsappMessage,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        freeShippingMessage: input.freeShippingMessage,
        freeShippingThresholdCents: input.freeShippingThresholdCents,
        installmentMessage: input.installmentMessage,
        supportBarMessage: input.supportBarMessage,
        businessHours: input.businessHours,
        footerNote: input.footerNote,
        socialLinks: input.socialLinks,
        paymentMethods: input.paymentMethods,
        benefits: input.benefits,
        lowStockThreshold: input.lowStockThreshold,
      },
    });
    return this.settings();
  },

  async setLogo(file: Buffer) {
    const settings = await requireSettings();
    const stored = await saveImage('brand', file);
    await prisma.storeSettings.update({ where: { id: 'default' }, data: { logoUrl: stored.url } });
    await removeStored(settings.logoUrl);
    return { logoUrl: stored.url };
  },
};
