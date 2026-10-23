import { describe, expect, it } from 'vitest';
import { averageDaysBetweenPurchases, classifyCustomer, DEFAULT_LOYALTY_RULES, isCustomerAccount } from '../src/domain/loyalty';

const reference = new Date('2026-10-22T15:00:00.000Z');

describe('fidelização', () => {
  it('classifica pela precedência inativo, VIP, recorrente, primeira compra e novo', () => {
    expect(classifyCustomer({ paidOrders: 0, netSpentCents: 0, lastPaidAt: null, referenceDate: reference })).toBe('NEW');
    expect(
      classifyCustomer({
        paidOrders: 1,
        netSpentCents: 2990,
        lastPaidAt: new Date('2026-10-10T12:00:00.000Z'),
        referenceDate: reference,
      }),
    ).toBe('FIRST_PURCHASE');
    expect(
      classifyCustomer({
        paidOrders: 2,
        netSpentCents: 8000,
        lastPaidAt: new Date('2026-10-10T12:00:00.000Z'),
        referenceDate: reference,
      }),
    ).toBe('RECURRING');
    expect(
      classifyCustomer({
        paidOrders: 2,
        netSpentCents: DEFAULT_LOYALTY_RULES.vipMinSpentCents,
        lastPaidAt: new Date('2026-10-10T12:00:00.000Z'),
        referenceDate: reference,
      }),
    ).toBe('VIP');
    expect(
      classifyCustomer({
        paidOrders: 5,
        netSpentCents: 20000,
        lastPaidAt: new Date('2026-10-10T12:00:00.000Z'),
        referenceDate: reference,
      }),
    ).toBe('VIP');
    expect(
      classifyCustomer({
        paidOrders: 6,
        netSpentCents: 80000,
        lastPaidAt: new Date('2026-06-01T12:00:00.000Z'),
        referenceDate: reference,
      }),
    ).toBe('INACTIVE');
  });

  it('calcula o intervalo médio apenas com duas compras ou mais', () => {
    expect(averageDaysBetweenPurchases([new Date('2026-01-01T00:00:00.000Z')])).toBeNull();
    expect(
      averageDaysBetweenPurchases([
        new Date('2026-01-11T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
      ]),
    ).toBe(10);
  });

  it('não trata administrador como cliente da base', () => {
    expect(isCustomerAccount('CLIENT')).toBe(true);
    expect(isCustomerAccount('ADMIN')).toBe(false);
  });
});
