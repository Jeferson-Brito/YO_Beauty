import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { createInitialAdmin } from '../src/services/admin-account.service';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('painel de catálogo', () => {
  const admin = request.agent(app);
  const customer = request.agent(app);
  let categoryId = '';
  let productId = '';
  let footerNote = '';

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Cliente Painel',
      email: 'cliente.painel@yobeauty.local',
      password: 'Cliente123',
    });
    await customer.post('/api/auth/login').send({
      email: 'cliente.painel@yobeauty.local',
      password: 'Cliente123',
    });
    await createInitialAdmin({
      name: 'Painel',
      email: 'painel.teste@yobeauty.local',
      password: 'AdminYo1234',
    });
    await admin.post('/api/auth/login').send({
      email: 'painel.teste@yobeauty.local',
      password: 'AdminYo1234',
    });
    const store = await request(app).get('/api/store');
    footerNote = store.body.data.footerNote;
  });

  afterAll(async () => {
    await prisma.homeSection.deleteMany({ where: { id: { startsWith: 'teste-adm-' } } });
    await prisma.product.deleteMany({ where: { sku: { startsWith: 'TESTE-ADM-' } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: 'teste-adm-' } } });
    if (footerNote) {
      await prisma.storeSettings.update({ where: { id: 'default' }, data: { footerNote } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: ['painel.teste@yobeauty.local', 'cliente.painel@yobeauty.local'] } },
    });
  });

  it('recusa o catálogo administrativo para cliente', async () => {
    const response = await customer.post('/api/admin/categories').send({ name: 'Perfumes de teste' });
    expect(response.status).toBe(403);
  });

  it('cria categoria, produto, imagem e reflete na loja pública', async () => {
    const category = await admin.post('/api/admin/categories').send({
      name: 'Perfumes de teste',
      slug: 'teste-adm-perfumes',
      description: 'Categoria criada pelo painel.',
      active: true,
      showInMenu: true,
      showOnHome: false,
      sortOrder: 80,
    });
    expect(category.status).toBe(201);
    categoryId = category.body.data.id;

    const menu = await request(app).get('/api/categories?placement=menu');
    expect(menu.body.data.some((item: { slug: string }) => item.slug === 'teste-adm-perfumes')).toBe(true);

    const rejected = await admin.post('/api/admin/products').send({
      name: 'Batom de teste',
      slug: 'teste-adm-batom',
      description: 'Produto de teste do painel.',
      sku: 'TESTE-ADM-1',
      priceCents: 3000,
      salePriceCents: 3000,
      stockQuantity: 4,
      status: 'ACTIVE',
      featured: false,
      isNewArrival: false,
      categories: [{ categoryId, isPrimary: true }],
    });
    expect(rejected.status).toBe(422);
    expect(rejected.body.issues[0].message).toMatch(/promocional/i);

    const product = await admin.post('/api/admin/products').send({
      name: 'Batom de teste',
      slug: 'teste-adm-batom',
      description: 'Produto de teste do painel.',
      sku: 'TESTE-ADM-1',
      priceCents: 3000,
      salePriceCents: 2500,
      stockQuantity: 4,
      status: 'ACTIVE',
      featured: false,
      isNewArrival: false,
      categories: [{ categoryId, isPrimary: true }],
    });
    expect(product.status).toBe(201);
    productId = product.body.data.id;
    expect(product.body.data.effectivePriceCents).toBe(2500);
    expect(product.body.data.stockQuantity).toBe(4);

    const publicProduct = await request(app).get('/api/products/teste-adm-batom');
    expect(publicProduct.status).toBe(200);
    expect(publicProduct.body.data.effectivePriceCents).toBe(2500);
    expect(publicProduct.body.data.stockQuantity).toBeUndefined();
    expect(publicProduct.body.data.availability).toBe('low_stock');

    const first = await admin
      .post(`/api/admin/products/${productId}/images`)
      .attach('file', png, { filename: 'um.png', contentType: 'image/png' });
    const second = await admin
      .post(`/api/admin/products/${productId}/images`)
      .attach('file', png, { filename: 'dois.png', contentType: 'image/png' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const reordered = await admin.patch(`/api/admin/products/${productId}/images/reorder`).send({
      imageIds: [second.body.data.id, first.body.data.id],
    });
    expect(reordered.status).toBe(200);
    expect(reordered.body.data.images[0].id).toBe(second.body.data.id);

    const covered = await request(app).get('/api/products/teste-adm-batom');
    expect(covered.body.data.coverImageUrl).toBe(second.body.data.imageUrl);

    const invalid = await admin
      .post(`/api/admin/products/${productId}/images`)
      .attach('file', Buffer.from('nao-e-imagem'), { filename: 'nota.txt', contentType: 'text/plain' });
    expect(invalid.status).toBe(422);

    await admin.delete(`/api/admin/products/${productId}/images/${first.body.data.id}`);
    await admin.delete(`/api/admin/products/${productId}/images/${second.body.data.id}`);
  });

  it('arquiva o produto, registra o histórico e tira a categoria de uso', async () => {
    const section = await admin.post('/api/admin/sections').send({
      title: 'Teste adm bloco',
      slug: 'teste-adm-bloco',
      type: 'manual',
      placement: 'home-block',
      active: true,
      sortOrder: 90,
      productsLimit: 4,
      buttonText: 'Ver',
      buttonUrl: '/produtos',
      productIds: [productId],
    });
    expect(section.status).toBe(201);
    expect(section.body.data.id.startsWith('teste-adm-')).toBe(true);

    const home = await request(app).get('/api/home-sections');
    const block = home.body.data.find((item: { id: string }) => item.id === section.body.data.id);
    expect(block.products[0].slug).toBe('teste-adm-batom');

    const removed = await admin.delete(`/api/admin/sections/${section.body.data.id}`);
    expect(removed.status).toBe(204);

    const archived = await admin.patch(`/api/admin/products/${productId}`).send({
      name: 'Batom de teste',
      slug: 'teste-adm-batom',
      description: 'Produto de teste do painel.',
      sku: 'TESTE-ADM-1',
      priceCents: 3000,
      salePriceCents: 2500,
      stockQuantity: 4,
      status: 'ARCHIVED',
      featured: false,
      isNewArrival: false,
      categories: [{ categoryId, isPrimary: true }],
    });
    expect(archived.status).toBe(200);

    const hidden = await request(app).get('/api/products/teste-adm-batom');
    expect(hidden.status).toBe(404);

    const history = await admin.get(`/api/admin/products/${productId}/changes`);
    expect(history.body.data.some((item: { summary: string }) => item.summary === 'Produto criado.')).toBe(true);
    expect(history.body.data.some((item: { summary: string }) => item.summary.includes('status'))).toBe(true);

    const blocked = await admin.delete(`/api/admin/categories/${categoryId}`);
    expect(blocked.status).toBe(409);
  });

  it('atualiza e restaura uma configuração comercial', async () => {
    const current = await admin.get('/api/admin/settings');
    const changed = await admin.patch('/api/admin/settings').send({
      ...current.body.data,
      footerNote: 'Nota temporária do teste',
    });
    expect(changed.status).toBe(200);

    const store = await request(app).get('/api/store');
    expect(store.body.data.footerNote).toBe('Nota temporária do teste');
    expect(store.body.data.loyaltyRules).toBeUndefined();

    const restored = await admin.patch('/api/admin/settings').send({
      ...changed.body.data,
      footerNote,
    });
    expect(restored.status).toBe(200);
    const again = await request(app).get('/api/store');
    expect(again.body.data.footerNote).toBe(footerNote);
  });
});
