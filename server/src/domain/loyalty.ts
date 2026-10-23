import { z } from 'zod';

export const DEFAULT_LOYALTY_RULES = {
  vipMinSpentCents: 50_000,
  vipMinPaidOrders: 5,
  inactiveAfterDays: 90,
} as const;

export type LoyaltyRules = {
  vipMinSpentCents: number;
  vipMinPaidOrders: number;
  inactiveAfterDays: number;
};

const loyaltyRulesSchema = z.object({
  vipMinSpentCents: z.number().int().nonnegative().default(DEFAULT_LOYALTY_RULES.vipMinSpentCents),
  vipMinPaidOrders: z.number().int().positive().default(DEFAULT_LOYALTY_RULES.vipMinPaidOrders),
  inactiveAfterDays: z.number().int().positive().default(DEFAULT_LOYALTY_RULES.inactiveAfterDays),
});

export type CustomerSegment = 'NEW' | 'FIRST_PURCHASE' | 'RECURRING' | 'VIP' | 'INACTIVE';

export function parseLoyaltyRules(value: unknown): LoyaltyRules {
  const parsed = loyaltyRulesSchema.safeParse(value ?? {});
  if (!parsed.success) return { ...DEFAULT_LOYALTY_RULES };
  return parsed.data;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function classifyCustomer(input: {
  paidOrders: number;
  netSpentCents: number;
  lastPaidAt: Date | null;
  referenceDate: Date;
  rules?: LoyaltyRules;
}): CustomerSegment {
  const rules = input.rules ?? DEFAULT_LOYALTY_RULES;
  const inactive =
    input.paidOrders > 0 &&
    input.lastPaidAt != null &&
    input.referenceDate.getTime() - input.lastPaidAt.getTime() >= rules.inactiveAfterDays * DAY_MS;

  if (inactive) return 'INACTIVE';
  if (input.netSpentCents >= rules.vipMinSpentCents || input.paidOrders >= rules.vipMinPaidOrders) return 'VIP';
  if (input.paidOrders >= 2) return 'RECURRING';
  if (input.paidOrders === 1) return 'FIRST_PURCHASE';
  return 'NEW';
}

export function averageDaysBetweenPurchases(dates: Date[]): number | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort((left, right) => left.getTime() - right.getTime());
  let total = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    total += (sorted[index].getTime() - sorted[index - 1].getTime()) / DAY_MS;
  }
  return total / (sorted.length - 1);
}

export function isCustomerAccount(role: string): boolean {
  return role === 'CLIENT';
}
