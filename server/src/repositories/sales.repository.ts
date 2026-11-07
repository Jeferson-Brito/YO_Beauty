import { prisma } from '../config/prisma';
import { summarizeSales, type SalesSummary } from '../domain/metrics';

export const salesRepository = {
  async summarizeConfirmed(start: Date, end: Date): Promise<SalesSummary> {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end }, orderStatus: { not: 'CANCELLED' } },
      select: { userId: true, orderStatus: true, totalCents: true },
    });
    return summarizeSales(orders);
  },
};
