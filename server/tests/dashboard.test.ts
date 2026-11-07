import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { createInitialAdmin } from '../src/services/admin-account.service';

const address = {
  recipientName: 'Cliente Indicador',
  postalCode: '50030-230',
  street: 'Rua da Aurora',
  number: '100',
  complement: '',
  neighborhood: 'Boa Vista',
  city: 'Recife',
  state: 'PE',
};

describe('dashboard comercial', () => {
  const buyer = request.agent(app);
  const admin = request.agent(app);

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { customerEmail: 'dashboard.teste@yobeauty.local' } });
    await prisma.product.update({ where: { slug: 'gloss-labial-brilho-intenso' }, data: { stockQuantity: 40 } });
    await prisma.user.deleteMany({
      where: { email: { in: ['dashboard.teste@yobeauty.local', 'dashboard.admin@yobeauty.local'] } },
    });
  });

  it('conta pedidos confirmados sem pagamento e retira cancelamentos dos indicadores', async () => {
    const gloss = await prisma.product.findUniqueOrThrow({ where: { slug: 'gloss-labial-brilho-intenso' } });
    await buyer.post('/api/auth/register').send({
      firstName: 'Cliente',
      lastName: 'Indicador',
      email: 'dashboard.teste@yobeauty.local',
      password: 'Cliente123',
    });
    const pending = await buyer.post('/api/orders').send({
      items: [{ productId: gloss.id, quantity: 1 }],
      phone: '81999990000',
      paymentMethod: 'pix',
      address,
    });
    const paid = await buyer.post('/api/orders').send({
      items: [{ productId: gloss.id, quantity: 1 }],
      phone: '81999990000',
      paymentMethod: 'pix',
      address,
    });
    expect(paid.status).toBe(201);
    expect(await prisma.payment.count({ where: { orderId: { in: [pending.body.data.id, paid.body.data.id] } } })).toBe(0);

    const anonymous = await request(app).get('/api/admin/dashboard');
    expect(anonymous.status).toBe(401);

    await createInitialAdmin({
      name: 'Indicadores',
      email: 'dashboard.admin@yobeauty.local',
      password: 'AdminYo1234',
    });
    await admin.post('/api/auth/login').send({ email: 'dashboard.admin@yobeauty.local', password: 'AdminYo1234' });
    const forbidden = await buyer.get('/api/admin/dashboard');
    expect(forbidden.status).toBe(403);

    const report = await admin.get('/api/admin/dashboard?preset=last_30_days');
    expect(report.status).toBe(200);
    expect(report.body.data.summary.revenueCents).toBe(5980);
    expect(report.body.data.summary.confirmedOrders).toBe(2);
    expect(report.body.data.summary.conversion).toBeNull();
    expect(report.body.data.productsByQuantity[0].name).toBe('Gloss Labial Brilho Intenso');
    expect(report.body.data.cards.total.change).toBeNull();

    const csv = await admin.get('/api/admin/dashboard.csv?preset=today');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('faturamento_centavos');
    expect(csv.text).toContain('5980');
    expect(csv.text).toContain('vendas_confirmadas');
    expect(pending.body.data.paymentMethod).toBe('pix');
    const byClient = await buyer.post(`/api/orders/${pending.body.data.id}/cancel`);
    expect(byClient.status).toBe(200);
    const afterClient = await admin.get('/api/admin/dashboard?preset=last_30_days');
    expect(afterClient.body.data.summary.revenueCents).toBe(2990);
    expect(afterClient.body.data.summary.confirmedOrders).toBe(1);
    expect(afterClient.body.data.productsByQuantity[0].quantity).toBe(1);
    const byAdmin = await admin.post(`/api/admin/orders/${paid.body.data.id}/cancel`);
    expect(byAdmin.status).toBe(200);
    const afterAdmin = await admin.get('/api/admin/dashboard?preset=last_30_days');
    expect(afterAdmin.body.data.summary.revenueCents).toBe(0);
    expect(afterAdmin.body.data.summary.confirmedOrders).toBe(0);
    expect(afterAdmin.body.data.productsByQuantity).toEqual([]);
    expect(afterAdmin.body.data.summary.cancelled).toBe(2);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: gloss.id } })).stockQuantity).toBe(40);
  });
});
