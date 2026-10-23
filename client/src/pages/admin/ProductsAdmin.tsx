import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError, apiGet, apiSend, apiUpload } from '../../services/api';
import type { AdminCategory, AdminImage, AdminProduct, AdminProductSummary, ProductChange, ProductStatus } from '../../types/admin';
import type { DataResponse, ListResponse } from '../../types/catalog';
import { centsFromInput, formatBRL, reaisInput } from '../../utils/money';
import { Area, Check, Field, Notice, PageHeader, Panel, Select, TextInput } from './ui';

const statusLabel: Record<ProductStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  ARCHIVED: 'Arquivado',
};

export function ProductListPage() {
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | ProductStatus>('ALL');
  const products = useQuery({
    queryKey: ['admin', 'products', query, status],
    queryFn: () => apiGet<ListResponse<AdminProductSummary>>(`/api/admin/products?pageSize=50&status=${status}${query ? `&q=${encodeURIComponent(query)}` : ''}`),
  });

  const rows = products.data?.data ?? [];
  const total = products.data?.meta?.total;

  return (
    <div>
      <PageHeader
        title="Produtos"
        hint="Clique em um produto para alterar preço, estoque, categorias e fotos."
        action={<Link to="/admin/produtos/novo" className="btn-cart w-auto shrink-0 px-6">Novo produto</Link>}
      />
      <form
        className="mb-4 flex flex-col gap-2 rounded-[1.75rem] border border-blush-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(term.trim());
        }}
      >
        <TextInput value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Buscar por nome ou SKU" className="min-w-0 flex-1" />
        <Select value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | ProductStatus)} className="sm:w-40" aria-label="Situação">
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
          <option value="ARCHIVED">Arquivados</option>
        </Select>
        <button type="submit" className="btn-cart w-auto shrink-0 px-6 sm:w-32">Buscar</button>
      </form>
      {products.isError ? <Notice>Não foi possível carregar os produtos.</Notice> : null}
      <div className="overflow-hidden rounded-[1.75rem] border border-blush-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_7rem] gap-4 border-b border-blush-100 px-4 py-3 text-[11px] tracking-[0.14em] text-ink-500 uppercase sm:grid">
          <span>Produto</span>
          <span>Preço</span>
          <span>Estoque</span>
          <span>Situação</span>
        </div>
        {rows.map((product) => {
          const onSale = product.salePriceCents != null && product.salePriceCents < product.priceCents;
          return (
            <Link key={product.id} to={`/admin/produtos/${product.id}`} className="grid gap-3 border-t border-blush-100 px-4 py-3.5 transition first:border-t-0 hover:bg-blush-50 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_7rem] sm:items-center sm:gap-4">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-blush-200 bg-blush-50">
                  {product.coverImageUrl ? <img src={product.coverImageUrl} alt="" className="h-full w-full object-contain p-1" /> : <span className="text-[10px] text-ink-500">Sem foto</span>}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-900">{product.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">{product.sku}</span>
                  {product.featured || product.isNewArrival ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {product.featured ? <span className="rounded-full bg-blush-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-magenta-700 uppercase">Destaque</span> : null}
                      {product.isNewArrival ? <span className="rounded-full bg-gold-300/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold-700 uppercase">Lançamento</span> : null}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="text-sm">
                {onSale ? <span className="mr-2 text-xs text-ink-500 line-through">{formatBRL(product.priceCents)}</span> : null}
                <span className="font-semibold text-price">{formatBRL(onSale ? product.effectivePriceCents : product.priceCents)}</span>
              </span>
              <span className={`text-sm ${product.stockQuantity === 0 ? 'font-medium text-magenta-700' : 'text-ink-700'}`}>
                {product.stockQuantity === 0 ? 'Sem estoque' : `${product.stockQuantity} em estoque`}
              </span>
              <StatusPill status={product.status} />
            </Link>
          );
        })}
        {products.data && rows.length === 0 ? <p className="p-6 text-sm text-ink-500">Nenhum produto encontrado.</p> : null}
      </div>
      {total != null ? <p className="mt-3 text-sm text-ink-500">{total === 1 ? '1 produto' : `${total} produtos`}</p> : null}
    </div>
  );
}

function StatusPill({ status }: { status: ProductStatus }) {
  const tone = status === 'ACTIVE'
    ? 'bg-blush-100 text-magenta-700'
    : status === 'INACTIVE'
      ? 'bg-zinc-100 text-zinc-500'
      : 'bg-zinc-100 text-zinc-400';
  return <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${tone}`}>{statusLabel[status]}</span>;
}

type Draft = {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: string;
  sale: string;
  stock: string;
  status: ProductStatus;
  featured: boolean;
  isNewArrival: boolean;
  categoryIds: string[];
  primaryId: string;
};

function draftFrom(product?: AdminProduct): Draft {
  const primary = product?.categories.find((category) => category.isPrimary) ?? product?.categories[0];
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    shortDescription: product?.shortDescription ?? '',
    price: product ? reaisInput(product.priceCents) : '',
    sale: product?.salePriceCents != null ? reaisInput(product.salePriceCents) : '',
    stock: product ? String(product.stockQuantity) : '0',
    status: product?.status ?? 'ACTIVE',
    featured: product?.featured ?? false,
    isNewArrival: product?.isNewArrival ?? false,
    categoryIds: product?.categories.map((category) => category.id) ?? [],
    primaryId: primary?.id ?? '',
  };
}

export function ProductFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const photoError = location.state && typeof location.state === 'object' && 'photoError' in location.state
    ? String((location.state as { photoError?: string }).photoError ?? '')
    : '';
  const product = useQuery({
    queryKey: ['admin', 'product', id],
    enabled: Boolean(id),
    queryFn: () => apiGet<DataResponse<AdminProduct>>(`/api/admin/products/${id}`),
  });
  if (id && product.isLoading) return <p>Carregando produto...</p>;
  if (id && product.isError) return <Notice>Produto não encontrado.</Notice>;
  return <ProductForm key={id ?? 'novo'} product={product.data?.data} photoError={photoError} />;
}

async function uploadCover(productId: string, file: File, existing: AdminImage[]) {
  let images = existing;
  while (images.length >= 8) {
    const last = images[images.length - 1];
    await apiSend(`/api/admin/products/${productId}/images/${last.id}`, 'DELETE');
    images = images.slice(0, -1);
  }
  const uploaded = await apiUpload<DataResponse<AdminImage>>(`/api/admin/products/${productId}/images`, file);
  if (images.length > 0) {
    await apiSend(`/api/admin/products/${productId}/images/reorder`, 'PATCH', {
      imageIds: [uploaded.data.id, ...images.map((image) => image.id)],
    });
    for (const image of images) {
      await apiSend(`/api/admin/products/${productId}/images/${image.id}`, 'DELETE');
    }
  }
}

function ProductForm({ product, photoError = '' }: { product?: AdminProduct; photoError?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiGet<DataResponse<AdminCategory[]>>('/api/admin/categories'),
  });
  const changes = useQuery({
    queryKey: ['admin', 'changes', product?.id],
    enabled: Boolean(product),
    queryFn: () => apiGet<DataResponse<ProductChange[]>>(`/api/admin/products/${product?.id}/changes`),
  });
  const [draft, setDraft] = useState<Draft>(() => draftFrom(product));
  const [error, setError] = useState(photoError);
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingPhoto) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingPhoto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);
  const photo = useMutation({
    mutationFn: async (file: File) => {
      if (!product) return;
      await uploadCover(product.id, file, product.images);
    },
    onSuccess: async () => {
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'product', product?.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      await queryClient.invalidateQueries({ queryKey: ['home'] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : 'Não foi possível enviar a foto.'),
  });

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function save() {
    setError('');
    setSaved('');
    const priceCents = centsFromInput(draft.price);
    const salePriceCents = draft.sale.trim() ? centsFromInput(draft.sale) : null;
    const stockQuantity = Number(draft.stock);
    if (priceCents == null || salePriceCents === null && draft.sale.trim()) {
      setError('Informe os preços com vírgula, por exemplo 29,90.');
      return;
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError('O estoque precisa ser um número inteiro.');
      return;
    }
    if (!draft.primaryId) {
      setError('Escolha a categoria.');
      return;
    }
    setSaving(true);
    const body = {
      name: draft.name,
      slug: draft.slug || undefined,
      description: draft.description,
      shortDescription: draft.shortDescription || null,
      priceCents,
      salePriceCents,
      stockQuantity,
      status: draft.status,
      featured: draft.featured,
      isNewArrival: draft.isNewArrival,
      categories: draft.categoryIds.map((categoryId) => ({ categoryId, isPrimary: categoryId === draft.primaryId })),
    };
    try {
      const response = product
        ? await apiSend<DataResponse<AdminProduct>>(`/api/admin/products/${product.id}`, 'PATCH', body)
        : await apiSend<DataResponse<AdminProduct>>('/api/admin/products', 'POST', body);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      await queryClient.invalidateQueries({ queryKey: ['home'] });
      if (!product) {
        if (pendingPhoto) {
          try {
            await uploadCover(response.data.id, pendingPhoto, []);
          } catch (caught) {
            const message = caught instanceof ApiError ? caught.message : 'O produto foi salvo, mas a foto não foi enviada.';
            navigate(`/admin/produtos/${response.data.id}`, { state: { photoError: message } });
            return;
          }
        }
        navigate(`/admin/produtos/${response.data.id}`);
        return;
      }
      setSaved('Produto salvo.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'changes', product.id] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  const cover = previewUrl ?? product?.images[0]?.imageUrl ?? null;
  const photoLabel = photo.isPending || (saving && pendingPhoto) ? 'Enviando...' : cover ? 'Alterar foto' : 'Adicionar foto';

  return (
    <div className="space-y-4">
      <Link to="/admin/produtos" className="text-link text-sm">Voltar para a lista</Link>
      <section className="rounded-[1.75rem] border border-blush-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <label className="group relative mx-auto grid h-36 w-36 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[1.75rem] border border-blush-200 bg-blush-50 transition hover:border-magenta-400 sm:mx-0 sm:h-40 sm:w-40">
            {cover ? <img src={cover} alt="" className="h-full w-full object-contain p-3" /> : <span className="px-3 text-center text-xs text-ink-500">Sem foto</span>}
            <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/95 px-2 py-1 text-center text-[10px] font-semibold tracking-wide text-magenta-700 uppercase">
              {photoLabel}
            </span>
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,image/gif"
              aria-label={cover ? 'Alterar foto do produto' : 'Adicionar foto do produto'}
              disabled={photo.isPending || saving}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setError('');
                if (!product) {
                  setPendingPhoto(file);
                  return;
                }
                photo.mutate(file);
              }}
            />
          </label>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            {product?.sku ? <p className="text-xs tracking-[0.14em] text-ink-500 uppercase">{product.sku}</p> : null}
            <h1 className="mt-1 font-display text-4xl text-magenta-700">{draft.name.trim() || 'Novo produto'}</h1>
            {draft.shortDescription.trim() ? <p className="mt-2 text-sm text-ink-500">{draft.shortDescription}</p> : null}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <StatusPill status={draft.status} />
              {draft.featured ? <span className="rounded-full bg-blush-100 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-magenta-700 uppercase">Destaque</span> : null}
              {draft.isNewArrival ? <span className="rounded-full bg-gold-300/40 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-gold-700 uppercase">Lançamento</span> : null}
            </div>
          </div>
          <button type="button" className="btn-cart w-auto shrink-0 self-center px-6 sm:self-start" disabled={saving} onClick={() => void save()}>{saving ? 'Salvando...' : 'Salvar produto'}</button>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-blush-100 pt-5 sm:grid-cols-4">
          <ProfileFact label="Preço">
            <TextInput value={draft.price} onChange={(event) => patch({ price: event.target.value })} placeholder="29,90" aria-label="Preço" />
            <span className="mt-2 block text-[11px] tracking-[0.12em] text-ink-500 uppercase">Promocional</span>
            <TextInput className="mt-1" value={draft.sale} onChange={(event) => patch({ sale: event.target.value })} placeholder="Opcional" aria-label="Preço promocional" />
          </ProfileFact>
          <ProfileFact label="Estoque">
            <TextInput value={draft.stock} onChange={(event) => patch({ stock: event.target.value })} inputMode="numeric" aria-label="Estoque" />
          </ProfileFact>
          <ProfileFact label="Categoria">
            <Select
              value={draft.primaryId}
              aria-label="Categoria"
              onChange={(event) => {
                const primaryId = event.target.value;
                patch({ primaryId, categoryIds: primaryId ? [primaryId] : [] });
              }}
            >
              <option value="">Escolha</option>
              {categories.data?.data.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </ProfileFact>
          <ProfileFact label="Situação">
            <Select value={draft.status} aria-label="Situação" onChange={(event) => patch({ status: event.target.value as ProductStatus })}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="ARCHIVED">Arquivado</option>
            </Select>
          </ProfileFact>
        </dl>
      </section>
      {error ? <Notice>{error}</Notice> : null}
      {saved ? <p className="text-sm text-ink-700">{saved}</p> : null}
      <p className="pt-2 text-xs tracking-[0.14em] text-ink-500 uppercase">Informações complementares</p>
      <Panel title="Identificação">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome">
            <TextInput value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
          </Field>
          <Field label="Slug" hint="Deixe em branco para gerar a partir do nome.">
            <TextInput value={draft.slug} onChange={(event) => patch({ slug: event.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descrição curta">
              <TextInput value={draft.shortDescription} onChange={(event) => patch({ shortDescription: event.target.value })} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Descrição">
              <Area value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
            </Field>
          </div>
        </div>
      </Panel>
      <Panel title="Destaque e lançamento">
        <div className="flex flex-wrap gap-4">
          <Check label="Produto em destaque" checked={draft.featured} onChange={(featured) => patch({ featured })} />
          <Check label="Lançamento" checked={draft.isNewArrival} onChange={(isNewArrival) => patch({ isNewArrival })} />
        </div>
      </Panel>
      {product && changes.data ? (
        <Panel title="Histórico">
          {changes.data.data.length === 0 ? <p className="text-sm text-ink-500">Ainda não há alterações.</p> : null}
          <ul className="space-y-2 text-sm">
            {changes.data.data.map((change) => (
              <li key={change.id}>
                <span className="text-ink-500">{new Date(change.createdAt).toLocaleString('pt-BR')} · </span>
                {change.summary}
                {change.actorName ? <span className="text-ink-500"> ({change.actorName})</span> : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function ProfileFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-blush-50 px-3 py-3">
      <dt className="text-[11px] tracking-[0.12em] text-ink-500 uppercase">{label}</dt>
      <dd className="mt-2">{children}</dd>
    </div>
  );
}

