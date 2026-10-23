import { env } from '../config/env';

export const SESSION_COOKIE = 'yb_session';

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: env.SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}
