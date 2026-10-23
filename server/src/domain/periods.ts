import { DateTime } from 'luxon';

export class PeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PeriodError';
  }
}

export const PERIOD_PRESETS = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'current_week',
  'previous_week',
  'current_month',
  'previous_month',
  'last_3_months',
  'last_6_months',
  'last_12_months',
  'custom',
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export type TimeRange = {
  start: Date;
  end: Date;
  timeZone: string;
  referenceDate: string;
};

type ResolveOptions = {
  now?: Date;
  timeZone?: string;
  startDate?: string;
  endDate?: string;
};

const MAX_CUSTOM_DAYS = 731;

function zonedNow(now: Date | undefined, timeZone: string): DateTime {
  const value = now ? DateTime.fromJSDate(now, { zone: timeZone }) : DateTime.now().setZone(timeZone);
  if (!value.isValid) throw new PeriodError('Fuso horário inválido.');
  return value;
}

function toRange(start: DateTime, end: DateTime, timeZone: string): TimeRange {
  const reference = end.minus({ milliseconds: 1 }).setZone(timeZone).toISODate();
  if (!reference) throw new PeriodError('Não foi possível calcular a data de referência.');
  return {
    start: start.toUTC().toJSDate(),
    end: end.toUTC().toJSDate(),
    timeZone,
    referenceDate: reference,
  };
}

export function resolvePeriod(preset: PeriodPreset, options: ResolveOptions = {}): TimeRange {
  const timeZone = options.timeZone ?? 'America/Recife';
  const now = zonedNow(options.now, timeZone);
  const startOfToday = now.startOf('day');
  const startOfTomorrow = startOfToday.plus({ days: 1 });

  switch (preset) {
    case 'today':
      return toRange(startOfToday, startOfTomorrow, timeZone);
    case 'yesterday':
      return toRange(startOfToday.minus({ days: 1 }), startOfToday, timeZone);
    case 'last_7_days':
      return toRange(startOfToday.minus({ days: 6 }), startOfTomorrow, timeZone);
    case 'last_30_days':
      return toRange(startOfToday.minus({ days: 29 }), startOfTomorrow, timeZone);
    case 'current_week': {
      const start = startOfToday.minus({ days: now.weekday - 1 });
      return toRange(start, start.plus({ weeks: 1 }), timeZone);
    }
    case 'previous_week': {
      const currentWeekStart = startOfToday.minus({ days: now.weekday - 1 });
      return toRange(currentWeekStart.minus({ weeks: 1 }), currentWeekStart, timeZone);
    }
    case 'current_month': {
      const start = now.startOf('month');
      return toRange(start, start.plus({ months: 1 }), timeZone);
    }
    case 'previous_month': {
      const start = now.startOf('month').minus({ months: 1 });
      return toRange(start, now.startOf('month'), timeZone);
    }
    case 'last_3_months':
    case 'last_6_months':
    case 'last_12_months': {
      const months = preset === 'last_3_months' ? 3 : preset === 'last_6_months' ? 6 : 12;
      return toRange(startOfToday.minus({ months }), startOfTomorrow, timeZone);
    }
    case 'custom':
      return resolveCustomPeriod(timeZone, options.startDate, options.endDate);
    default:
      throw new PeriodError('Período não reconhecido.');
  }
}

function resolveCustomPeriod(timeZone: string, startDate?: string, endDate?: string): TimeRange {
  if (!startDate || !endDate) {
    throw new PeriodError('Informe a data inicial e a data final.');
  }
  const start = DateTime.fromISO(startDate, { zone: timeZone }).startOf('day');
  const endDay = DateTime.fromISO(endDate, { zone: timeZone }).startOf('day');
  if (!start.isValid || !endDay.isValid) {
    throw new PeriodError('Datas inválidas. Use o formato AAAA-MM-DD.');
  }
  if (endDay < start) {
    throw new PeriodError('A data inicial não pode ser posterior à data final.');
  }
  const end = endDay.plus({ days: 1 });
  if (end.diff(start, 'days').days > MAX_CUSTOM_DAYS) {
    throw new PeriodError('O período personalizado pode ter no máximo 731 dias.');
  }
  return toRange(start, end, timeZone);
}

export function previousEquivalent(range: TimeRange): TimeRange {
  const duration = range.end.getTime() - range.start.getTime();
  const start = new Date(range.start.getTime() - duration);
  const end = new Date(range.start.getTime());
  const reference = DateTime.fromJSDate(new Date(end.getTime() - 1), { zone: range.timeZone }).toISODate();
  if (!reference) throw new PeriodError('Não foi possível calcular o período anterior.');
  return { start, end, timeZone: range.timeZone, referenceDate: reference };
}

export type AnchoredWindows = {
  day: { start: Date; end: Date };
  previousDay: { start: Date; end: Date };
  week: { start: Date; end: Date };
  previousWeek: { start: Date; end: Date };
  month: { start: Date; end: Date };
  previousMonth: { start: Date; end: Date };
};

export function anchoredCards(referenceDate: string, timeZone = 'America/Recife'): AnchoredWindows {
  const reference = DateTime.fromISO(referenceDate, { zone: timeZone }).startOf('day');
  if (!reference.isValid) throw new PeriodError('Data de referência inválida.');

  const nextDay = reference.plus({ days: 1 });
  const weekStart = reference.minus({ days: reference.weekday - 1 });
  const previousWeekStart = weekStart.minus({ weeks: 1 });
  const monthStart = reference.startOf('month');
  const previousMonthStart = monthStart.minus({ months: 1 });
  const previousMonthEnd =
    reference.day === reference.daysInMonth
      ? monthStart
      : previousMonthStart.plus({ days: Math.min(reference.day, previousMonthStart.daysInMonth) });

  return {
    day: { start: reference.toJSDate(), end: nextDay.toJSDate() },
    previousDay: { start: reference.minus({ days: 1 }).toJSDate(), end: reference.toJSDate() },
    week: { start: weekStart.toJSDate(), end: nextDay.toJSDate() },
    previousWeek: {
      start: previousWeekStart.toJSDate(),
      end: previousWeekStart.plus({ days: reference.weekday }).toJSDate(),
    },
    month: { start: monthStart.toJSDate(), end: nextDay.toJSDate() },
    previousMonth: { start: previousMonthStart.toJSDate(), end: previousMonthEnd.toJSDate() },
  };
}
