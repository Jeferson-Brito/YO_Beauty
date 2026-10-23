import { describe, expect, it } from 'vitest';
import { anchoredCards, PeriodError, previousEquivalent, resolvePeriod } from '../src/domain/periods';

const now = new Date('2026-10-22T18:00:00.000Z');
const zone = 'America/Recife';

describe('períodos comerciais', () => {
  it('calcula hoje e ontem no fuso de Recife', () => {
    const today = resolvePeriod('today', { now, timeZone: zone });
    expect(today.start.toISOString()).toBe('2026-10-22T03:00:00.000Z');
    expect(today.end.toISOString()).toBe('2026-10-23T03:00:00.000Z');
    expect(today.referenceDate).toBe('2026-10-22');

    const yesterday = resolvePeriod('yesterday', { now, timeZone: zone });
    expect(yesterday.start.toISOString()).toBe('2026-10-21T03:00:00.000Z');
    expect(yesterday.end.toISOString()).toBe('2026-10-22T03:00:00.000Z');
  });

  it('calcula a semana de segunda a segunda e o mês civil', () => {
    const week = resolvePeriod('current_week', { now, timeZone: zone });
    expect(week.start.toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(week.end.toISOString()).toBe('2026-10-26T03:00:00.000Z');
    expect(week.referenceDate).toBe('2026-10-25');

    const previousWeek = resolvePeriod('previous_week', { now, timeZone: zone });
    expect(previousWeek.start.toISOString()).toBe('2026-10-12T03:00:00.000Z');
    expect(previousWeek.end.toISOString()).toBe('2026-10-19T03:00:00.000Z');

    const month = resolvePeriod('current_month', { now, timeZone: zone });
    expect(month.start.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(month.end.toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('usa intervalos semiabertos nos últimos 7 dias e últimos 3 meses', () => {
    const sevenDays = resolvePeriod('last_7_days', { now, timeZone: zone });
    expect(sevenDays.start.toISOString()).toBe('2026-10-16T03:00:00.000Z');
    expect(sevenDays.end.toISOString()).toBe('2026-10-23T03:00:00.000Z');

    const threeMonths = resolvePeriod('last_3_months', { now, timeZone: zone });
    expect(threeMonths.start.toISOString()).toBe('2026-07-22T03:00:00.000Z');
    expect(threeMonths.end.toISOString()).toBe('2026-10-23T03:00:00.000Z');
  });

  it('ancora os cards de dia, semana e mês na data de referência', () => {
    const cards = anchoredCards('2026-10-22', zone);
    expect(cards.day.start.toISOString()).toBe('2026-10-22T03:00:00.000Z');
    expect(cards.week.start.toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(cards.week.end.toISOString()).toBe('2026-10-23T03:00:00.000Z');
    expect(cards.previousWeek.end.toISOString()).toBe('2026-10-16T03:00:00.000Z');
    expect(cards.month.start.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(cards.month.end.toISOString()).toBe('2026-10-23T03:00:00.000Z');
    expect(cards.previousMonth.start.toISOString()).toBe('2026-09-01T03:00:00.000Z');
    expect(cards.previousMonth.end.toISOString()).toBe('2026-09-23T03:00:00.000Z');
  });

  it('compara o mês fechado com o mês anterior inteiro', () => {
    const cards = anchoredCards('2026-03-31', zone);
    expect(cards.previousMonth.start.toISOString()).toBe('2026-02-01T03:00:00.000Z');
    expect(cards.previousMonth.end.toISOString()).toBe('2026-03-01T03:00:00.000Z');
  });

  it('rejeita período personalizado invertido', () => {
    expect(() => resolvePeriod('custom', { startDate: '2026-10-22', endDate: '2026-10-01', timeZone: zone })).toThrow(
      PeriodError,
    );
  });

  it('calcula o período anterior de mesma duração', () => {
    const today = resolvePeriod('today', { now, timeZone: zone });
    const previous = previousEquivalent(today);
    expect(previous.start.toISOString()).toBe('2026-10-21T03:00:00.000Z');
    expect(previous.end.toISOString()).toBe('2026-10-22T03:00:00.000Z');
  });
});
