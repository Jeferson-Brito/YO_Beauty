import { z } from 'zod';

export const CLIENT_EVENT_TYPES = [
  'session_started',
  'page_view',
  'category_view',
  'product_view',
  'search',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'login_success',
  'sign_up',
] as const;

const propertyValue = z.union([z.string().max(80), z.number().finite(), z.boolean()]);

export const analyticsEventSchema = z.object({
  anonymousId: z.string().uuid(),
  sessionId: z.string().uuid(),
  events: z
    .array(
      z.object({
        eventId: z.string().uuid(),
        eventType: z.enum(CLIENT_EVENT_TYPES),
        path: z.string().max(200).optional(),
        productId: z.string().trim().max(80).optional(),
        categoryId: z.string().trim().max(80).optional(),
        occurredAt: z.string().datetime().optional(),
        properties: z.record(propertyValue).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const consentSchema = z.object({
  anonymousId: z.string().uuid(),
  status: z.enum(['GRANTED', 'DENIED']),
});
