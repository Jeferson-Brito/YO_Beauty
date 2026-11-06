import { useHome } from '../../context/ShopContext';
import type { ProductCard as Product } from '../../types/catalog';
import { ProductCard } from './ProductCard';
import { Pagination } from './Pagination';

export const productSorts = [
  { id: 'name', label: 'Nome' },
  { id: 'price_asc', label: 'Menor preço' },
  { id: 'price_desc', label: 'Maior preço' },
  { id: 'recent', label: 'Mais recentes' },
] as const;

export type ProductSort = (typeof productSorts)[number]['id'];

export function readProductSort(value: string | null): ProductSort {
  return productSorts.some((item) => item.id === value) ? (value as ProductSort) : 'name';
}

export function ProductListing({
  title,
  description,
  total,
  sort,
  onSort,
  activeCategory,
  onCategory,
  products,
  empty,
  page = 1,
  pageCount = 1,
  onPage,
  error,
}: {
  title: string;
  description?: string;
  total: number | null;
  sort: ProductSort;
  onSort: (sort: ProductSort) => void;
  activeCategory: string;
  onCategory: (slug: string) => void;
  products: Product[] | undefined;
  empty: string;
  page?: number;
  pageCount?: number;
  onPage?: (page: number) => void;
  error?: boolean;
}) {
  const home = useHome();
  const categories = (home.data?.data.homeCategories ?? []).filter((item) => item.slug !== 'lancamentos' && item.slug !== 'promocoes');
  const countLabel = total == null ? 'Carregando...' : `${total} ${total === 1 ? 'item' : 'itens'}`;

  return (
    <main className="store-wrap py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-title break-words">{title}</h1>
          {description ? <p className="type-body mt-3 max-w-2xl">{description}</p> : null}
          <p className="mt-2 text-sm text-ink-500">{countLabel}</p>
        </div>
        <label className="text-xs font-medium tracking-wide text-ink-500 uppercase">
          Ordenar
          <select
            value={sort}
            onChange={(event) => onSort(event.target.value as ProductSort)}
            className="mt-1 block rounded-full border border-blush-200 bg-white px-3 py-2 text-xs font-medium tracking-normal text-ink-700 normal-case outline-none transition hover:border-magenta-400"
          >
            {productSorts.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={chipClass(activeCategory === '')} onClick={() => onCategory('')}>
          Todas
        </button>
        {categories.map((item) => (
          <button key={item.slug} type="button" className={chipClass(activeCategory === item.slug)} onClick={() => onCategory(item.slug)}>
            {item.name}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-6 text-sm text-magenta-700">Não foi possível carregar os produtos. Tente atualizar a página.</p> : null}
      <div className="product-grid mt-6 grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products && products.length === 0 ? <p className="mt-8 text-ink-500">{empty}</p> : null}
      {onPage ? <Pagination page={page} pageCount={pageCount} onPage={onPage} /> : null}
    </main>
  );
}

function chipClass(active: boolean) {
  return `shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition ${active ? 'border-magenta-500 bg-magenta-500 text-white' : 'border-blush-200 bg-white text-ink-700 hover:border-magenta-400 hover:text-magenta-600'}`;
}
