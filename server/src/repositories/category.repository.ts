import { prisma } from '../config/prisma';

export const categoryRepository = {
  list(placement: 'all' | 'menu' | 'home') {
    return prisma.category.findMany({
      where: {
        active: true,
        ...(placement === 'menu' ? { showInMenu: true } : {}),
        ...(placement === 'home' ? { showOnHome: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  findActiveBySlug(slug: string) {
    return prisma.category.findFirst({ where: { slug, active: true } });
  },

  findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  },
};
