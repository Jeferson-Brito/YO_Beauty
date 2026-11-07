import { describe, expect, it } from 'vitest';
import {
  conversionRate,
  countOrdersByStatus,
  netRevenueCents,
  percentChange,
  summarizeSales,
} from '../src/domain/metrics';
import { effectivePriceCents } from '../src/domain/pricing';

describe('métricas comerciais', () => {
  it('ignora preço promocional que não reduz o preço', () => {
    expect(effectivePriceCents(4990, null)).toBe(4990);
    expect(effectivePriceCents(14990, 12990)).toBe(12990);
    expect(effectivePriceCents(4990, 5000)).toBe(4990);
  });

  it('conta pedidos não cancelados sem depender de pagamento', () => {
    const summary = summarizeSales([
      { paymentStatus: 'PENDING', orderStatus: 'AWAITING_PAYMENT', totalCents: 5000, refundedAmountCents: 0, userId: 'a' },
      { paymentStatus: 'PAID', orderStatus: 'CANCELLED', totalCents: 8000, refundedAmountCents: 0, userId: 'a' },
      { paymentStatus: 'REFUNDED', orderStatus: 'CANCELLED', totalCents: 9000, refundedAmountCents: 9000, userId: 'b' },
      { paymentStatus: 'PAID', orderStatus: 'PROCESSING', totalCents: 10000, refundedAmountCents: 0, userId: 'a' },
      {
        paymentStatus: 'PARTIALLY_REFUNDED',
        orderStatus: 'DELIVERED',
        totalCents: 10000,
        refundedAmountCents: 2500,
        userId: 'b',
      },
    ]);

    expect(summary.revenueCents).toBe(25000);
    expect(summary.confirmedOrders).toBe(3);
    expect(summary.averageTicketCents).toBe(8333);
    expect(summary.distinctCustomers).toBe(2);
    expect(netRevenueCents({ paymentStatus: 'PENDING', orderStatus: 'AWAITING_PAYMENT', totalCents: 1000, refundedAmountCents: 0 })).toBe(1000);
  });

  it('retorna ticket zero quando não há venda confirmada', () => {
    const summary = summarizeSales([]);
    expect(summary.averageTicketCents).toBe(0);
    expect(summary.revenueCents).toBe(0);
    expect(summary.confirmedOrders).toBe(0);
  });

  it('omite variação percentual quando o período anterior não tem base', () => {
    expect(percentChange(15000, 10000)).toBe(50);
    expect(percentChange(10000, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });

  it('não divide conversão por zero visitantes', () => {
    expect(conversionRate(2, 10)).toBe(0.2);
    expect(conversionRate(1, 0)).toBeNull();
  });

  it('separa vendas confirmadas de pedidos cancelados', () => {
    const counts = countOrdersByStatus([
      { paymentStatus: 'PENDING', orderStatus: 'AWAITING_PAYMENT' },
      { paymentStatus: 'PAID', orderStatus: 'PROCESSING' },
      { paymentStatus: 'CANCELLED', orderStatus: 'CANCELLED' },
    ]);
    expect(counts.created).toBe(3);
    expect(counts.confirmed).toBe(2);
    expect(counts.processing).toBe(1);
    expect(counts.cancelled).toBe(1);
  });
});
