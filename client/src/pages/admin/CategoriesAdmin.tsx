import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiGet, apiSend } from '../../services/api';
import type { AdminCategory, AdminProductSummary, ProductStatus } from '../../types/admin';
import type { DataResponse, ListResponse } from '../../types/catalog';
import { formatBRL } from '../../utils/money';
import { Area, Field, Notice, PageHeader, TextInput } from './ui';

type Draft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  showInMenu: boolean;
  showOnHome: boolean;
  sortOrder: string;
  imageUrl: string | null;
  productCount: number;
};

const empty: Draft = {
  name: '',
  slug: '',
  description: '',
  active: true,
  showInMenu: true,
  showOnHome: false,
  sortOrder: '0',
  imageUrl: null,
  productCount: 0,
};

const statusLabel: Record<ProductStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  ARCHIVED: 'Arquivado',
};

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiGet<DataResponse<AdminCategory[]>>('/api/admin/categories'),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const rows = categories.data?.data ?? [];
  const selected = rows.find((category) => category.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && !creating && rows[0]) setSelectedId(rows[0].id);
  }, [creating, rows, selectedId]);

  const products = useQuery({
    queryKey: ['admin', 'products', 'category', selectedId],
    enabled: Boolean(selectedId) && !creating,
    queryFn: () => apiGet<ListResponse<AdminProductSummary>>(`/api/admin/products?pageSize=50&status=ALL&categoryId=${selectedId}`),
  });

  function choose(category: AdminCategory) {
    setCreating(false);
    setEditing(false);
    setError('');
    setSaved('');
    setSelectedId(category.id);
  }

  function openNew() {
    setCreating(true);
    setEditing(true);
    setError('');
    setSaved('');
    setDraft(empty);
  }

  function openEditor() {
    if (!selected) return;
    setError('');
    setSaved('');
    setDraft({
      id: selected.id,
      name: selected.name,
      slug: selected.slug,
      description: selected.description,
      active: selected.active,
      showInMenu: selected.showInMenu,
      showOnHome: selected.showOnHome,
      sortOrder: String(selected.sortOrder),
      imageUrl: selected.imageUrl,
      productCount: selected.productCount,
    });
    setEditing(true);
  }

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    await queryClient.invalidateQueries({ queryKey: ['home'] });
  }

  async function save() {
    setError('');
    setSaved('');
    const sortOrder = Number(draft.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setError('A ordem precisa ser um número inteiro.');
      return;
    }
    const body = {
      name: draft.name,
      slug: draft.slug || undefined,
      description: draft.description,
      active: draft.active,
      showInMenu: draft.showInMenu,
      showOnHome: draft.showOnHome,
      sortOrder,
    };
    try {
      if (draft.id) await apiSend(`/api/admin/categories/${draft.id}`, 'PATCH', body);
      else {
        const created = await apiSend<DataResponse<AdminCategory>>('/api/admin/categories', 'POST', body);
        setSelectedId(created.data.id);
        setCreating(false);
      }
      setSaved('Categoria salva.');
      setEditing(false);
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar.');
    }
  }

  async function remove() {
    if (!draft.id) return;
    setError('');
    try {
      await apiSend(`/api/admin/categories/${draft.id}`, 'DELETE');
      setEditing(false);
      setCreating(false);
      setSelectedId(null);
      setSaved('Categoria excluída.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível excluir.');
    }
  }

  const productRows = products.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Categorias"
        hint="Escolha uma categoria para ver os produtos dela."
        action={<button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={openNew}>Nova categoria</button>}
      />
      {categories.isError ? <Notice>Não foi possível carregar as categorias.</Notice> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {rows.map((category) => {
          const current = !creating && category.id === selectedId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => choose(category)}
              className={`rounded-full px-4 py-2 text-sm transition ${current ? 'bg-magenta-600 text-white' : 'border border-blush-200 bg-white text-ink-700 hover:border-magenta-400'}`}
            >
              {category.name}
              <span className={`ml-2 text-xs ${current ? 'text-white/80' : 'text-ink-500'}`}>{category.productCount}</span>
            </button>
          );
        })}
      </div>

      {creating || editing ? (
        <section className="mb-4 rounded-[1.75rem] border border-blush-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-3xl text-magenta-700">{draft.name.trim() || 'Nova categoria'}</h2>
            <div className="flex items-center gap-4">
              {draft.id ? <button type="button" className="text-sm text-magenta-700" onClick={() => void remove()}>Excluir</button> : null}
              <button type="button" className="text-sm text-ink-500" onClick={() => { setEditing(false); setCreating(false); setError(''); }}>Cancelar</button>
              <button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={() => void save()}>Salvar</button>
            </div>
          </div>
          <div className="mt-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <Field label="Nome">
                  <TextInput value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
                </Field>
                <Field label="Ordem">
                  <TextInput aria-label="Ordem" value={draft.sortOrder} inputMode="numeric" onChange={(event) => patch({ sortOrder: event.target.value })} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Descrição">
                  <Area value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Toggle pressed={draft.active} onClick={() => patch({ active: !draft.active })}>{draft.active ? 'Ativa' : 'Inativa'}</Toggle>
                <Toggle pressed={draft.showInMenu} onClick={() => patch({ showInMenu: !draft.showInMenu })}>No menu</Toggle>
                <Toggle pressed={draft.showOnHome} onClick={() => patch({ showOnHome: !draft.showOnHome })}>Na página inicial</Toggle>
              </div>
          </div>
          {error ? <div className="mt-3"><Notice>{error}</Notice></div> : null}
          {saved ? <p className="mt-3 text-sm text-ink-700">{saved}</p> : null}
        </section>
      ) : null}

      {selected && !creating ? (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl text-magenta-700">{selected.name}</h2>
              <p className="mt-1 text-sm text-ink-500">{productCountLabel(selected.productCount)}</p>
            </div>
            <button type="button" className="text-sm text-magenta-700" onClick={openEditor}>Editar categoria</button>
          </div>
          {products.isError ? <Notice>Não foi possível carregar os produtos.</Notice> : null}
          <div className="overflow-hidden rounded-[1.75rem] border border-blush-200 bg-white shadow-sm">
            {productRows.map((product) => {
              const onSale = product.salePriceCents != null && product.salePriceCents < product.priceCents;
              return (
                <Link key={product.id} to={`/admin/produtos/${product.id}`} className="grid gap-3 border-t border-blush-100 px-4 py-3.5 transition first:border-t-0 hover:bg-blush-50 sm:grid-cols-[minmax(0,1fr)_8rem_9rem] sm:items-center">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-blush-200 bg-blush-50">
                      {product.coverImageUrl ? <img src={product.coverImageUrl} alt="" className="h-full w-full object-contain p-1" /> : <span className="text-[10px] text-ink-500">Sem foto</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink-900">{product.name}</span>
                      <span className="mt-0.5 block text-xs text-ink-500">{product.sku}</span>
                    </span>
                  </span>
                  <span className="text-sm">
                    {onSale ? <span className="mr-2 text-xs text-ink-500 line-through">{formatBRL(product.priceCents)}</span> : null}
                    <span className="font-semibold text-price">{formatBRL(onSale ? product.effectivePriceCents : product.priceCents)}</span>
                  </span>
                  <span className={`text-sm ${product.stockQuantity === 0 ? 'font-medium text-magenta-700' : 'text-ink-700'}`}>
                    {product.stockQuantity === 0 ? 'Sem estoque' : `${product.stockQuantity} em estoque`}
                    <span className="mt-0.5 block text-xs text-ink-500">{statusLabel[product.status]}</span>
                  </span>
                </Link>
              );
            })}
            {products.data && productRows.length === 0 ? <p className="p-6 text-sm text-ink-500">Nenhum produto nesta categoria.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function productCountLabel(count: number) {
  return count === 1 ? '1 produto' : `${count} produtos`;
}

function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${pressed ? 'bg-magenta-600 text-white' : 'border border-blush-200 bg-white text-ink-500 hover:border-magenta-400'}`}
    >
      {children}
    </button>
  );
}
