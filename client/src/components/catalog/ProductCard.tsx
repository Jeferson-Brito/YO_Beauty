import { Check, Heart, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandArt } from '../visuals/BrandArt';
import { useShop } from '../../context/ShopContext';
import type { ProductCard as ProductCardData } from '../../types/catalog';
import { formatBRL } from '../../utils/money';

export function ProductCard({ product }: { product: ProductCardData }) {
  const { addToCart, isFavorite, toggleFavorite } = useShop();
  const [notice, setNotice] = useState('');
  const onSale = product.salePriceCents != null && product.salePriceCents < product.priceCents;
  const category = product.categories.find((item) => item.isPrimary) ?? product.categories[0];

  function add() {
    if (!product.inStock) return;
    if (!addToCart(product)) return;
    setNotice('Adicionado');
    window.setTimeout(() => setNotice(''), 1600);
  }

  return (
    <article data-reveal className="product-card group flex h-full flex-col rounded-3xl border border-blush-200/70 bg-white p-3 sm:p-4">
      <div className="relative">
        <button
          type="button"
          aria-pressed={isFavorite(product.id)}
          aria-label={isFavorite(product.id) ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}
          onClick={() => toggleFavorite(product.id)}
          className="favorite-button absolute top-1 right-1 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-magenta-600 shadow-sm transition hover:scale-110 hover:bg-white"
        >
          <Heart size={17} fill={isFavorite(product.id) ? 'currentColor' : 'none'} />
        </button>
        {onSale ? <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-magenta-500 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase">Oferta</span> : null}
        {!onSale && product.isNewArrival ? <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-gold-500 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase">Novo</span> : null}
        <Link to={`/produto/${product.slug}`} className="product-photo block overflow-hidden rounded-2xl bg-blush-50/50">
          <div className="aspect-square p-2">
            <BrandArt slug={category?.slug} label={product.name} imageUrl={product.coverImageUrl} alt={product.name} fit="contain" />
          </div>
        </Link>
      </div>
      <p className="mt-4 truncate text-[9px] font-semibold tracking-[0.14em] text-ink-500 uppercase">{category?.name || 'Yo Beauty'}</p>
      <h3 className="type-card mt-1.5 line-clamp-2 min-h-10 !text-[12px] !leading-5 sm:!text-[13px]">
        <Link to={`/produto/${product.slug}`} className="transition group-hover:text-magenta-600">{product.name}</Link>
      </h3>
      <p className="mt-1 min-h-4 text-[10px] text-ink-500 line-through">{onSale ? formatBRL(product.priceCents) : ''}</p>
      <p className="mb-4 text-lg font-semibold tracking-tight text-price">{formatBRL(product.effectivePriceCents)}</p>
      <button
        type="button"
        className="product-add mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-magenta-600 px-2 py-2 text-[10px] font-semibold tracking-wide text-magenta-700 uppercase disabled:cursor-not-allowed disabled:opacity-45"
        onClick={add}
        disabled={!product.inStock}
        aria-live="polite"
      >
        {product.inStock ? notice ? <Check size={14} aria-hidden /> : <Plus size={14} aria-hidden /> : null}
        {notice || (product.inStock ? 'Adicionar' : 'Sem estoque')}
      </button>
    </article>
  );
}
