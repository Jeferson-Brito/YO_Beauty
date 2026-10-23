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

  it('não trata pedido pendente como faturamento e exporta o período', async () => {
    const gloss = await prisma.product.findUniqueOrThrow({ where: { slug: 'gloss-labial-brilho-intenso' } });
    await buyer.post('/api/auth/register').send({
      name: 'Cliente Indicador',
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
    await prisma.payment.updateMany({
      where: { orderId: paid.body.data.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await prisma.order.update({
      where: { id: paid.body.data.id },
      data: { paymentStatus: 'PAID', orderStatus: 'PAID_AWAITING_PROCESSING' },
    });

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
    expect(report.body.data.summary.revenueCents).toBe(2990);
    expect(report.body.data.summary.paidOrders).toBe(1);
    expect(report.body.data.summary.pendingPayment).toBeGreaterThanOrEqual(1);
    expect(report.body.data.summary.conversion).toBeNull();
    expect(report.body.data.productsByQuantity[0].name).toBe('Gloss Labial Brilho Intenso');
    expect(report.body.data.cards.total.change).toBeNull();

    const csv = await admin.get('/api/admin/dashboard.csv?preset=today');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('faturamento_centavos');
    expect(csv.text).toContain('2990');
    expect(pending.body.data.paymentStatus).toBe('PENDING');
  });
});
