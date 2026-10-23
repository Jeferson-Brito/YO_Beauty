import { prisma } from '../config/prisma';
import { summarizeSales, type SalesSummary } from '../domain/metrics';

export const salesRepository = {
  async summarizePaid(start: Date, end: Date): Promise<SalesSummary> {
    const payments = await prisma.payment.findMany({
      where: {
        status: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
        paidAt: { gte: start, lt: end },
        order: {
          paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
          orderStatus: { not: 'CANCELLED' },
        },
      },
      select: {
        orderId: true,
        order: {
          select: {
            userId: true,
            paymentStatus: true,
            orderStatus: true,
            totalCents: true,
            refundedAmountCents: true,
          },
        },
      },
    });

    const uniqueOrders = new Map(payments.map((payment) => [payment.orderId, payment.order]));
    return summarizeSales([...uniqueOrders.values()]);
  },
};
