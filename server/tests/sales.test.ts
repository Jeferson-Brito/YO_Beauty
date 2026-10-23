import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma';
import { productRepository } from '../src/repositories/product.repository';
import { salesRepository } from '../src/repositories/sales.repository';

describe('faturamento persistido', () => {
  const start = new Date('2026-10-01T03:00:00.000Z');
  const end = new Date('2026-11-01T03:00:00.000Z');

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany({ where: { email: 'compradora.teste@yobeauty.local' } });
  });

  it('soma somente pagamentos confirmados e ranqueia o produto vendido', async () => {
    expect(await prisma.order.count()).toBe(0);

    const buyer = await prisma.user.create({
      data: {
        name: 'Compradora Teste',
        email: 'compradora.teste@yobeauty.local',
        passwordHash: 'hash-nao-usado',
        role: 'CLIENT',
      },
    });
    const gloss = await prisma.product.findUniqueOrThrow({ where: { slug: 'gloss-labial-brilho-intenso' } });

    const paid = await prisma.order.create({
      data: {
        orderNumber: 'YB-TESTE-0001',
        userId: buyer.id,
        customerName: buyer.name,
        customerEmail: buyer.email,
        shippingAddressSnapshot: { city: 'Recife' },
        subtotalCents: 10000,
        totalCents: 10000,
        refundedAmountCents: 2000,
        paymentStatus: 'PARTIALLY_REFUNDED',
        orderStatus: 'PROCESSING',
        items: {
          create: {
            productId: gloss.id,
            productNameSnapshot: gloss.name,
            skuSnapshot: gloss.sku,
            unitPriceCents: 5000,
            quantity: 2,
            lineTotalCents: 10000,
          },
        },
        payments: {
          create: {
            provider: 'MANUAL',
            status: 'PARTIALLY_REFUNDED',
            amountCents: 10000,
            paidAt: new Date('2026-10-10T15:00:00.000Z'),
          },
        },
      },
    });

    await prisma.order.create({
      data: {
        orderNumber: 'YB-TESTE-0002',
        userId: buyer.id,
        customerName: buyer.name,
        customerEmail: buyer.email,
        shippingAddressSnapshot: { city: 'Recife' },
        subtotalCents: 4990,
        totalCents: 4990,
        paymentStatus: 'PENDING',
        orderStatus: 'AWAITING_PAYMENT',
        payments: {
          create: {
            provider: 'MANUAL',
            status: 'PENDING',
            amountCents: 4990,
            paidAt: null,
          },
        },
      },
    });

    const summary = await salesRepository.summarizePaid(start, end);
    expect(summary.revenueCents).toBe(8000);
    expect(summary.paidOrders).toBe(1);
    expect(summary.averageTicketCents).toBe(8000);
    expect(summary.distinctCustomers).toBe(1);

    const ranking = await productRepository.bestSellers(5);
    expect(ranking.map((product) => product.slug)).toEqual([gloss.slug]);

    const outside = await salesRepository.summarizePaid(
      new Date('2026-11-01T03:00:00.000Z'),
      new Date('2026-12-01T03:00:00.000Z'),
    );
    expect(outside.revenueCents).toBe(0);
    expect(paid.paymentStatus).toBe('PARTIALLY_REFUNDED');
  });
});
