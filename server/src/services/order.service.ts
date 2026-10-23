import { randomBytes } from 'node:crypto';
import type { Prisma, Product } from '@prisma/client';
import { prisma } from '../config/prisma';
import { effectivePriceCents } from '../domain/pricing';
import { AppError } from '../lib/errors';
import { pageMeta, pageWindow } from '../schemas/catalog.schema';

type RequestedItem = { productId: string; quantity: number };

type AddressInput = {
  recipientName: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const orderInclude = {
  items: { orderBy: { productNameSnapshot: 'asc' as const } },
  payments: true,
} satisfies Prisma.OrderInclude;

function mergeItems(items: RequestedItem[]): RequestedItem[] {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function priceOf(product: Product): number {
  return effectivePriceCents(product.priceCents, product.salePriceCents);
}

function shippingFor(subtotalCents: number, thresholdCents: number) {
  const freeShipping = thresholdCents > 0 && subtotalCents >= thresholdCents;
  return {
    shippingCostCents: 0,
    freeShipping,
    shippingLabel: freeShipping
      ? 'Frete grátis'
      : 'Frete ainda não incluído. Ele será informado antes do envio.',
  };
}

async function thresholdCents(): Promise<number> {
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  return settings?.freeShippingThresholdCents ?? 0;
}

function lineOf(product: Product | null, requested: RequestedItem) {
  if (!product || product.status !== 'ACTIVE') {
    return {
      productId: requested.productId,
      slug: product?.slug ?? '',
      name: product?.name ?? 'Produto indisponível',
      imageUrl: null as string | null,
      quantity: requested.quantity,
      unitPriceCents: 0,
      lineTotalCents: 0,
      availableQuantity: 0,
      purchasable: false,
      message: 'Este produto não está disponível.',
    };
  }
  const unitPriceCents = priceOf(product);
  const purchasable = product.stockQuantity >= requested.quantity;
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: null as string | null,
    quantity: requested.quantity,
    unitPriceCents,
    lineTotalCents: purchasable ? unitPriceCents * requested.quantity : 0,
    availableQuantity: product.stockQuantity,
    purchasable,
    message: purchasable ? '' : `Só tem ${product.stockQuantity} disponível no estoque.`,
  };
}

function toOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    address: order.shippingAddressSnapshot,
    subtotalCents: order.subtotalCents,
    shippingCostCents: order.shippingCostCents,
    discountAmountCents: order.discountAmountCents,
    totalCents: order.totalCents,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.productNameSnapshot,
      sku: item.skuSnapshot,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
    payment: order.payments[0]
      ? {
          status: order.payments[0].status,
          provider: order.payments[0].provider,
          amountCents: order.payments[0].amountCents,
          paidAt: order.payments[0].paidAt?.toISOString() ?? null,
        }
      : null,
  };
}

async function coversOf(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, string | null>();
  const images = await prisma.productImage.findMany({
    where: { productId: { in: productIds } },
    orderBy: { sortOrder: 'asc' },
  });
  const covers = new Map<string, string | null>();
  for (const image of images) {
    if (!covers.has(image.productId)) covers.set(image.productId, image.imageUrl);
  }
  return covers;
}

function categorySlugOf(product: { categories: { isPrimary: boolean; category: { slug: string } }[] } | undefined) {
  if (!product) return '';
  const link = product.categories.find((item) => item.isPrimary) ?? product.categories[0];
  return link?.category.slug ?? '';
}

type StoredOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

async function visualsOf(productIds: Array<string | null>) {
  const ids = [...new Set(productIds.filter((id): id is string => Boolean(id)))];
  const visuals = new Map<string, { imageUrl: string | null; slug: string; categorySlug: string }>();
  if (ids.length === 0) return visuals;
  const [covers, products] = await Promise.all([
    coversOf(ids),
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        categories: { select: { isPrimary: true, category: { select: { slug: true } } } },
      },
    }),
  ]);
  for (const id of ids) {
    const product = products.find((item) => item.id === id);
    visuals.set(id, {
      imageUrl: covers.get(id) ?? null,
      slug: product?.slug ?? '',
      categorySlug: categorySlugOf(product),
    });
  }
  return visuals;
}

function attachVisuals(
  order: ReturnType<typeof toOrder>,
  visuals: Awaited<ReturnType<typeof visualsOf>>,
) {
  return {
    ...order,
    items: order.items.map((item) => {
      const visual = item.productId ? visuals.get(item.productId) : undefined;
      return {
        ...item,
        slug: visual?.slug ?? '',
        categorySlug: visual?.categorySlug ?? '',
        imageUrl: visual?.imageUrl ?? null,
      };
    }),
  };
}

async function present(order: StoredOrder) {
  const base = toOrder(order);
  return attachVisuals(base, await visualsOf(base.items.map((item) => item.productId)));
}

async function presentMany(orders: StoredOrder[]) {
  const visuals = await visualsOf(orders.flatMap((order) => order.items.map((item) => item.productId)));
  return orders.map((order) => attachVisuals(toOrder(order), visuals));
}

export const orderService = {
  async quote(items: RequestedItem[]) {
    const requested = mergeItems(items);
    const products = await prisma.product.findMany({
      where: { id: { in: requested.map((item) => item.productId) } },
      include: { categories: { include: { category: { select: { slug: true } } } } },
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    const lines = requested.map((item) => lineOf(byId.get(item.productId) ?? null, item));
    const covers = await coversOf(lines.map((line) => line.productId));
    const withCovers = lines.map((line) => ({
      ...line,
      imageUrl: covers.get(line.productId) ?? null,
      categorySlug: categorySlugOf(byId.get(line.productId)),
    }));
    const subtotalCents = withCovers.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const threshold = await thresholdCents();
    const shipping = shippingFor(subtotalCents, threshold);
    return {
      lines: withCovers,
      subtotalCents,
      ...shipping,
      freeShippingThresholdCents: threshold,
      totalCents: subtotalCents + shipping.shippingCostCents,
      ready: withCovers.every((line) => line.purchasable),
    };
  },

  async place(
    user: { id: string; name: string; email: string },
    input: { items: RequestedItem[]; phone: string; address: AddressInput; paymentMethod: string },
  ) {
    const requested = mergeItems(input.items);
    const preview = await this.quote(requested);
    if (!preview.ready) {
      throw new AppError(422, 'Revise o carrinho. Algum item não tem estoque suficiente.', 'STOCK_UNAVAILABLE');
    }

    const snapshot = {
      ...input.address,
      postalCode: input.address.postalCode.replace('-', ''),
      phone: input.phone,
    };

    const order = await prisma.$transaction(async (tx) => {
      const priced: { product: Product; quantity: number; unitPriceCents: number }[] = [];
      for (const item of requested) {
        const reserved = await tx.product.updateMany({
          where: { id: item.productId, status: 'ACTIVE', stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) {
          throw new AppError(422, 'O estoque mudou. Atualize o carrinho e tente de novo.', 'STOCK_CHANGED');
        }
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        priced.push({ product, quantity: item.quantity, unitPriceCents: priceOf(product) });
      }

      const subtotalCents = priced.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
      const settings = await tx.storeSettings.findUnique({ where: { id: 'default' } });
      const shipping = shippingFor(subtotalCents, settings?.freeShippingThresholdCents ?? 0);
      const totalCents = subtotalCents + shipping.shippingCostCents;
      const orderNumber = `YB-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          customerName: snapshot.recipientName,
          customerEmail: user.email,
          customerPhone: input.phone,
          shippingAddressSnapshot: snapshot,
          subtotalCents,
          shippingCostCents: shipping.shippingCostCents,
          discountAmountCents: 0,
          totalCents,
          paymentStatus: 'PENDING',
          orderStatus: 'AWAITING_PAYMENT',
          items: {
            create: priced.map((line) => ({
              productId: line.product.id,
              productNameSnapshot: line.product.name,
              skuSnapshot: line.product.sku,
              unitPriceCents: line.unitPriceCents,
              quantity: line.quantity,
              lineTotalCents: line.unitPriceCents * line.quantity,
            })),
          },
          payments: {
            create: {
              provider: input.paymentMethod,
              status: 'PENDING',
              amountCents: totalCents,
            },
          },
        },
        include: orderInclude,
      });

      await tx.address.create({
        data: {
          userId: user.id,
          recipientName: snapshot.recipientName,
          postalCode: snapshot.postalCode,
          street: snapshot.street,
          number: snapshot.number,
          complement: snapshot.complement,
          neighborhood: snapshot.neighborhood,
          city: snapshot.city,
          state: snapshot.state,
        },
      });

      return created;
    });

    return present(order);
  },

  async listMine(userId: string) {
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
      take: 30,
    });
    return presentMany(orders);
  },

  async getForUser(id: string, user: { id: string; role: string }) {
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order || (order.userId !== user.id && user.role !== 'ADMIN')) {
      throw new AppError(404, 'Pedido não encontrado.', 'ORDER_NOT_FOUND');
    }
    return present(order);
  },

  async listAdmin(query: { page: number; pageSize: number; q?: string }) {
    const window = pageWindow(query.page, query.pageSize);
    const where: Prisma.OrderWhereInput = query.q
      ? {
          OR: [
            { orderNumber: { contains: query.q } },
            { customerEmail: { contains: query.q } },
            { customerName: { contains: query.q } },
          ],
        }
      : {};
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: window.skip,
        take: window.take,
        include: orderInclude,
      }),
      prisma.order.count({ where }),
    ]);
    return { data: await presentMany(orders), meta: pageMeta(query.page, query.pageSize, total) };
  },

  async cancel(id: string) {
    const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new AppError(404, 'Pedido não encontrado.', 'ORDER_NOT_FOUND');
    if (existing.orderStatus === 'CANCELLED') {
      throw new AppError(409, 'Este pedido já está cancelado.', 'ORDER_CANCELLED');
    }
    if (existing.paymentStatus !== 'PENDING') {
      throw new AppError(409, 'Só um pedido ainda sem pagamento pode ser cancelado por aqui.', 'ORDER_NOT_PENDING');
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        if (!item.productId) continue;
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
      await tx.payment.updateMany({
        where: { orderId: id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      return tx.order.update({
        where: { id },
        data: { orderStatus: 'CANCELLED', paymentStatus: 'CANCELLED' },
        include: orderInclude,
      });
    });
    return present(updated);
  },
};
