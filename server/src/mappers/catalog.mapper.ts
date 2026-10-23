import type { Category, ProductImage, StoreBanner, StorePage, StoreSettings } from '@prisma/client';
import type { ProductCardRecord, ProductDetailRecord } from '../repositories/product.repository';

export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock';

export function availabilityOf(stockQuantity: number, lowStockThreshold: number): Availability {
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

function categoriesOf(product: ProductCardRecord | ProductDetailRecord) {
  return product.categories
    .map((link) => ({
      name: link.category.name,
      slug: link.category.slug,
      isPrimary: link.isPrimary,
    }))
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
}

export function toProductCard(product: ProductCardRecord, lowStockThreshold: number) {
  const cover = product.images[0] ?? null;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    sku: product.sku,
    priceCents: product.priceCents,
    salePriceCents: product.salePriceCents,
    effectivePriceCents: product.effectivePriceCents,
    inStock: product.stockQuantity > 0,
    availability: availabilityOf(product.stockQuantity, lowStockThreshold),
    featured: product.featured,
    isNewArrival: product.isNewArrival,
    coverImageUrl: cover?.imageUrl ?? null,
    categories: categoriesOf(product),
  };
}

export function toProductDetail(product: ProductDetailRecord, lowStockThreshold: number) {
  return {
    ...toProductCard(product, lowStockThreshold),
    description: product.description,
    availableQuantity: product.stockQuantity,
    images: product.images.map(toImage),
  };
}

function toImage(image: ProductImage) {
  return {
    id: image.id,
    imageUrl: image.imageUrl,
    altText: image.altText,
    sortOrder: image.sortOrder,
  };
}

export function toCategory(category: Category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    showInMenu: category.showInMenu,
    showOnHome: category.showOnHome,
    sortOrder: category.sortOrder,
  };
}

export function toBanner(banner: StoreBanner) {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    eyebrow: banner.eyebrow,
    imageUrl: banner.imageUrl,
    altText: banner.altText,
    buttonText: banner.buttonText,
    buttonUrl: banner.buttonUrl,
    position: banner.position,
    sortOrder: banner.sortOrder,
  };
}

export function toPublicSettings(settings: StoreSettings) {
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
    timezone: settings.timezone,
    analyticsEnabled: settings.analyticsEnabled,
    analyticsRequiresConsent: settings.analyticsRequiresConsent,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
  };
}

export function toPage(page: StorePage) {
  return {
    slug: page.slug,
    title: page.title,
    content: page.content,
    updatedAt: page.updatedAt.toISOString(),
  };
}
