import { prisma } from '../config/prisma';

import { AppError } from '../lib/errors';

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  userId: true,
  user: { select: { name: true } },
} as const;

async function activeProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!product) throw new AppError(404, 'Produto não encontrado.', 'PRODUCT_NOT_FOUND');
  return product;
}

export const reviewService = {
  async list(slug: string, viewerId?: string) {
    const product = await activeProduct(slug);
    const where = { productId: product.id };
    const [reviews, aggregate, mine] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: reviewSelect,
      }),
      prisma.productReview.aggregate({ where, _avg: { rating: true }, _count: true }),
      viewerId
        ? prisma.productReview.findUnique({
            where: { productId_userId: { productId: product.id, userId: viewerId } },
            select: { id: true, rating: true, comment: true },
          })
        : Promise.resolve(null),
    ]);
    return {
      summary: {
        average: aggregate._count === 0 || aggregate._avg.rating == null ? null : Math.round(aggregate._avg.rating * 10) / 10,
        count: aggregate._count,
      },
      mine,
      reviews: reviews.map((review) => ({
        id: review.id,
        authorName: review.user.name,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        mine: review.userId === viewerId,
      })),
    };
  },

  async save(slug: string, user: { id: string; role: string }, input: { rating: number; comment: string }) {
    if (user.role !== 'CLIENT') {
      throw new AppError(403, 'Somente clientes podem avaliar um produto.', 'REVIEW_CLIENT_ONLY');
    }
    const product = await activeProduct(slug);
    const review = await prisma.productReview.upsert({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      create: { productId: product.id, userId: user.id, rating: input.rating, comment: input.comment },
      update: { rating: input.rating, comment: input.comment },
      select: { id: true, rating: true, comment: true },
    });
    return review;
  },

  async remove(slug: string, reviewId: string, user: { id: string; role: string }) {
    const product = await activeProduct(slug);
    const review = await prisma.productReview.findFirst({
      where: { id: reviewId, productId: product.id },
      select: { id: true, userId: true },
    });
    if (!review) throw new AppError(404, 'Avaliação não encontrada.', 'REVIEW_NOT_FOUND');
    if (review.userId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'Você só pode excluir a sua avaliação.', 'FORBIDDEN');
    }
    await prisma.productReview.delete({ where: { id: review.id } });
  },
};
