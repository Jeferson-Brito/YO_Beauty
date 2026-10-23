export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type AdminProductSummary = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  priceCents: number;
  salePriceCents: number | null;
  effectivePriceCents: number;
  stockQuantity: number;
  status: ProductStatus;
  featured: boolean;
  isNewArrival: boolean;
  coverImageUrl: string | null;
  updatedAt: string;
};

export type AdminImage = {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  sku: string;
  priceCents: number;
  salePriceCents: number | null;
  effectivePriceCents: number;
  stockQuantity: number;
  status: ProductStatus;
  featured: boolean;
  isNewArrival: boolean;
  images: AdminImage[];
  categories: { id: string; name: string; slug: string; isPrimary: boolean }[];
  createdAt: string;
  updatedAt: string;
};

export type ProductChange = {
  id: string;
  action: string;
  summary: string;
  actorName: string | null;
  createdAt: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  active: boolean;
  showInMenu: boolean;
  showOnHome: boolean;
  sortOrder: number;
  productCount: number;
};

export type AdminSection = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  type: string;
  placement: string;
  active: boolean;
  sortOrder: number;
  productsLimit: number;
  categoryId: string | null;
  categoryName: string | null;
  bannerImageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  productIds: string[];
};

export type AdminBanner = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  imageUrl: string | null;
  altText: string;
  buttonText: string | null;
  buttonUrl: string | null;
  position: string;
  active: boolean;
  sortOrder: number;
};

export type AdminPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  active: boolean;
  updatedAt: string;
};

export type AdminSettings = {
  storeName: string;
  tagline: string;
  logoUrl: string | null;
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
  socialLinks: { instagram?: string; facebook?: string; tiktok?: string; youtube?: string };
  paymentMethods: { cash?: boolean; pix?: boolean; creditCard?: boolean; debitCard?: boolean };
  benefits: { icon?: string; title: string; description?: string }[];
  lowStockThreshold: number;
};
