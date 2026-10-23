import { DateTime } from 'luxon';
import { prisma } from '../config/prisma';
import { averageDaysBetweenPurchases, classifyCustomer, parseLoyaltyRules, type CustomerSegment } from '../domain/loyalty';
import { countOrdersByStatus, isRevenueOrder, percentChange, conversionRate } from '../domain/metrics';
import { anchoredCards, previousEquivalent, resolvePeriod, type PeriodPreset, type TimeRange } from '../domain/periods';
import { salesRepository } from '../repositories/sales.repository';

const SEGMENTS: CustomerSegment[] = ['NEW', 'FIRST_PURCHASE', 'RECURRING', 'VIP', 'INACTIVE'];

function daysOf(range: TimeRange): string[] {
  const days: string[] = [];
  let cursor = DateTime.fromJSDate(range.start, { zone: range.timeZone }).startOf('day');
  const end = DateTime.fromJSDate(range.end, { zone: range.timeZone });
  while (cursor < end) {
    const iso = cursor.toISODate();
    if (iso) days.push(iso);
    cursor = cursor.plus({ days: 1 });
  }
  return days;
}

function orderFilter(start: Date, end: Date) {
  return {
    paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] as ('PAID' | 'PARTIALLY_REFUNDED')[] },
    orderStatus: { not: 'CANCELLED' as const },
    payments: {
      some: {
        status: { in: ['PAID', 'PARTIALLY_REFUNDED'] as ('PAID' | 'PARTIALLY_REFUNDED')[] },
        paidAt: { gte: start, lt: end },
      },
    },
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export const dashboardService = {
  async build(input: { preset: PeriodPreset; startDate?: string; endDate?: string }) {
    const settings = await prisma.storeSettings.findUniqueOrThrow({ where: { id: 'default' } });
    const range = resolvePeriod(input.preset, {
      timeZone: settings.timezone,
      startDate: input.startDate,
      endDate: input.endDate,
    });
    const previous = previousEquivalent(range);
    const cards = await cardWindows(range);
    const current = await salesRepository.summarizePaid(range.start, range.end);
    const previousSales = await salesRepository.summarizePaid(previous.start, previous.end);
    const created = await prisma.order.findMany({
      where: { createdAt: { gte: range.start, lt: range.end } },
      select: { paymentStatus: true, orderStatus: true },
    });
    const counts = countOrdersByStatus(created);
    const registeredCustomers = await prisma.user.count({ where: { role: 'CLIENT' } });
    const newCustomers = await prisma.user.count({
      where: { role: 'CLIENT', createdAt: { gte: cards.monthWindow.start, lt: cards.monthWindow.end } },
    });
    const loyalty = await loyaltySnapshot(range, settings.loyaltyRules);
    const traffic = await trafficSnapshot(range);
    const series = await dailySeries(range);
    const rankings = await rankingsOf(range);
    const stock = await stockSnapshot(settings.lowStockThreshold);

    return {
      period: {
        preset: input.preset,
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        referenceDate: range.referenceDate,
      },
      cards: {
        day: cards.day,
        week: cards.week,
        month: cards.month,
        total: cards.total,
      },
      summary: {
        revenueCents: current.revenueCents,
        revenueChange: percentChange(current.revenueCents, previousSales.revenueCents),
        paidOrders: current.paidOrders,
        paidOrdersChange: percentChange(current.paidOrders, previousSales.paidOrders),
        averageTicketCents: current.averageTicketCents,
        ticketChange: percentChange(current.averageTicketCents, previousSales.averageTicketCents),
        createdOrders: counts.created,
        pendingPayment: counts.pendingPayment,
        cancelled: counts.cancelled,
        processing: counts.processing,
        refunded: counts.refunded,
        registeredCustomers,
        newCustomers,
        buyers: current.distinctCustomers,
        recurringCustomers: loyalty.recurringCustomers,
        recurringInPeriod: loyalty.recurringInPeriod,
        visitors: traffic.visitors,
        sessions: traffic.sessions,
        pageViews: traffic.pageViews,
        conversion: conversionRate(current.distinctCustomers, traffic.visitors),
      },
      series,
      productsByQuantity: rankings.byQuantity,
      productsByRevenue: rankings.byRevenue,
      categories: rankings.categories,
      loyalty: {
        segments: loyalty.segments,
        averageDaysBetweenPurchases: loyalty.averageDaysBetweenPurchases,
      },
      stock,
    };
  },

  async csv(input: { preset: PeriodPreset; startDate?: string; endDate?: string }) {
    const report = await this.build(input);
    const lines = [
      ['data', 'faturamento_centavos', 'pedidos_pagos'].join(','),
      ...report.series.map((row) => [csvCell(row.date), csvCell(row.revenueCents), csvCell(row.paidOrders)].join(',')),
    ];
    return `\uFEFF${lines.join('\n')}\n`;
  },
};

async function cardWindows(range: TimeRange) {
  const windows = anchoredCards(range.referenceDate, range.timeZone);
  const [day, previousDay, week, previousWeek, month, previousMonth, total] = await Promise.all([
    salesRepository.summarizePaid(windows.day.start, windows.day.end),
    salesRepository.summarizePaid(windows.previousDay.start, windows.previousDay.end),
    salesRepository.summarizePaid(windows.week.start, windows.week.end),
    salesRepository.summarizePaid(windows.previousWeek.start, windows.previousWeek.end),
    salesRepository.summarizePaid(windows.month.start, windows.month.end),
    salesRepository.summarizePaid(windows.previousMonth.start, windows.previousMonth.end),
    salesRepository.summarizePaid(new Date(0), new Date('2999-01-01T00:00:00.000Z')),
  ]);
  return {
    day: { revenueCents: day.revenueCents, change: percentChange(day.revenueCents, previousDay.revenueCents) },
    week: { revenueCents: week.revenueCents, change: percentChange(week.revenueCents, previousWeek.revenueCents) },
    month: { revenueCents: month.revenueCents, change: percentChange(month.revenueCents, previousMonth.revenueCents) },
    total: { revenueCents: total.revenueCents, change: null },
    monthWindow: windows.month,
  };
}

async function dailySeries(range: TimeRange) {
  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
      paidAt: { gte: range.start, lt: range.end },
      order: { paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] }, orderStatus: { not: 'CANCELLED' } },
    },
    select: {
      paidAt: true,
      orderId: true,
      order: { select: { paymentStatus: true, orderStatus: true, totalCents: true, refundedAmountCents: true } },
    },
  });
  const byDay = new Map<string, { revenueCents: number; orders: Set<string> }>();
  for (const payment of payments) {
    if (!payment.paidAt || !isRevenueOrder(payment.order)) continue;
    const day = DateTime.fromJSDate(payment.paidAt, { zone: range.timeZone }).toISODate();
    if (!day) continue;
    const bucket = byDay.get(day) ?? { revenueCents: 0, orders: new Set<string>() };
    if (!bucket.orders.has(payment.orderId)) {
      bucket.orders.add(payment.orderId);
      bucket.revenueCents += payment.order.totalCents - payment.order.refundedAmountCents;
    }
    byDay.set(day, bucket);
  }
  return daysOf(range).map((date) => ({
    date,
    revenueCents: byDay.get(date)?.revenueCents ?? 0,
    paidOrders: byDay.get(date)?.orders.size ?? 0,
  }));
}

async function rankingsOf(range: TimeRange) {
  const lines = await prisma.orderItem.findMany({
    where: { order: orderFilter(range.start, range.end) },
    select: {
      productNameSnapshot: true,
      quantity: true,
      lineTotalCents: true,
      order: { select: { paymentStatus: true, orderStatus: true, totalCents: true, refundedAmountCents: true } },
      product: {
        select: {
          categories: { where: { isPrimary: true }, select: { category: { select: { name: true } } } },
        },
      },
    },
  });
  const products = new Map<string, { name: string; quantity: number; revenueCents: number }>();
  const categories = new Map<string, { name: string; quantity: number; revenueCents: number }>();
  for (const line of lines) {
    if (!isRevenueOrder(line.order)) continue;
    const product = products.get(line.productNameSnapshot) ?? { name: line.productNameSnapshot, quantity: 0, revenueCents: 0 };
    product.quantity += line.quantity;
    product.revenueCents += line.lineTotalCents;
    products.set(line.productNameSnapshot, product);
    const categoryName = line.product?.categories[0]?.category.name ?? 'Sem categoria';
    const category = categories.get(categoryName) ?? { name: categoryName, quantity: 0, revenueCents: 0 };
    category.quantity += line.quantity;
    category.revenueCents += line.lineTotalCents;
    categories.set(categoryName, category);
  }
  const ranked = [...products.values()];
  return {
    byQuantity: [...ranked].sort((left, right) => right.quantity - left.quantity).slice(0, 5),
    byRevenue: [...ranked].sort((left, right) => right.revenueCents - left.revenueCents).slice(0, 5),
    categories: [...categories.values()].sort((left, right) => right.revenueCents - left.revenueCents).slice(0, 5),
  };
}

async function trafficSnapshot(range: TimeRange) {
  const [events, sessions] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { occurredAt: { gte: range.start, lt: range.end }, eventType: { not: 'purchase' }, visitorId: { not: null } },
      select: { visitorId: true, eventType: true },
    }),
    prisma.analyticsSession.count({ where: { startedAt: { gte: range.start, lt: range.end } } }),
  ]);
  return {
    visitors: new Set(events.map((event) => event.visitorId)).size,
    sessions,
    pageViews: events.filter((event) => event.eventType === 'page_view').length,
  };
}

async function loyaltySnapshot(range: TimeRange, rulesValue: unknown) {
  const rules = parseLoyaltyRules(rulesValue);
  const reference = DateTime.fromISO(range.referenceDate, { zone: range.timeZone }).endOf('day').toJSDate();
  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
      paidAt: { not: null },
      order: { paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] }, orderStatus: { not: 'CANCELLED' } },
    },
    select: {
      paidAt: true,
      order: { select: { userId: true, paymentStatus: true, orderStatus: true, totalCents: true, refundedAmountCents: true } },
    },
  });
  const grouped = new Map<string, { spent: number; dates: Date[] }>();
  for (const payment of payments) {
    if (!payment.paidAt || !isRevenueOrder(payment.order)) continue;
    const current = grouped.get(payment.order.userId) ?? { spent: 0, dates: [] };
    current.spent += payment.order.totalCents - payment.order.refundedAmountCents;
    current.dates.push(payment.paidAt);
    grouped.set(payment.order.userId, current);
  }
  const segments = Object.fromEntries(SEGMENTS.map((segment) => [segment, 0])) as Record<CustomerSegment, number>;
  let recurringCustomers = 0;
  let recurringInPeriod = 0;
  const averages: number[] = [];
  for (const customer of grouped.values()) {
    const paidOrders = customer.dates.length;
    const lastPaidAt = customer.dates.reduce((latest, date) => (date > latest ? date : latest));
    const segment = classifyCustomer({
      paidOrders,
      netSpentCents: customer.spent,
      lastPaidAt,
      referenceDate: reference,
      rules,
    });
    segments[segment] += 1;
    if (paidOrders >= 2) {
      recurringCustomers += 1;
      if (customer.dates.some((date) => date >= range.start && date < range.end)) recurringInPeriod += 1;
    }
    const average = averageDaysBetweenPurchases(customer.dates);
    if (average != null) averages.push(average);
  }
  const registered = await prisma.user.count({ where: { role: 'CLIENT' } });
  segments.NEW += Math.max(0, registered - grouped.size);
  return {
    segments,
    recurringCustomers,
    recurringInPeriod,
    averageDaysBetweenPurchases: averages.length === 0 ? null : averages.reduce((sum, value) => sum + value, 0) / averages.length,
  };
}

async function stockSnapshot(threshold: number) {
  const [low, out] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'ACTIVE', stockQuantity: { gt: 0, lte: threshold } },
      select: { name: true, sku: true, stockQuantity: true },
      orderBy: { stockQuantity: 'asc' },
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE', stockQuantity: 0 },
      select: { name: true, sku: true, stockQuantity: true },
      orderBy: { name: 'asc' },
      take: 8,
    }),
  ]);
  return { low, out };
}
