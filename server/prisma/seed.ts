import type { Prisma } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { effectivePriceCents } from '../src/domain/pricing';
import { DEFAULT_LOYALTY_RULES } from '../src/domain/loyalty';
import { normalizeSearch } from '../src/utils/search';

type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  showInMenu: boolean;
  showOnHome: boolean;
  sortOrder: number;
};

type SeedProduct = {
  slug: string;
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  salePriceCents?: number;
  stockQuantity: number;
  featured?: boolean;
  isNewArrival?: boolean;
  categorySlugs: string[];
};

const categories: SeedCategory[] = [
  {
    slug: 'maquiagem',
    name: 'Maquiagem',
    description: 'Bases, olhos, lábios e tudo para a produção do dia.',
    showInMenu: true,
    showOnHome: true,
    sortOrder: 1,
  },
  {
    slug: 'skincare',
    name: 'Skincare',
    description: 'Hidratação e cuidado para a rotina da pele.',
    showInMenu: true,
    showOnHome: true,
    sortOrder: 2,
  },
  {
    slug: 'cabelos',
    name: 'Cabelos',
    description: 'Tratamento e finalização para o cabelo.',
    showInMenu: true,
    showOnHome: true,
    sortOrder: 3,
  },
  {
    slug: 'acessorios',
    name: 'Acessórios',
    description: 'Pincéis, necessaires e itens de apoio à beleza.',
    showInMenu: true,
    showOnHome: true,
    sortOrder: 4,
  },
  {
    slug: 'kits',
    name: 'Kits',
    description: 'Conjuntos prontos para presentear ou repor a nécessaire.',
    showInMenu: true,
    showOnHome: true,
    sortOrder: 5,
  },
  {
    slug: 'lancamentos',
    name: 'Lançamentos',
    description: 'Novidades recém-chegadas à Yo Beauty.',
    showInMenu: true,
    showOnHome: true,
    sortOrder: 6,
  },
  {
    slug: 'promocoes',
    name: 'Promoções',
    description: 'Produtos com preço promocional enquanto durar o estoque.',
    showInMenu: true,
    showOnHome: false,
    sortOrder: 7,
  },
  {
    slug: 'perfumes',
    name: 'Perfumes',
    description: 'Fragrâncias para usar no dia e na noite.',
    showInMenu: false,
    showOnHome: false,
    sortOrder: 8,
  },
  {
    slug: 'unhas',
    name: 'Unhas',
    description: 'Esmaltes e cuidados para as unhas.',
    showInMenu: false,
    showOnHome: false,
    sortOrder: 9,
  },
  {
    slug: 'corpo-e-banho',
    name: 'Corpo e banho',
    description: 'Hidratação corporal e banho.',
    showInMenu: false,
    showOnHome: false,
    sortOrder: 10,
  },
];

const products: SeedProduct[] = [
  {
    slug: 'gloss-labial-brilho-intenso',
    name: 'Gloss Labial Brilho Intenso',
    sku: 'YB-MAQ-001',
    shortDescription: 'Brilho leve para o dia a dia.',
    description: 'Gloss demonstrativo com acabamento luminoso. Item fictício do catálogo inicial da Yo Beauty.',
    priceCents: 2990,
    stockQuantity: 40,
    featured: true,
    categorySlugs: ['maquiagem'],
  },
  {
    slug: 'base-liquida-matte',
    name: 'Base Líquida Matte',
    sku: 'YB-MAQ-002',
    shortDescription: 'Cobertura uniforme e acabamento matte.',
    description: 'Base líquida demonstrativa. A cor e a foto oficiais serão cadastradas pelo painel.',
    priceCents: 4990,
    stockQuantity: 25,
    featured: true,
    categorySlugs: ['maquiagem'],
  },
  {
    slug: 'paleta-sombras-12-cores',
    name: 'Paleta de Sombras 12 Cores',
    sku: 'YB-MAQ-003',
    shortDescription: 'Doze tons para esfumar e iluminar.',
    description: 'Paleta demonstrativa com doze cores. Sem fotografia oficial nesta versão.',
    priceCents: 6990,
    stockQuantity: 18,
    featured: true,
    categorySlugs: ['maquiagem'],
  },
  {
    slug: 'mascara-cilios-volume',
    name: 'Máscara de Cílios Volume',
    sku: 'YB-MAQ-004',
    shortDescription: 'Volume para os cílios sem pesar.',
    description: 'Máscara de cílios demonstrativa do catálogo inicial.',
    priceCents: 3990,
    stockQuantity: 30,
    featured: true,
    categorySlugs: ['maquiagem'],
  },
  {
    slug: 'hidratante-facial',
    name: 'Hidratante Facial',
    sku: 'YB-SKN-001',
    shortDescription: 'Hidratação diária para o rosto.',
    description: 'Hidratante facial demonstrativo. Não substitui orientação dermatológica.',
    priceCents: 4490,
    stockQuantity: 22,
    featured: true,
    categorySlugs: ['skincare'],
  },
  {
    slug: 'kit-pinceis-12-pecas',
    name: 'Kit de Pincéis 12 peças',
    sku: 'YB-ACE-001',
    shortDescription: 'Conjunto de pincéis para maquiagem.',
    description: 'Kit demonstrativo com doze pincéis. Também aparece em Kits.',
    priceCents: 8990,
    stockQuantity: 12,
    featured: true,
    categorySlugs: ['acessorios', 'kits'],
  },
  {
    slug: 'serum-vitamina-c',
    name: 'Sérum Vitamina C',
    sku: 'YB-SKN-002',
    shortDescription: 'Passo de tratamento da rotina de skincare.',
    description: 'Sérum demonstrativo marcado como lançamento. A foto será enviada pela loja.',
    priceCents: 5990,
    stockQuantity: 16,
    isNewArrival: true,
    categorySlugs: ['skincare', 'lancamentos'],
  },
  {
    slug: 'shampoo-nutritivo',
    name: 'Shampoo Nutritivo',
    sku: 'YB-CAB-001',
    shortDescription: 'Limpeza suave para a rotina capilar.',
    description: 'Shampoo demonstrativo da categoria Cabelos.',
    priceCents: 3690,
    stockQuantity: 28,
    categorySlugs: ['cabelos'],
  },
  {
    slug: 'mascara-capilar-reparadora',
    name: 'Máscara Capilar Reparadora',
    sku: 'YB-CAB-002',
    shortDescription: 'Tratamento para usar após a lavagem.',
    description: 'Máscara capilar demonstrativa marcada como lançamento.',
    priceCents: 4290,
    stockQuantity: 14,
    isNewArrival: true,
    categorySlugs: ['cabelos', 'lancamentos'],
  },
  {
    slug: 'esmalte-rosa-magenta',
    name: 'Esmalte Rosa Magenta',
    sku: 'YB-UNH-001',
    shortDescription: 'Esmalte na cor da marca.',
    description: 'Esmalte demonstrativo com estoque baixo de propósito, para o indicador operacional.',
    priceCents: 1490,
    stockQuantity: 3,
    categorySlugs: ['unhas'],
  },
  {
    slug: 'perfume-floral-50ml',
    name: 'Perfume Floral 50ml',
    sku: 'YB-PER-001',
    shortDescription: 'Fragrância floral de 50 ml.',
    description: 'Perfume demonstrativo marcado como lançamento. Sem nota olfativa oficial cadastrada.',
    priceCents: 12990,
    stockQuantity: 10,
    isNewArrival: true,
    categorySlugs: ['perfumes', 'lancamentos'],
  },
  {
    slug: 'locao-corporal-hidratante',
    name: 'Loção Corporal Hidratante',
    sku: 'YB-CRP-001',
    shortDescription: 'Hidratação para o corpo.',
    description: 'Loção demonstrativa sem estoque, para validar o estado de indisponibilidade.',
    priceCents: 3890,
    stockQuantity: 0,
    categorySlugs: ['corpo-e-banho'],
  },
  {
    slug: 'necessaire-yo-beauty',
    name: 'Necessaire Yo Beauty',
    sku: 'YB-ACE-002',
    shortDescription: 'Necessaire para levar a rotina de beleza.',
    description: 'Acessório demonstrativo. A imagem oficial entra pelo painel.',
    priceCents: 5490,
    stockQuantity: 9,
    categorySlugs: ['acessorios'],
  },
  {
    slug: 'kit-presente-especial',
    name: 'Kit Presente Especial',
    sku: 'YB-KIT-001',
    shortDescription: 'Kit de presente com preço promocional.',
    description: 'Kit demonstrativo com preço promocional. O desconto só vale porque o preço promocional é menor que o preço cheio.',
    priceCents: 14990,
    salePriceCents: 12990,
    stockQuantity: 8,
    featured: true,
    isNewArrival: true,
    categorySlugs: ['kits', 'lancamentos', 'promocoes'],
  },
];

const featuredSlugs = [
  'gloss-labial-brilho-intenso',
  'base-liquida-matte',
  'paleta-sombras-12-cores',
  'mascara-cilios-volume',
  'hidratante-facial',
  'kit-pinceis-12-pecas',
];

async function ensureCategory(category: SeedCategory) {
  const existing = await prisma.category.findUnique({ where: { slug: category.slug } });
  if (existing) return existing;
  return prisma.category.create({ data: category });
}

async function ensureProduct(product: SeedProduct, categoryIds: Map<string, string>) {
  const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
  if (existing) return existing;

  const categoryNames = product.categorySlugs.map((slug) => categories.find((item) => item.slug === slug)?.name ?? slug);
  const created = await prisma.product.create({
    data: {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      shortDescription: product.shortDescription,
      priceCents: product.priceCents,
      salePriceCents: product.salePriceCents ?? null,
      effectivePriceCents: effectivePriceCents(product.priceCents, product.salePriceCents ?? null),
      stockQuantity: product.stockQuantity,
      status: 'ACTIVE',
      featured: product.featured ?? false,
      isNewArrival: product.isNewArrival ?? false,
      searchText: normalizeSearch([product.name, product.sku, product.shortDescription, ...categoryNames].join(' ')),
      categories: {
        create: product.categorySlugs.map((slug, index) => ({
          categoryId: categoryIds.get(slug) as string,
          isPrimary: index === 0,
        })),
      },
    },
  });
  return created;
}

async function ensureSettings() {
  const existing = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  if (existing) return existing;

  const data: Prisma.StoreSettingsCreateInput = {
    id: 'default',
    storeName: 'Yo Beauty',
    tagline: 'Makes - Cosméticos & Acessórios',
    logoUrl: '/brand/logo-transparente.png',
    whatsappNumber: '83981131352',
    whatsappMessage: 'Olá! Vim pela loja Yo Beauty e quero atendimento.',
    contactEmail: '',
    contactPhone: '',
    freeShippingMessage: 'Frete grátis a partir de R$ 199,00',
    freeShippingThresholdCents: 19900,
    installmentMessage: 'Parcele em até 12x no cartão',
    supportBarMessage: 'Atendimento via WhatsApp',
    businessHours: 'Segunda a sábado, das 8h às 18h',
    footerNote: 'Obrigada por fazer parte da nossa história!',
    socialLinks: { instagram: '', facebook: '', tiktok: '', youtube: '' },
    paymentMethods: { cash: true, pix: true, creditCard: true, debitCard: true },
    benefits: [
      { icon: 'truck', title: 'Entrega para todo o Brasil' },
      { icon: 'shield', title: 'Produtos originais' },
      { icon: 'lock', title: 'Compra segura', description: 'Seus dados protegidos' },
      { icon: 'card', title: 'Diversas formas de pagamento' },
    ],
    loyaltyRules: DEFAULT_LOYALTY_RULES,
    lowStockThreshold: 5,
    timezone: 'America/Recife',
    analyticsEnabled: true,
    analyticsRequiresConsent: true,
    analyticsRetentionDays: 180,
    sessionTimeoutMinutes: 30,
  };

  return prisma.storeSettings.create({ data });
}

async function ensureBanner(id: string, data: Omit<Prisma.StoreBannerCreateInput, 'id'>) {
  const existing = await prisma.storeBanner.findUnique({ where: { id } });
  if (existing) return existing;
  return prisma.storeBanner.create({ data: { id, ...data } });
}

async function ensureSection(id: string, data: Omit<Prisma.HomeSectionCreateInput, 'id'>) {
  const existing = await prisma.homeSection.findUnique({ where: { id } });
  if (existing) return { created: false as const };
  await prisma.homeSection.create({ data: { id, ...data } });
  return { created: true as const };
}

async function ensurePage(slug: string, title: string, content: string) {
  const existing = await prisma.storePage.findUnique({ where: { slug } });
  if (existing) {
    if (slug === 'privacidade' && existing.content.includes('ainda não grava eventos de navegação')) {
      return prisma.storePage.update({ where: { slug }, data: { content } });
    }
    return existing;
  }
  return prisma.storePage.create({ data: { slug, title, content, active: true } });
}

export async function seed() {
  const demo = process.env.SEED_DEMO === 'true';
  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const saved = await ensureCategory(category);
    categoryIds.set(saved.slug, saved.id);
  }

  const productIds = new Map<string, string>();
  if (demo) {
    for (const product of products) {
      const saved = await ensureProduct(product, categoryIds);
      productIds.set(saved.slug, saved.id);
    }
  }

  await ensureSettings();

  await ensureBanner('banner-hero', {
    eyebrow: 'Beleza, autocuidado e confiança em um só lugar',
    title: 'Yo Beauty',
    subtitle: 'Mais beleza para o seu dia a dia',
    imageUrl: null,
    altText: 'Banner principal da Yo Beauty',
    buttonText: 'COMPRE AGORA',
    buttonUrl: '/produtos',
    position: 'hero',
    active: true,
    sortOrder: 1,
  });

  await ensureBanner('banner-kits', {
    eyebrow: 'KITS ESPECIAIS',
    title: 'Para todas as ocasiões',
    subtitle: '',
    imageUrl: null,
    altText: 'Destaque de kits especiais',
    buttonText: 'VER KITS',
    buttonUrl: '/categoria/kits',
    position: 'promo-left',
    active: true,
    sortOrder: 2,
  });

  await ensureBanner('banner-lancamentos', {
    eyebrow: 'LANÇAMENTOS',
    title: 'Chegaram novidades incríveis!',
    subtitle: '',
    imageUrl: null,
    altText: 'Destaque de lançamentos',
    buttonText: 'CONFERIR',
    buttonUrl: '/categoria/lancamentos',
    position: 'promo-right',
    active: true,
    sortOrder: 3,
  });

  const featured = await ensureSection('secao-destaques', {
    title: 'Produtos em destaque',
    subtitle: '',
    description: 'Seleção curada da vitrine, na ordem definida pela loja.',
    type: 'manual',
    placement: 'home-grid',
    active: true,
    sortOrder: 1,
    productsLimit: 6,
    buttonText: 'VER TODOS',
    buttonUrl: '/produtos',
  });

  if (demo && featured.created) {
    await prisma.homeSectionProduct.createMany({
      data: featuredSlugs.map((slug, index) => ({
        sectionId: 'secao-destaques',
        productId: productIds.get(slug) as string,
        sortOrder: index + 1,
      })),
    });
  }

  await ensureSection('secao-lancamentos', {
    title: 'Lançamentos',
    subtitle: 'Chegaram novidades incríveis!',
    description: 'Produtos marcados como lançamento.',
    type: 'new_arrivals',
    placement: 'home-extra',
    active: true,
    sortOrder: 2,
    productsLimit: 8,
    buttonText: 'CONFERIR',
    buttonUrl: '/categoria/lancamentos',
    category: { connect: { id: categoryIds.get('lancamentos') as string } },
  });

  await ensureSection('secao-kits', {
    title: 'Kits especiais',
    subtitle: 'Para todas as ocasiões',
    description: 'Produtos da categoria Kits.',
    type: 'category',
    placement: 'home-extra',
    active: true,
    sortOrder: 3,
    productsLimit: 8,
    buttonText: 'VER KITS',
    buttonUrl: '/categoria/kits',
    category: { connect: { id: categoryIds.get('kits') as string } },
  });

  await ensureSection('secao-mais-vendidos', {
    title: 'Mais vendidos',
    subtitle: '',
    description: 'Ranking calculado somente com pedidos pagos. Fica vazio até existir venda confirmada.',
    type: 'best_sellers',
    placement: 'home-extra',
    active: false,
    sortOrder: 4,
    productsLimit: 8,
    buttonText: 'VER TODOS',
    buttonUrl: '/produtos',
  });

  await ensurePage(
    'sobre',
    'Sobre a Yo Beauty',
    'A Yo Beauty reúne makes, cosméticos e acessórios em uma loja própria. Este texto institucional é inicial e pode ser revisado pela proprietária antes da publicação.',
  );

  await ensurePage(
    'privacidade',
    'Política de privacidade',
    [
      'A Yo Beauty trata dados de cadastro e de pedido para criar a conta, entregar a compra e atender a cliente.',
      'As visitas só são registradas depois de uma escolha explícita neste navegador. O identificador é aleatório e o servidor guarda apenas um código irreversível, sem IP e sem fingerprinting.',
      'A retenção dos eventos é de 180 dias. Recusar ou apagar a escolha remove as visitas daquele navegador.',
      'Visitantes únicos são uma estimativa do navegador e não uma identificação de pessoa física.',
      'Uma compra só entra no faturamento quando o pagamento for confirmado. O pedido pendente não é uma venda.',
      'Pedidos guardam o necessário para a compra, inclusive um retrato do endereço no momento do pedido.',
    ].join('\n\n'),
  );

  await ensurePage(
    'termos',
    'Termos de uso',
    'Ao usar a loja, a visitante navega pelo catálogo e só informa dados de entrega no checkout, depois do login. Os preços exibidos são confirmados no servidor no momento do pedido. Este texto é uma base inicial e deve ser revisado antes da operação pública.',
  );

  await ensurePage(
    'contato',
    'Fale conosco',
    'O atendimento é feito pelo WhatsApp e pelo e-mail cadastrados nas configurações da loja.',
  );
}

const executedDirectly = typeof require !== 'undefined' && require.main === module;

if (executedDirectly) {
  seed()
    .then(async () => {
      console.log(process.env.SEED_DEMO === 'true' ? 'Catálogo demonstrativo da Yo Beauty pronto.' : 'Configuração inicial da loja pronta, sem produtos de demonstração.');
      await prisma.$disconnect();
    })
    .catch(async (error: unknown) => {
      console.error('Falha ao executar o seed.');
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
