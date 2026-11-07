export const EXCLUDED_ORDER_STATUS = 'CANCELLED';

export type RevenueOrderInput = {
  orderStatus: string;
  totalCents: number;
  userId?: string | null;
};

export function isRevenueOrder(order: RevenueOrderInput): boolean {
  if (order.orderStatus === EXCLUDED_ORDER_STATUS) return false;
  return order.totalCents > 0;
}

export function netRevenueCents(order: RevenueOrderInput): number {
  if (!isRevenueOrder(order)) return 0;
  return order.totalCents;
}

export type SalesSummary = {
  revenueCents: number;
  confirmedOrders: number;
  averageTicketCents: number;
  distinctCustomers: number;
};

export function summarizeSales(orders: RevenueOrderInput[]): SalesSummary {
  const valid = orders.filter(isRevenueOrder);
  const revenueCents = valid.reduce((sum, order) => sum + netRevenueCents(order), 0);
  const customers = new Set(valid.map((order) => order.userId).filter((id): id is string => Boolean(id)));

  return {
    revenueCents,
    confirmedOrders: valid.length,
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

export type OrderStatusCounts = { created: number; confirmed: number; cancelled: number; processing: number };

export function countOrdersByStatus(orders: Array<{ orderStatus: string }>): OrderStatusCounts {
  return {
    created: orders.length,
    confirmed: orders.filter(order => order.orderStatus !== 'CANCELLED').length,
    cancelled: orders.filter(order => order.orderStatus === 'CANCELLED').length,
    processing: orders.filter(order => order.orderStatus === 'PROCESSING').length,
  };
}
