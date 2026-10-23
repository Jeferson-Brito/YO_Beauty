export const REVENUE_PAYMENT_STATUSES = ['PAID', 'PARTIALLY_REFUNDED'] as const;
export const EXCLUDED_ORDER_STATUS = 'CANCELLED';

export type RevenueOrderInput = {
  paymentStatus: string;
  orderStatus: string;
  totalCents: number;
  refundedAmountCents: number;
  userId?: string | null;
};

export function isRevenueOrder(order: RevenueOrderInput): boolean {
  if (order.orderStatus === EXCLUDED_ORDER_STATUS) return false;
  if (!REVENUE_PAYMENT_STATUSES.includes(order.paymentStatus as (typeof REVENUE_PAYMENT_STATUSES)[number])) {
    return false;
  }
  return order.totalCents - order.refundedAmountCents > 0;
}

export function netRevenueCents(order: RevenueOrderInput): number {
  if (!isRevenueOrder(order)) return 0;
  return order.totalCents - order.refundedAmountCents;
}

export type SalesSummary = {
  revenueCents: number;
  paidOrders: number;
  averageTicketCents: number;
  distinctCustomers: number;
};

export function summarizeSales(orders: RevenueOrderInput[]): SalesSummary {
  const valid = orders.filter(isRevenueOrder);
  const revenueCents = valid.reduce((sum, order) => sum + netRevenueCents(order), 0);
  const customers = new Set(valid.map((order) => order.userId).filter((id): id is string => Boolean(id)));

  return {
    revenueCents,
    paidOrders: valid.length,
    averageTicketCents: valid.length === 0 ? 0 : Math.round(revenueCents / valid.length),
    distinctCustomers: customers.size,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function conversionRate(buyers: number, visitors: number): number | null {
  if (!Number.isFinite(buyers) || !Number.isFinite(visitors) || visitors <= 0) return null;
  return buyers / visitors;
}

export type OrderStatusCounts = {
  created: number;
  paid: number;
  pendingPayment: number;
  cancelled: number;
  processing: number;
  refunded: number;
};

export function countOrdersByStatus(
  orders: Array<{ paymentStatus: string; orderStatus: string }>,
): OrderStatusCounts {
  return {
    created: orders.length,
    paid: orders.filter((order) => order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED')
      .length,
    pendingPayment: orders.filter((order) => order.paymentStatus === 'PENDING').length,
    cancelled: orders.filter(
      (order) => order.orderStatus === 'CANCELLED' || order.paymentStatus === 'CANCELLED',
    ).length,
    processing: orders.filter((order) => order.orderStatus === 'PROCESSING').length,
    refunded: orders.filter((order) => order.paymentStatus === 'REFUNDED').length,
  };
}
