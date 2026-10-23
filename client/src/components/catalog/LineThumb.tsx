import { Link } from 'react-router-dom';
import { BrandArt } from '../visuals/BrandArt';

type ThumbProps = {
  name: string;
  imageUrl?: string | null;
  categorySlug?: string;
  slug?: string;
};

export function LineThumb({ name, imageUrl, categorySlug, slug, size = 'sm' }: ThumbProps & { size?: 'sm' | 'lg' }) {
  const frame = (
    <span className={`block overflow-hidden rounded-2xl border border-blush-200 bg-white p-1.5 ${size === 'lg' ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-16 w-16 sm:h-20 sm:w-20'}`}>
      <BrandArt slug={categorySlug} label={name} imageUrl={imageUrl} alt={name} fit="contain" />
    </span>
  );
  if (!slug) return frame;
  return (
    <Link to={`/produto/${slug}`} className="shrink-0 rounded-2xl transition hover:opacity-80" aria-label={`Ver ${name}`}>
      {frame}
    </Link>
  );
}

export function stockLimitMessage(available: number) {
  return `Só tem ${available} disponível no estoque.`;
}

export function QuantityStepper({
  name,
  quantity,
  max,
  onChange,
  onLimit,
}: {
  name: string;
  quantity: number;
  max?: number | null;
  onChange: (quantity: number) => void;
  onLimit?: () => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-blush-200 bg-white">
      <button
        type="button"
        className="px-3 py-1.5 text-magenta-700 transition hover:bg-blush-100"
        aria-label={`Diminuir quantidade de ${name}`}
        onClick={() => onChange(Math.max(1, quantity - 1))}
      >
        −
      </button>
      <span className="min-w-6 px-1 text-center text-sm" aria-label={`Quantidade de ${name}`}>
        {quantity}
      </span>
      <button
        type="button"
        className="px-3 py-1.5 text-magenta-700 transition hover:bg-blush-100"
        aria-label={`Aumentar quantidade de ${name}`}
        onClick={() => {
          if (max != null && quantity >= max) {
            onLimit?.();
            return;
          }
          onChange(quantity + 1);
        }}
      >
        +
      </button>
    </div>
  );
}
