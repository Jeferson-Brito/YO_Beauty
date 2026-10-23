import { createHmac } from 'node:crypto';
import { env } from '../config/env';

export function hashAnalyticsValue(value: string): string {
  return createHmac('sha256', env.ANALYTICS_HASH_SECRET).update(value).digest('hex');
}
