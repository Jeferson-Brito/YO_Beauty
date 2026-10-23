import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from '../lib/password';
import { sessionRepository, userRepository } from '../repositories/user.repository';

let dummyPasswordHash: Promise<string> | null = null;

function invalidPasswordHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword('senha-indisponivel-yo-beauty');
  return dummyPasswordHash;
}

async function openSession(user: { id: string; name: string; email: string; role: 'ADMIN' | 'CLIENT'; active: boolean }) {
  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sessionRepository.create({ userId: user.id, tokenHash, expiresAt });
  return { token, user: publicUser(user) };
}

function publicUser<T extends { id: string; name: string; email: string; role: 'ADMIN' | 'CLIENT'; active: boolean }>(
  user: T,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'Este e-mail já está cadastrado.', 'EMAIL_IN_USE');
    }
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: 'CLIENT',
    });
    return publicUser(user);
  },

  async login(input: { email: string; password: string }) {
    const user = await userRepository.findByEmail(input.email);
    const passwordMatches = await verifyPassword(input.password, user?.passwordHash ?? (await invalidPasswordHash()));
    if (!user || !user.active || !passwordMatches) {
      throw new AppError(401, 'E-mail ou senha inválidos.', 'INVALID_CREDENTIALS');
    }

    return openSession(user);
  },

  async loginWithGoogle(credential: string) {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(503, 'O login com Google ainda não está configurado.', 'GOOGLE_NOT_CONFIGURED');
    }
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    let payload: { sub?: string; email?: string; email_verified?: boolean; name?: string } | undefined;
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      throw new AppError(401, 'Não foi possível confirmar a conta Google.', 'GOOGLE_INVALID');
    }
    const email = payload?.email?.trim().toLowerCase();
    if (!payload?.sub || !email || payload.email_verified !== true) {
      throw new AppError(401, 'Não foi possível confirmar a conta Google.', 'GOOGLE_INVALID');
    }

    const linked = await prisma.user.findUnique({ where: { googleSub: payload.sub } });
    if (linked) {
      if (!linked.active) throw new AppError(403, 'Esta conta está inativa.', 'INACTIVE');
      return openSession(linked);
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(
        409,
        'Este e-mail já possui cadastro. Entre com e-mail e senha.',
        'EMAIL_IN_USE',
      );
    }

    const name = (payload.name?.trim() || email.split('@')[0] || 'Cliente').slice(0, 80);
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(randomBytes(32).toString('hex')),
        role: 'CLIENT',
        googleSub: payload.sub,
      },
    });
    return openSession(created);
  },

  async authenticate(token: string) {
    const session = await sessionRepository.findValid(hashSessionToken(token));
    if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.active) {
      throw new AppError(401, 'Sessão inválida ou expirada.', 'UNAUTHENTICATED');
    }
    return publicUser(session.user);
  },

  async logout(token: string | undefined) {
    if (!token) return;
    await sessionRepository.deleteByHash(hashSessionToken(token));
  },
};
