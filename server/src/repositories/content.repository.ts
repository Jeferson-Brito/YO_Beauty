import { prisma } from '../config/prisma';

export const contentRepository = {
  settings() {
    return prisma.storeSettings.findUnique({ where: { id: 'default' } });
  },

  banners() {
    return prisma.storeBanner.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  },

  sections() {
    return prisma.homeSection.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  },

  findSection(id: string) {
    return prisma.homeSection.findUnique({ where: { id } });
  },

  page(slug: string) {
    return prisma.storePage.findFirst({ where: { slug, active: true } });
  },
};
