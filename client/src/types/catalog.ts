export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
};

export type PaymentFlags = {
  pix?: boolean;
  creditCard?: boolean;
  debitCard?: boolean;
  cash?: boolean;
};

export type Benefit = {
  icon?: string;
  title: string;
  description?: string;
};

export type StoreSettings = {
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
  socialLinks: SocialLinks;
  paymentMethods: PaymentFlags;
  benefits: Benefit[];
  analyticsEnabled: boolean;
  analyticsRequiresConsent: boolean;
  sessionTimeoutMinutes: number;
};

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  showInMenu: boolean;
  showOnHome: boolean;
  sortOrder: number;
  productImageUrls?: string[];
};

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  sku: string;
  priceCents: number;
  salePriceCents: number | null;
  effectivePriceCents: number;
  inStock: boolean;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  featured: boolean;
  isNewArrival: boolean;
  coverImageUrl: string | null;
  categories: { name: string; slug: string; isPrimary: boolean }[];
};

export type ProductDetail = ProductCard & {
  description: string;
  availableQuantity: number;
  images: { id: string; imageUrl: string; altText: string; sortOrder: number }[];
};

export type ProductReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
  mine: boolean;
};

export type ReviewSummary = {
  average: number | null;
  count: number;
};

export type ProductReviews = {
  summary: ReviewSummary;
  mine: { id: string; rating: number; comment: string } | null;
  reviews: ProductReview[];
};

export type StoreBanner = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  imageUrl: string | null;
  altText: string;
  buttonText: string | null;
  buttonUrl: string | null;
  position: string;
  sortOrder: number;
};

export type HomeSection = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  type: string;
  placement: string;
  sortOrder: number;
  productsLimit: number;
  buttonText: string | null;
  buttonUrl: string | null;
  bannerImageUrl: string | null;
  products: ProductCard[];
};

export type HomeData = {
  store: StoreSettings;
  menuCategories: CategoryCard[];
  homeCategories: CategoryCard[];
  banners: StoreBanner[];
  sections: HomeSection[];
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
};

export type StorePage = {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
};

export type ListResponse<T> = {
  data: T[];
  meta?: { page: number; pageSize: number; total: number; pageCount: number };
};

export type DataResponse<T> = {
  data: T;
};

export type CategoryDetail = {
  category: CategoryCard;
  products: ListResponse<ProductCard>;
};
