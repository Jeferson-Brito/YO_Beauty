import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LineThumb, QuantityStepper, stockLimitMessage } from '../components/catalog/LineThumb';
import { ProductCard } from '../components/catalog/ProductCard';
import { ProductListing, readProductSort, type ProductSort } from '../components/catalog/ProductListing';
import { useHome, useShop } from '../context/ShopContext';
import { apiGet, apiSend } from '../services/api';
import type { DataResponse, ListResponse, ProductCard as Product } from '../types/catalog';
import { formatBRL } from '../utils/money';

type QuoteLine = {
  productId: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  categorySlug?: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  availableQuantity: number | null;
  purchasable: boolean;
  message: string;
};

type Quote = {
  lines: QuoteLine[];
  subtotalCents: number;
  shippingCostCents: number;
  shippingLabel: string;
  freeShipping: boolean;
  totalCents: number;
  ready: boolean;
};

export function useCartQuote() {
  const { cart } = useShop();
  return useQuery({
    queryKey: ['quote', cart.map((line) => `${line.id}:${line.quantity}`).join('|')],
    enabled: cart.length > 0,
    queryFn: () =>
      apiSend<DataResponse<Quote>>('/api/checkout/quote', 'POST', {
        items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })),
      }),
  });
}

function itemCountLabel(count: number) {
  return count === 1 ? '1 item' : `${count} itens`;
}

export function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useShop();
  const home = useHome();
  const [limitNotice, setLimitNotice] = useState<{ id: string; text: string } | null>(null);
  const quote = useCartQuote();
  const quoted = quote.data?.data;
  const photos = new Map(cart.map((line) => [line.id, line.imageUrl]));
  const lines: QuoteLine[] = quoted?.lines ?? cart.map((line) => ({
    productId: line.id,
    name: line.name,
    slug: line.slug,
    imageUrl: line.imageUrl,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    lineTotalCents: line.unitPriceCents * line.quantity,
    availableQuantity: null,
    purchasable: true,
    message: '',
  }));
  const total = quoted?.totalCents ?? cart.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const subtotal = quoted?.subtotalCents ?? total;
  const pieces = cart.reduce((sum, line) => sum + line.quantity, 0);
  const threshold = home.data?.data.store.freeShippingThresholdCents ?? 0;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = threshold > 0 ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 0;
  const suggestions = cart.length > 0 ? [] : uniqueSuggestions(home.data?.data.sections ?? []);

  return (
    <main className="store-wrap py-8 sm:py-10">
      <h1 className="script-title text-4xl sm:text-6xl">Meu carrinho</h1>
      {cart.length === 0 ? (
        <>
          <section className="mt-8 rounded-[2rem] border border-blush-200 bg-blush-50 px-6 py-12 text-center sm:px-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-magenta-600 shadow-sm">
              <ShoppingBag size={28} aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-2xl text-ink-900 sm:text-3xl">Seu carrinho está vazio</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">
              Escolha makes, cosméticos e acessórios. A foto, a quantidade e o total aparecem aqui assim que você adicionar um produto.
            </p>
            <Link to="/produtos" className="btn-cart mx-auto mt-6 max-w-xs">Ver produtos</Link>
          </section>
          {suggestions.length > 0 ? (
            <section className="mt-10">
              <h2 className="font-display text-2xl text-magenta-700 sm:text-3xl">Você pode gostar</h2>
              <div className="mt-4 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {suggestions.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-500">{itemCountLabel(pieces)}</p>
              <Link to="/produtos" className="text-link text-sm">Continuar comprando</Link>
            </div>
            <ul className="rounded-[1.75rem] border border-blush-200 bg-white px-4 sm:px-6">
              {lines.map((line) => (
                <li key={line.productId} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-blush-100 py-5 last:border-b-0 sm:gap-5">
                  <LineThumb
                    size="lg"
                    name={line.name}
                    slug={line.slug}
                    categorySlug={line.categorySlug}
                    imageUrl={line.imageUrl || photos.get(line.productId)}
                  />
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/produto/${line.slug}`} className="font-medium break-words text-ink-900 transition hover:text-magenta-600">{line.name}</Link>
                        <p className="mt-1 text-sm text-ink-500">{formatBRL(line.unitPriceCents)} cada</p>
                      </div>
                      <p className="shrink-0 text-base font-semibold text-price">{formatBRL(line.lineTotalCents)}</p>
                    </div>
                    {limitNotice?.id === line.productId ? <p className="mt-2 text-xs text-magenta-700" aria-live="polite">{limitNotice.text}</p> : line.message ? <p className="mt-2 text-xs text-magenta-700">{line.message}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <QuantityStepper
                        name={line.name}
                        quantity={line.quantity}
                        max={line.availableQuantity}
                        onLimit={() => setLimitNotice({ id: line.productId, text: stockLimitMessage(line.availableQuantity ?? 0) })}
                        onChange={(quantity) => {
                          if (limitNotice?.id === line.productId) setLimitNotice(null);
                          updateQuantity(line.productId, quantity);
                        }}
                      />
                      <button type="button" className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-magenta-700" onClick={() => removeFromCart(line.productId)}>
                        <Trash2 size={14} aria-hidden />
                        Remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <aside className="rounded-[1.75rem] border border-blush-200 bg-white p-5 lg:sticky lg:top-[var(--store-header-offset,196px)]">
            <h2 className="font-display text-3xl text-magenta-700">Resumo</h2>
            <p className="mt-1 text-sm text-ink-500">{itemCountLabel(pieces)}</p>
            {threshold > 0 ? (
              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-blush-100" aria-hidden>
                  <div className="h-full rounded-full bg-magenta-500" style={{ width: `${quoted?.freeShipping ? 100 : progress}%` }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-700">
                  {quoted?.freeShipping ? 'Você alcançou o frete grátis.' : `Faltam ${formatBRL(remaining)} para frete grátis.`}
                </p>
              </div>
            ) : null}
            <div className="mt-5 space-y-2 text-sm">
              <p className="flex justify-between gap-3"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></p>
              <p className="text-xs leading-5 text-ink-500">{quoted?.shippingLabel ?? 'Conferindo valores...'}</p>
            </div>
            <p className="mt-4 flex items-end justify-between gap-3 border-t border-blush-100 pt-4">
              <span className="text-sm text-ink-700">Total</span>
              <span className="text-xl font-semibold text-price">{formatBRL(total)}</span>
            </p>
            {quoted && !quoted.ready ? <p className="mt-3 text-sm text-magenta-700">Ajuste as quantidades para continuar.</p> : null}
            <Link
              to="/checkout"
              className={`btn-cart mt-4 ${quoted && !quoted.ready ? 'pointer-events-none opacity-40' : ''}`}
              aria-disabled={quoted ? !quoted.ready : undefined}
            >
              Finalizar compra
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}

function uniqueSuggestions(sections: { products: Product[] }[]) {
  const seen = new Set<string>();
  const items: Product[] = [];
  for (const section of sections) {
    for (const product of section.products) {
      if (seen.has(product.id) || !product.inStock) continue;
      seen.add(product.id);
      items.push(product);
      if (items.length === 6) return items;
    }
  }
  return items;
}

export function FavoritesPage() {
  const { favorites } = useShop();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const sort = readProductSort(params.get('sort'));
  const products = useQuery({
    queryKey: ['products', 'all-for-favorites'],
    queryFn: () => apiGet<ListResponse<Product>>('/api/products?pageSize=48&sort=name'),
    enabled: favorites.length > 0,
  });
  const saved = (products.data?.data.filter((product) => favorites.includes(product.id)) ?? []).filter((product) => !category || product.categories.some((item) => item.slug === category));
  const ordered = [...saved].sort((left, right) => {
    if (sort === 'price_asc') return left.effectivePriceCents - right.effectivePriceCents;
    if (sort === 'price_desc') return right.effectivePriceCents - left.effectivePriceCents;
    if (sort === 'recent') return favorites.indexOf(right.id) - favorites.indexOf(left.id);
    return left.name.localeCompare(right.name, 'pt');
  });

  function update(next: { category?: string; sort?: ProductSort }) {
    const updated = new URLSearchParams(params);
    if (next.category !== undefined) {
      if (next.category) updated.set('category', next.category);
      else updated.delete('category');
    }
    if (next.sort) {
      if (next.sort === 'name') updated.delete('sort');
      else updated.set('sort', next.sort);
    }
    setParams(updated, { replace: true });
  }

  if (favorites.length === 0) {
    return (
      <main className="store-wrap py-10">
        <h1 className="script-title text-4xl sm:text-6xl">Favoritos</h1>
        <p className="mt-6 text-ink-500">Você ainda não marcou produtos como favoritos.</p>
      </main>
    );
  }

  return (
    <ProductListing
      title="Favoritos"
      total={products.data ? ordered.length : null}
      sort={sort}
      onSort={(next) => update({ sort: next })}
      activeCategory={category}
      onCategory={(slug) => update({ category: slug })}
      products={products.data ? ordered : undefined}
      empty="Nenhum favorito nessa categoria."
    />
  );
}
