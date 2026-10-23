import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { recordServerPurchase } from '../src/services/analytics.service';

const anonymousId = randomUUID();
const sessionId = randomUUID();

describe('analytics com consentimento', () => {
  afterAll(async () => {
    await prisma.analyticsEvent.deleteMany();
    await prisma.analyticsSession.deleteMany();
    await prisma.analyticsVisitor.deleteMany();
    await prisma.storeSettings.update({ where: { id: 'default' }, data: { analyticsEnabled: true } });
  });

  it('só grava o código da visita depois do consentimento e ignora reenvio', async () => {
    const eventId = randomUUID();
    const refused = await request(app).post('/api/analytics/events').send({
      anonymousId,
      sessionId,
      events: [{ eventId, eventType: 'page_view', path: '/produto/gloss?x=1' }],
    });
    expect(refused.status).toBe(200);
    expect(refused.body.data.accepted).toBe(0);
    expect(await prisma.analyticsEvent.count()).toBe(0);

    const consent = await request(app).post('/api/analytics/consent').send({ anonymousId, status: 'GRANTED' });
    expect(consent.status).toBe(200);
    const stored = await prisma.analyticsVisitor.findFirstOrThrow();
    expect(stored.anonymousIdHash).not.toBe(anonymousId);
    expect(JSON.stringify(stored)).not.toContain(anonymousId);

    const accepted = await request(app).post('/api/analytics/events').send({
      anonymousId,
      sessionId,
      events: [
        { eventId: randomUUID(), eventType: 'session_started', path: '/' },
        { eventId, eventType: 'page_view', path: '/produto/gloss?ref=anuncio' },
      ],
    });
    expect(accepted.body.data.accepted).toBe(2);
    const page = await prisma.analyticsEvent.findUniqueOrThrow({ where: { eventId } });
    expect(page.path).toBe('/produto/gloss');

    const duplicate = await request(app).post('/api/analytics/events').send({
      anonymousId,
      sessionId,
      events: [{ eventId, eventType: 'page_view', path: '/produto/gloss' }],
    });
    expect(duplicate.body.data.accepted).toBe(0);
    expect(await prisma.analyticsEvent.count({ where: { eventId } })).toBe(1);

    const purchase = await request(app).post('/api/analytics/events').send({
      anonymousId,
      sessionId,
      events: [{ eventId: randomUUID(), eventType: 'purchase', path: '/' }],
    });
    expect(purchase.status).toBe(422);

    await recordServerPurchase({ orderId: 'pedido-servidor', userId: null, totalCents: 2990, occurredAt: new Date() });
    await recordServerPurchase({ orderId: 'pedido-servidor', userId: null, totalCents: 2990, occurredAt: new Date() });
    expect(await prisma.analyticsEvent.count({ where: { eventType: 'purchase' } })).toBe(1);

    const session = await prisma.analyticsSession.findFirstOrThrow();
    await prisma.analyticsSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date(Date.now() - 31 * 60 * 1000) },
    });
    const stale = await request(app).post('/api/analytics/events').send({
      anonymousId,
      sessionId,
      events: [{ eventId: randomUUID(), eventType: 'page_view', path: '/carrinho' }],
    });
    expect(stale.body.data.accepted).toBe(0);

    const freshSession = randomUUID();
    const renewed = await request(app).post('/api/analytics/events').send({
      anonymousId,
      sessionId: freshSession,
      events: [{ eventId: randomUUID(), eventType: 'session_started', path: '/carrinho' }],
    });
    expect(renewed.body.data.accepted).toBe(1);

    await prisma.storeSettings.update({ where: { id: 'default' }, data: { analyticsEnabled: false } });
    const blocked = await request(app).post('/api/analytics/events').send({
      anonymousId,
      sessionId: freshSession,
      events: [{ eventId: randomUUID(), eventType: 'page_view', path: '/' }],
    });
    expect(blocked.body.data.accepted).toBe(0);
    await prisma.storeSettings.update({ where: { id: 'default' }, data: { analyticsEnabled: true } });
  });
});
