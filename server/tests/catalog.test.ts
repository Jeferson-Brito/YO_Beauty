import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { seed } from '../prisma/seed';

describe('catálogo público', () => {
  beforeAll(async () => {
    await seed();
  });

  it('responde saúde com o banco no ar', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('up');
  });

  it('entrega a loja sem regras internas de fidelização e com analytics sujeito a consentimento', async () => {
    const response = await request(app).get('/api/store');
    expect(response.status).toBe(200);
    expect(response.body.data.storeName).toBe('Yo Beauty');
    expect(response.body.data.analyticsEnabled).toBe(true);
    expect(response.body.data.loyaltyRules).toBeUndefined();
    expect(response.body.data.freeShippingThresholdCents).toBe(19900);
  });

  it('lista categorias de menu e de vitrine separadamente', async () => {
    const menu = await request(app).get('/api/categories?placement=menu');
    const home = await request(app).get('/api/categories?placement=home');
    expect(menu.status).toBe(200);
    expect(menu.body.data.map((category: { slug: string }) => category.slug)).toEqual([
      'maquiagem',
      'skincare',
      'cabelos',
      'acessorios',
      'kits',
      'lancamentos',
      'promocoes',
    ]);
    expect(home.body.data).toHaveLength(6);
    expect(home.body.data.some((category: { slug: string }) => category.slug === 'promocoes')).toBe(false);
  });

  it('mostra nos cards da vitrine só as fotos dos produtos da categoria', async () => {
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: 'gloss-labial-brilho-intenso' } });
    const image = await prisma.productImage.create({
      data: { productId: product.id, imageUrl: '/uploads/card-maquiagem.jpg', altText: '', sortOrder: 0 },
    });
    try {
      const home = await request(app).get('/api/home');
      const cards = home.body.data.homeCategories as { slug: string; productImageUrls: string[] }[];
      expect(cards.find((category) => category.slug === 'maquiagem')?.productImageUrls).toEqual(['/uploads/card-maquiagem.jpg']);
      expect(cards.find((category) => category.slug === 'skincare')?.productImageUrls).toEqual([]);
    } finally {
      await prisma.productImage.delete({ where: { id: image.id } });
    }
  });

  it('pagina produtos, pesquisa sem acento e separa disponibilidade', async () => {
    const page = await request(app).get('/api/products?pageSize=10');
    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(10);
    expect(page.body.meta.total).toBe(14);
    expect(page.body.meta.pageCount).toBe(2);

    const secondPage = await request(app).get('/api/products?page=2&pageSize=10');
    expect(secondPage.body.data).toHaveLength(4);

    const search = await request(app).get('/api/products?q=Máscara');
    expect(search.body.meta.total).toBe(2);

    const available = await request(app).get('/api/products?availability=in_stock&pageSize=48');
    expect(available.body.meta.total).toBe(13);

    const cheapest = await request(app).get('/api/products?sort=price_asc&pageSize=1');
    expect(cheapest.body.data[0].slug).toBe('esmalte-rosa-magenta');
    expect(cheapest.body.data[0].availability).toBe('low_stock');
    expect(cheapest.body.data[0].stockQuantity).toBeUndefined();

    const launches = await request(app).get('/api/products?collection=new&pageSize=48');
    expect(launches.body.data.every((product: { isNewArrival: boolean }) => product.isNewArrival)).toBe(true);
    expect(launches.body.meta.total).toBe(4);

    const offers = await request(app).get('/api/products?collection=sale&pageSize=48');
    expect(offers.body.data.map((product: { slug: string }) => product.slug)).toEqual(['kit-presente-especial']);
  });

  it('abre categoria, destaque e produto com preço promocional válido', async () => {
    const category = await request(app).get('/api/categories/maquiagem');
    expect(category.status).toBe(200);
    expect(category.body.data.products.meta.total).toBe(4);

    const featured = await request(app).get('/api/products/featured?ignored=1');
    expect(featured.body.meta.total).toBe(7);

    const kit = await request(app).get('/api/products/kit-presente-especial');
    expect(kit.status).toBe(200);
    expect(kit.body.data.priceCents).toBe(14990);
    expect(kit.body.data.effectivePriceCents).toBe(12990);
    expect(kit.body.data.coverImageUrl).toBeNull();

    const missing = await request(app).get('/api/products/nao-existe');
    expect(missing.status).toBe(404);
  });

  it('mantém a seção de mais vendidos fora da vitrine enquanto não há venda', async () => {
    const sections = await request(app).get('/api/home-sections');
    const types = sections.body.data.map((section: { type: string }) => section.type);
    expect(types).not.toContain('best_sellers');

    const featured = sections.body.data.find((section: { id: string }) => section.id === 'secao-destaques');
    expect(featured.products[0].slug).toBe('gloss-labial-brilho-intenso');
    expect(featured.products).toHaveLength(6);

    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.analyticsEvent.count()).toBe(0);
  });

  it('rejeita página inválida', async () => {
    const response = await request(app).get('/api/products?page=0');
    expect(response.status).toBe(422);
  });
});
