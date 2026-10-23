import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { stockLimitMessage } from '../components/catalog/LineThumb';
import { ProductCard } from '../components/catalog/ProductCard';
import { ProductListing, readProductSort, type ProductSort } from '../components/catalog/ProductListing';
import { ProductReviewSummary, ProductReviews } from '../components/catalog/ProductReviews';
import { BrandArt } from '../components/visuals/BrandArt';
import { useHome, useShop } from '../context/ShopContext';
import { track } from '../services/analytics';
import { apiGet } from '../services/api';
import type { CategoryDetail, ListResponse, ProductCard as Product, ProductDetail } from '../types/catalog';
import { formatBRL } from '../utils/money';

function writeSort(params: URLSearchParams, sort: ProductSort) {
  if (sort === 'name') params.delete('sort');
  else params.set('sort', sort);
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const term = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = readProductSort(params.get('sort'));
  const products = useQuery({
    queryKey: ['products', term, category, sort],
    queryFn: () => {
      const search = new URLSearchParams({ pageSize: '48', sort });
      if (term) search.set('q', term);
      if (category) search.set('category', category);
      return apiGet<ListResponse<Product>>(`/api/products?${search}`);
    },
  });
  useEffect(() => {
    const query = term.trim();
    if (query) track('search', { path: '/produtos', properties: { query: query.slice(0, 80) } });
  }, [term]);

  function update(next: { category?: string; sort?: ProductSort }) {
    const updated = new URLSearchParams(params);
    if (next.category !== undefined) {
      if (next.category) updated.set('category', next.category);
      else updated.delete('category');
    }
    if (next.sort) writeSort(updated, next.sort);
    setParams(updated, { replace: true });
  }

  return (
    <ProductListing
      title={term ? `Busca por “${term}”` : 'Produtos'}
      total={products.data ? products.data.meta?.total ?? products.data.data.length : null}
      sort={sort}
      onSort={(next) => update({ sort: next })}
      activeCategory={category}
      onCategory={(slug) => update({ category: slug })}
      products={products.data?.data}
      empty="Nenhum produto encontrado."
    />
  );
}

export function ShelfPage({ title, description, collection }: { title: string; description: string; collection: 'new' | 'sale' }) {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const sort = readProductSort(params.get('sort') ?? 'recent');
  const products = useQuery({
    queryKey: ['products', collection, category, sort],
    queryFn: () => {
      const search = new URLSearchParams({ pageSize: '48', sort, collection });
      if (category) search.set('category', category);
      return apiGet<ListResponse<Product>>(`/api/products?${search}`);
    },
  });
  const empty = collection === 'new' ? 'Nenhum lançamento no momento.' : 'Nenhuma oferta no momento.';

  function update(next: { category?: string; sort?: ProductSort }) {
    const updated = new URLSearchParams(params);
    if (next.category !== undefined) {
      if (next.category) updated.set('category', next.category);
      else updated.delete('category');
    }
    if (next.sort) updated.set('sort', next.sort);
    setParams(updated, { replace: true });
  }

  return (
    <ProductListing
      title={title}
      description={description}
      total={products.data ? products.data.meta?.total ?? products.data.data.length : null}
      sort={sort}
      onSort={(next) => update({ sort: next })}
      activeCategory={category}
      onCategory={(slug) => update({ category: slug })}
      products={products.data?.data}
      empty={empty}
    />
  );
}

export function CategoryPage() {
  const slug = usePathSlug();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sort = readProductSort(params.get('sort'));
  const category = useQuery({
    queryKey: ['category', slug, sort],
    queryFn: () => apiGet<{ data: CategoryDetail }>(`/api/categories/${slug}?pageSize=48&sort=${sort}`),
    enabled: Boolean(slug),
  });
  const payload = category.data?.data;
  useEffect(() => {
    if (!payload?.category.id || !slug) return;
    track('category_view', { path: `/categoria/${slug}`, categoryId: payload.category.id });
  }, [payload?.category.id, slug]);

  if (category.isError) {
    return (
      <main className="store-wrap py-10">
        <h1 className="script-title text-4xl sm:text-6xl">Categoria</h1>
        <p className="mt-8">Categoria não encontrada.</p>
      </main>
    );
  }

  return (
    <ProductListing
      title={payload?.category.name ?? 'Categoria'}
      description={payload?.category.description}
      total={payload ? payload.products.meta?.total ?? payload.products.data.length : null}
      sort={sort}
      onSort={(next) => {
        const updated = new URLSearchParams(params);
        writeSort(updated, next);
        setParams(updated, { replace: true });
      }}
      activeCategory={slug ?? ''}
      onCategory={(next) => {
        const search = sort === 'name' ? '' : `?sort=${sort}`;
        navigate(next ? `/categoria/${next}${search}` : `/produtos${search}`);
      }}
      products={payload?.products.data}
      empty="Esta categoria ainda não tem produtos ativos."
    />
  );
}

export function ProductPage() {
  const slug = usePathSlug();
  const home = useHome();
  const { cart, addToCart, isFavorite, toggleFavorite } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const product = useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiGet<{ data: ProductDetail }>(`/api/products/${slug}`),
    enabled: Boolean(slug),
  });
  const item = product.data?.data;
  const category = item?.categories.find((entry) => entry.isPrimary) ?? item?.categories[0];
  const related = useQuery({
    queryKey: ['products', 'related', category?.slug],
    enabled: Boolean(category?.slug),
    queryFn: () => apiGet<ListResponse<Product>>(`/api/products?category=${category?.slug}&pageSize=8&sort=name`),
  });
  useEffect(() => {
    if (!item) return;
    track('product_view', { path: `/produto/${item.slug}`, productId: item.id });
  }, [item]);
  useEffect(() => {
    setQuantity(1);
    setNotice('');
    setPhotoIndex(0);
  }, [slug]);

  if (product.isError) {
    return <main className="store-wrap py-16">Produto não encontrado.</main>;
  }
  if (!item) return <main className="store-wrap py-16">Carregando produto...</main>;

  const onSale = item.salePriceCents != null && item.salePriceCents < item.priceCents;
  const photos = item.images.length
    ? item.images
    : item.coverImageUrl
      ? [{ id: 'cover', imageUrl: item.coverImageUrl, altText: item.name, sortOrder: 0 }]
      : [];
  const activePhoto = photos[photoIndex] ?? photos[0];
  const suggestions = (related.data?.data ?? []).filter((entry) => entry.id !== item.id).slice(0, 4);
  const benefits = (home.data?.data.store.benefits ?? [])
    .slice(0, 3)
    .filter((benefit) => benefit.title !== 'Produtos originais' && benefit.title !== 'Compra segura');
  const stockLabel = item.availability === 'low_stock' ? 'Últimas unidades' : item.inStock ? 'Disponível' : 'Sem estoque no momento';
  const favorite = isFavorite(item.id);
  const inCart = cart.find((line) => line.id === item.id)?.quantity ?? 0;
  const room = Math.max(0, item.availableQuantity - inCart);

  function increase() {
    if (!item) return;
    if (room === 0 || quantity >= room) {
      setNotice(stockLimitMessage(item.availableQuantity));
      return;
    }
    setNotice('');
    setQuantity((value) => value + 1);
  }

  function add() {
    if (!item?.inStock) return;
    if (inCart + quantity > item.availableQuantity) {
      setNotice(stockLimitMessage(item.availableQuantity));
      return;
    }
    if (!addToCart(item, quantity)) return;
    setQuantity(1);
    setNotice('Adicionado ao carrinho');
    window.setTimeout(() => setNotice(''), 1600);
  }

  return (
    <main className="store-wrap py-8 sm:py-10">
      <nav className="flex flex-wrap items-center gap-2 text-xs tracking-[0.08em] text-ink-500 uppercase" aria-label="Caminho">
        <Link to="/" className="hover:text-magenta-600">Início</Link>
        <span aria-hidden="true">/</span>
        {category ? (
          <>
            <Link to={`/categoria/${category.slug}`} className="hover:text-magenta-600">{category.name}</Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span className="text-ink-700">{item.name}</span>
      </nav>

      <section className="mt-6 grid items-start gap-8 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-[28px] border border-blush-200 bg-blush-50">
            <div className="aspect-square">
              {activePhoto ? (
                <img src={activePhoto.imageUrl} alt={activePhoto.altText || item.name} className="h-full w-full object-contain" />
              ) : (
                <BrandArt slug={category?.slug} label={item.name} alt={item.name} />
              )}
            </div>
          </div>
          {photos.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  aria-label={`Ver foto ${index + 1} de ${item.name}`}
                  aria-pressed={index === photoIndex}
                  onClick={() => setPhotoIndex(index)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-blush-50 transition hover:border-magenta-400 ${index === photoIndex ? 'border-magenta-600' : 'border-blush-200'}`}
                >
                  <img src={photo.imageUrl} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lg:pt-2">
          {category ? (
            <Link to={`/categoria/${category.slug}`} className="text-link text-xs font-semibold tracking-[0.16em] uppercase">
              {category.name}
            </Link>
          ) : null}
          <h1 className="mt-2 font-display text-3xl break-words text-ink-900 sm:text-5xl">{item.name}</h1>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 text-price">
            {onSale ? <span className="text-base text-ink-500 line-through">{formatBRL(item.priceCents)}</span> : null}
            <span className="text-3xl font-semibold">{formatBRL(item.effectivePriceCents)}</span>
          </p>
          <ProductReviewSummary slug={item.slug} />
          {item.shortDescription ? <p className="mt-4 max-w-xl text-base text-ink-900">{item.shortDescription}</p> : null}
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-700">{item.description}</p>
          <p className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.08em] uppercase ${item.inStock ? 'bg-blush-100 text-magenta-700' : 'bg-blush-50 text-ink-500'}`}>
            {stockLabel}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center rounded-full border border-blush-200">
              <button type="button" className="grid h-11 w-11 place-items-center text-lg text-ink-700 transition hover:bg-blush-100" aria-label="Diminuir quantidade" onClick={() => { setNotice(''); setQuantity((value) => Math.max(1, value - 1)); }}>−</button>
              <span className="min-w-8 px-1 text-center text-sm font-semibold" aria-live="polite">{quantity}</span>
              <button type="button" className="grid h-11 w-11 place-items-center text-lg text-ink-700 transition hover:bg-blush-100" aria-label="Aumentar quantidade" onClick={increase}>+</button>
            </div>
            <button
              type="button"
              aria-pressed={favorite}
              aria-label={favorite ? `Remover ${item.name} dos favoritos` : `Favoritar ${item.name}`}
              onClick={() => toggleFavorite(item.id)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blush-200 text-magenta-600 transition hover:border-magenta-400 hover:bg-blush-50"
            >
              <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
            </button>
            <button type="button" className="btn-cart h-11 w-full sm:w-auto sm:max-w-xs sm:flex-1" disabled={!item.inStock} onClick={add}>
              {item.inStock ? 'Adicionar ao carrinho' : 'Sem estoque'}
            </button>
          </div>
          <p className="mt-3 min-h-5 text-sm text-magenta-700" aria-live="polite">{notice}</p>

          {benefits.length > 0 ? (
            <ul className="mt-2 space-y-2 border-t border-blush-200 pt-5">
              {benefits.map((benefit) => (
                <li key={benefit.title} className="text-sm text-ink-700">
                  <strong className="font-semibold text-magenta-700">{benefit.title}</strong>
                  {benefit.description ? <span className="text-ink-500"> · {benefit.description}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <ProductReviews slug={item.slug} />

      {suggestions.length > 0 ? (
        <section className="mt-14">
          <h2 className="script-title text-4xl sm:text-5xl">Você também pode gostar</h2>
          <div className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {suggestions.map((entry) => (
              <ProductCard key={entry.id} product={entry} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function usePathSlug() {
  const { slug } = useParams();
  return slug ?? '';
}
