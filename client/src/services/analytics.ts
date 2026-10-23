const CONSENT_KEY = 'yb_analytics_consent';
const VISITOR_KEY = 'yb_analytics_visitor';
const SESSION_KEY = 'yb_analytics_session';

type Consent = 'granted' | 'denied';

type TrackInput = {
  path?: string;
  productId?: string;
  categoryId?: string;
  properties?: Record<string, string | number | boolean>;
};

let enabled = false;
let timeoutMinutes = 30;

export function configureAnalytics(config: { analyticsEnabled: boolean; sessionTimeoutMinutes?: number }) {
  enabled = config.analyticsEnabled;
  timeoutMinutes = config.sessionTimeoutMinutes && config.sessionTimeoutMinutes > 0 ? config.sessionTimeoutMinutes : 30;
}

export function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function grantConsent() {
  const visitor = localStorage.getItem(VISITOR_KEY) ?? crypto.randomUUID();
  localStorage.setItem(VISITOR_KEY, visitor);
  localStorage.setItem(CONSENT_KEY, 'granted');
  void sendConsent(visitor, 'GRANTED');
  track('page_view');
}

export function denyConsent() {
  const visitor = localStorage.getItem(VISITOR_KEY);
  localStorage.setItem(CONSENT_KEY, 'denied');
  localStorage.removeItem(VISITOR_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (visitor) void sendConsent(visitor, 'DENIED');
}

export function track(eventType: string, input: TrackInput = {}) {
  if (!enabled || readConsent() !== 'granted') return;
  if (window.location.pathname.startsWith('/admin')) return;
  const visitor = localStorage.getItem(VISITOR_KEY);
  if (!visitor) return;
  const session = touchSession();
  const path = (input.path ?? window.location.pathname).slice(0, 180);
  const events = [];
  if (session.started) events.push(eventBody('session_started', path));
  events.push({
    ...eventBody(eventType, path),
    productId: input.productId,
    categoryId: input.categoryId,
    properties: input.properties,
  });
  void fetch('/api/analytics/events', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonymousId: visitor, sessionId: session.id, events }),
  }).catch(() => undefined);
}

function eventBody(eventType: string, path: string) {
  return { eventId: crypto.randomUUID(), eventType, path, occurredAt: new Date().toISOString() };
}

function touchSession() {
  const now = Date.now();
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { id?: string; at?: number };
      if (parsed.id && typeof parsed.at === 'number' && now - parsed.at < timeoutMinutes * 60 * 1000) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, at: now }));
        return { id: parsed.id, started: false };
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
  return { id, started: true };
}

function sendConsent(anonymousId: string, status: 'GRANTED' | 'DENIED') {
  return fetch('/api/analytics/consent', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonymousId, status }),
  }).catch(() => undefined);
}
