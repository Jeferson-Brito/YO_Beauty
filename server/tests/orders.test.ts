import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { createInitialAdmin } from '../src/services/admin-account.service';

const address = {
  recipientName: 'Cliente Pedido',
  postalCode: '50030-230',
  street: 'Rua da Aurora',
  number: '100',
  complement: 'Apto 2',
  neighborhood: 'Boa Vista',
  city: 'Recife',
  state: 'pe',
};

describe('carrinho e pedido pendente', () => {
  const buyer = request.agent(app);
  const other = request.agent(app);
  const admin = request.agent(app);

  afterAll(async () => {
    await prisma.order.deleteMany({
      where: { customerEmail: { in: ['pedido.teste@yobeauty.local', 'outro.pedido@yobeauty.local'] } },
    });
    await prisma.product.update({ where: { slug: 'gloss-labial-brilho-intenso' }, data: { stockQuantity: 40 } });
    await prisma.user.deleteMany({
      where: { email: { in: ['pedido.teste@yobeauty.local', 'outro.pedido@yobeauty.local', 'pedido.admin@yobeauty.local'] } },
    });
  });

  it('cota o preço no servidor e só grava pedido autenticado com estoque', async () => {
    const gloss = await prisma.product.findUniqueOrThrow({ where: { slug: 'gloss-labial-brilho-intenso' } });
    const lotion = await prisma.product.findUniqueOrThrow({ where: { slug: 'locao-corporal-hidratante' } });

    const quoted = await request(app).post('/api/checkout/quote').send({
      items: [{ productId: gloss.id, quantity: 1 }],
    });
    expect(quoted.status).toBe(200);
    expect(quoted.body.data.lines[0].unitPriceCents).toBe(2990);
    expect(quoted.body.data.freeShipping).toBe(false);
    expect(quoted.body.data.totalCents).toBe(2990);

    const free = await request(app).post('/api/checkout/quote').send({
      items: [{ productId: gloss.id, quantity: 7 }],
    });
    expect(free.body.data.subtotalCents).toBe(20930);
    expect(free.body.data.freeShipping).toBe(true);

    const anonymous = await request(app).post('/api/orders').send({
      items: [{ productId: gloss.id, quantity: 1 }],
      phone: '81999990000',
      paymentMethod: 'pix',
      address,
    });
    expect(anonymous.status).toBe(401);

    const registered = await buyer.post('/api/auth/register').send({
      name: 'Cliente Pedido',
      email: 'pedido.teste@yobeauty.local',
      password: 'Cliente123',
    });
    expect(registered.status).toBe(201);
    await other.post('/api/auth/register').send({
      name: 'Outro Cliente',
      email: 'outro.pedido@yobeauty.local',
      password: 'Cliente123',
    });

    const tooMany = await buyer.post('/api/orders').send({
      items: [{ productId: gloss.id, quantity: 99 }],
      phone: '81999990000',
      paymentMethod: 'pix',
      address,
    });
    expect(tooMany.status).toBe(422);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: gloss.id } })).stockQuantity).toBe(40);

    const unavailable = await buyer.post('/api/orders').send({
      items: [{ productId: lotion.id, quantity: 1 }],
      phone: '81999990000',
      paymentMethod: 'pix',
      address,
    });
    expect(unavailable.status).toBe(422);

    const created = await buyer.post('/api/orders').send({
      items: [
        { productId: gloss.id, quantity: 1 },
        { productId: gloss.id, quantity: 1 },
      ],
      phone: '81999990000',
      paymentMethod: 'pix',
      address,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.paymentStatus).toBe('PENDING');
    expect(created.body.data.orderStatus).toBe('AWAITING_PAYMENT');
    expect(created.body.data.items).toHaveLength(1);
    expect(created.body.data.items[0].quantity).toBe(2);
    expect(created.body.data.items[0].unitPriceCents).toBe(2990);
    expect(created.body.data.totalCents).toBe(5980);
    expect(created.body.data.payment.paidAt).toBeNull();
    expect(created.body.data.payment.provider).toBe('pix');
    expect(created.body.data.payment.status).toBe('PENDING');
    expect((await prisma.product.findUniqueOrThrow({ where: { id: gloss.id } })).stockQuantity).toBe(38);

    const hidden = await other.get(`/api/orders/${created.body.data.id}`);
    expect(hidden.status).toBe(404);
    const mine = await buyer.get(`/api/orders/${created.body.data.id}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.address.state).toBe('PE');

    await createInitialAdmin({
      name: 'Pedidos',
      email: 'pedido.admin@yobeauty.local',
      password: 'AdminYo1234',
    });
    await admin.post('/api/auth/login').send({
      email: 'pedido.admin@yobeauty.local',
      password: 'AdminYo1234',
    });
    const cancelled = await admin.post(`/api/admin/orders/${created.body.data.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.orderStatus).toBe('CANCELLED');
    expect((await prisma.product.findUniqueOrThrow({ where: { id: gloss.id } })).stockQuantity).toBe(40);

    const forbidden = await buyer.post(`/api/admin/orders/${created.body.data.id}/cancel`);
    expect(forbidden.status).toBe(403);
  });
});
