import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicUser });
  },

  create(data: { name: string; email: string; passwordHash: string; role: Role }) {
    return prisma.user.create({ data, select: publicUser });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash }, select: publicUser });
  },

  countCustomers() {
    return prisma.user.count({ where: { role: 'CLIENT' } });
  },
};

export const sessionRepository = {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.session.create({ data });
  },

  findValid(tokenHash: string) {
    return prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  },

  deleteByHash(tokenHash: string) {
    return prisma.session.deleteMany({ where: { tokenHash } });
  },
};
