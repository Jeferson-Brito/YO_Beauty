import { Heart } from 'lucide-react';
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
    <article className="group flex h-full flex-col rounded-xl border border-blush-200 bg-white p-2 transition duration-200 hover:-translate-y-0.5 hover:border-magenta-400 hover:shadow-md">
      <div className="relative">
        <button
          type="button"
          aria-pressed={isFavorite(product.id)}
          aria-label={isFavorite(product.id) ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}
          onClick={() => toggleFavorite(product.id)}
          className="absolute top-1.5 right-1.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-magenta-600 shadow-sm transition hover:scale-110 hover:bg-white"
        >
          <Heart size={14} fill={isFavorite(product.id) ? 'currentColor' : 'none'} />
        </button>
        {onSale ? <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-magenta-500 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase">Oferta</span> : null}
        {!onSale && product.isNewArrival ? <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-gold-500 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase">Novo</span> : null}
        <Link to={`/produto/${product.slug}`} className="block overflow-hidden rounded-lg bg-white">
          <div className="aspect-square p-2">
            <BrandArt slug={category?.slug} label={product.name} imageUrl={product.coverImageUrl} alt={product.name} fit="contain" />
          </div>
        </Link>
      </div>
      <h3 className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-ink-700">
        <Link to={`/produto/${product.slug}`} className="transition group-hover:text-magenta-600">{product.name}</Link>
      </h3>
      <p className="mt-1 min-h-4 text-[10px] text-ink-500 line-through">{onSale ? formatBRL(product.priceCents) : ''}</p>
      <p className="mb-2 text-sm font-semibold text-price">{formatBRL(product.effectivePriceCents)}</p>
      <button
        type="button"
        className="mt-auto w-full rounded-full border border-magenta-500 px-2 py-1.5 text-[10px] font-semibold tracking-wide text-magenta-600 uppercase transition hover:bg-magenta-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        onClick={add}
        disabled={!product.inStock}
        aria-live="polite"
      >
        {notice || (product.inStock ? 'Adicionar' : 'Sem estoque')}
      </button>
    </article>
  );
}
