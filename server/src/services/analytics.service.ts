import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { hashAnalyticsValue } from '../utils/analytics-hash';

type IncomingEvent = {
  eventId: string;
  eventType: string;
  path?: string;
  productId?: string;
  categoryId?: string;
  occurredAt?: string;
  properties?: Record<string, string | number | boolean>;
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
let lastPurgeAt = 0;

function safePath(value: string | undefined): string {
  if (!value) return '/';
  const path = value.split('?')[0]?.split('#')[0] ?? '/';
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 180) return '/';
  return path;
}

function occurredAtOf(value: string | undefined): Date {
  const now = Date.now();
  const parsed = value ? Date.parse(value) : now;
  if (!Number.isFinite(parsed) || parsed > now + 5 * MINUTE_MS || parsed < now - DAY_MS) return new Date(now);
  return new Date(parsed);
}

function cleanProperties(event: IncomingEvent): Prisma.InputJsonObject {
  const source = event.properties ?? {};
  if (event.eventType === 'search' && typeof source.query === 'string') {
    return { query: source.query.trim().slice(0, 80) };
  }
  if ((event.eventType === 'add_to_cart' || event.eventType === 'remove_from_cart') && typeof source.quantity === 'number') {
    const quantity = Math.round(source.quantity);
    if (quantity >= 1 && quantity <= 99) return { quantity };
  }
  return {};
}

function expired(lastActivityAt: Date, timeoutMinutes: number, now: Date): boolean {
  return now.getTime() - lastActivityAt.getTime() >= timeoutMinutes * MINUTE_MS;
}

export async function purgeAnalytics(retentionDays: number): Promise<void> {
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
  await prisma.analyticsEvent.deleteMany({ where: { occurredAt: { lt: cutoff } } });
  await prisma.analyticsVisitor.deleteMany({ where: { lastSeenAt: { lt: cutoff } } });
}

async function purgeIfDue(retentionDays: number): Promise<void> {
  if (Date.now() - lastPurgeAt < 60 * MINUTE_MS) return;
  lastPurgeAt = Date.now();
  await purgeAnalytics(retentionDays);
}

async function knownIds(model: 'product' | 'category', ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows =
    model === 'product'
      ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } })
      : await prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return new Set(rows.map((row) => row.id));
}

export const analyticsService = {
  async saveConsent(anonymousId: string, status: 'GRANTED' | 'DENIED') {
    const store = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!store?.analyticsEnabled) return { stored: false };
    const anonymousIdHash = hashAnalyticsValue(anonymousId);
    if (status === 'DENIED') {
      await prisma.analyticsVisitor.deleteMany({ where: { anonymousIdHash } });
      return { stored: false };
    }
    const now = new Date();
    await prisma.analyticsVisitor.upsert({
      where: { anonymousIdHash },
      create: { anonymousIdHash, firstSeenAt: now, lastSeenAt: now, consentStatus: 'GRANTED' },
      update: { consentStatus: 'GRANTED', lastSeenAt: now },
    });
    return { stored: true };
  },

  async ingest(
    input: { anonymousId: string; sessionId: string; events: IncomingEvent[] },
    userId: string | null,
  ) {
    const store = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!store?.analyticsEnabled) return { accepted: 0 };
    await purgeIfDue(store.analyticsRetentionDays);

    const visitor = await prisma.analyticsVisitor.findUnique({
      where: { anonymousIdHash: hashAnalyticsValue(input.anonymousId) },
    });
    if (!visitor || visitor.consentStatus !== 'GRANTED') return { accepted: 0 };

    const productIds = await knownIds(
      'product',
      input.events.map((event) => event.productId).filter((id): id is string => Boolean(id)),
    );
    const categoryIds = await knownIds(
      'category',
      input.events.map((event) => event.categoryId).filter((id): id is string => Boolean(id)),
    );
    const sessionHash = hashAnalyticsValue(input.sessionId);
    let accepted = 0;

    for (const event of input.events) {
      const saved = await storeEvent({
        event,
        visitorId: visitor.id,
        sessionHash,
        userId,
        timeoutMinutes: store.sessionTimeoutMinutes,
        productIds,
        categoryIds,
      });
      if (saved) accepted += 1;
    }

    await prisma.analyticsVisitor.update({
      where: { id: visitor.id },
      data: { lastSeenAt: new Date() },
    });
    return { accepted };
  },
};

async function storeEvent(input: {
  event: IncomingEvent;
  visitorId: string;
  sessionHash: string;
  userId: string | null;
  timeoutMinutes: number;
  productIds: Set<string>;
  categoryIds: Set<string>;
}): Promise<boolean> {
  const now = occurredAtOf(input.event.occurredAt);
  const path = safePath(input.event.path);
  const existing = await prisma.analyticsSession.findUnique({ where: { sessionIdHash: input.sessionHash } });
  const sessionIsExpired = existing ? expired(existing.lastActivityAt, input.timeoutMinutes, now) : false;

  if (input.event.eventType === 'session_started') {
    if (existing) {
      if (sessionIsExpired) return false;
      await prisma.analyticsSession.update({
        where: { id: existing.id },
        data: { lastActivityAt: now, userId: input.userId ?? existing.userId },
      });
    } else {
      await prisma.analyticsSession.create({
        data: {
          sessionIdHash: input.sessionHash,
          visitorId: input.visitorId,
          userId: input.userId,
          startedAt: now,
          lastActivityAt: now,
          landingPage: path,
        },
      });
    }
  } else if (!existing || sessionIsExpired) {
    return false;
  } else {
    await prisma.analyticsSession.update({
      where: { id: existing.id },
      data: { lastActivityAt: now, userId: input.userId ?? existing.userId },
    });
  }

  const session = await prisma.analyticsSession.findUnique({ where: { sessionIdHash: input.sessionHash } });
  if (!session) return false;
  const duplicate = await prisma.analyticsEvent.findUnique({ where: { eventId: input.event.eventId }, select: { id: true } });
  if (duplicate) return false;

  try {
    await prisma.analyticsEvent.create({
      data: {
        eventId: input.event.eventId,
        eventType: input.event.eventType,
        visitorId: input.visitorId,
        sessionId: session.id,
        userId: input.userId,
        productId: input.event.productId && input.productIds.has(input.event.productId) ? input.event.productId : null,
        categoryId: input.event.categoryId && input.categoryIds.has(input.event.categoryId) ? input.event.categoryId : null,
        path,
        properties: cleanProperties(input.event),
        occurredAt: now,
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
    throw error;
  }
}

export async function recordServerPurchase(input: {
  orderId: string;
  userId: string | null;
  totalCents: number;
  occurredAt: Date;
}): Promise<void> {
  const store = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  if (!store?.analyticsEnabled) return;
  const eventId = `purchase:${input.orderId}`;
  const existing = await prisma.analyticsEvent.findUnique({ where: { eventId }, select: { id: true } });
  if (existing) return;
  await prisma.analyticsEvent.create({
    data: {
      eventId,
      eventType: 'purchase',
      userId: input.userId,
      path: '',
      properties: { orderId: input.orderId, totalCents: input.totalCents },
      occurredAt: input.occurredAt,
    },
  });
}
