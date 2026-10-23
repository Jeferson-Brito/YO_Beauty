import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError, apiGet, apiSend, apiUpload } from '../../services/api';
import type { AdminCategory, AdminProductSummary, AdminSection } from '../../types/admin';
import type { DataResponse, ListResponse } from '../../types/catalog';
import { Check, Field, Notice, PageHeader, Select, TextInput, Area } from './ui';

const types = [
  ['manual', 'Seleção manual'],
  ['featured', 'Marcados como destaque'],
  ['new_arrivals', 'Lançamentos'],
  ['promotions', 'Promoções'],
  ['best_sellers', 'Mais vendidos'],
  ['category', 'Uma categoria'],
] as const;

const placements = [
  ['home-grid', 'Grade principal'],
  ['home-block', 'Abaixo dos banners'],
  ['home-extra', 'Só no painel'],
] as const;

type Draft = {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  type: string;
  placement: string;
  active: boolean;
  sortOrder: string;
  productsLimit: string;
  categoryId: string;
  buttonText: string;
  buttonUrl: string;
  productIds: string[];
  bannerImageUrl: string | null;
};

const empty: Draft = {
  title: '',
  subtitle: '',
  description: '',
  type: 'manual',
  placement: 'home-block',
  active: true,
  sortOrder: '10',
  productsLimit: '8',
  categoryId: '',
  buttonText: '',
  buttonUrl: '',
  productIds: [],
  bannerImageUrl: null,
};

export function SectionsPage() {
  const queryClient = useQueryClient();
  const sections = useQuery({
    queryKey: ['admin', 'sections'],
    queryFn: () => apiGet<DataResponse<AdminSection[]>>('/api/admin/sections'),
  });
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiGet<DataResponse<AdminCategory[]>>('/api/admin/categories'),
  });
  const products = useQuery({
    queryKey: ['admin', 'products', 'picker'],
    queryFn: () => apiGet<ListResponse<AdminProductSummary>>('/api/admin/products?pageSize=50&status=ALL'),
  });
  const [draft, setDraft] = useState<Draft>(empty);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (creating || draft.id || !sections.data?.data[0]) return;
    const section = sections.data.data[0];
    setDraft({
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      description: section.description,
      type: section.type,
      placement: section.placement,
      active: section.active,
      sortOrder: String(section.sortOrder),
      productsLimit: String(section.productsLimit),
      categoryId: section.categoryId ?? '',
      buttonText: section.buttonText ?? '',
      buttonUrl: section.buttonUrl ?? '',
      productIds: section.productIds,
      bannerImageUrl: section.bannerImageUrl,
    });
  }, [creating, draft.id, sections.data]);

  function edit(section: AdminSection) {
    setDraft({
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      description: section.description,
      type: section.type,
      placement: section.placement,
      active: section.active,
      sortOrder: String(section.sortOrder),
      productsLimit: String(section.productsLimit),
      categoryId: section.categoryId ?? '',
      buttonText: section.buttonText ?? '',
      buttonUrl: section.buttonUrl ?? '',
      productIds: section.productIds,
      bannerImageUrl: section.bannerImageUrl,
    });
    setError('');
    setSaved('');
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] });
    await queryClient.invalidateQueries({ queryKey: ['home'] });
  }

  async function save() {
    setError('');
    setSaved('');
    const body = {
      title: draft.title,
      subtitle: draft.subtitle,
      description: draft.description,
      type: draft.type,
      placement: draft.placement,
      active: draft.active,
      sortOrder: Number(draft.sortOrder) || 0,
      productsLimit: Number(draft.productsLimit) || 8,
      categoryId: draft.categoryId || null,
      buttonText: draft.buttonText || null,
      buttonUrl: draft.buttonUrl || null,
      productIds: draft.productIds,
    };
    try {
      if (draft.id) await apiSend(`/api/admin/sections/${draft.id}`, 'PATCH', body);
      else {
        const created = await apiSend<DataResponse<{ id: string }>>('/api/admin/sections', 'POST', body);
        setCreating(false);
        setDraft((current) => ({ ...current, id: created.data.id }));
      }
      setSaved('Seção salva.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar.');
    }
  }

  async function remove() {
    if (!draft.id) return;
    try {
      await apiSend(`/api/admin/sections/${draft.id}`, 'DELETE');
      setCreating(false);
      setDraft(empty);
      setSaved('Seção excluída.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível excluir.');
    }
  }

  function toggleProduct(productId: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      productIds: checked ? [...current.productIds, productId] : current.productIds.filter((id) => id !== productId),
    }));
  }

  const list = sections.data?.data ?? [];
  const placementLabel = (value: string) => placements.find((item) => item[0] === value)?.[1] ?? value;

  return (
    <div>
      <PageHeader
        title="Seções"
        hint="Escolha uma faixa da página inicial para ajustar título, produtos e onde ela aparece."
        action={<button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={() => { setCreating(true); setDraft(empty); setError(''); setSaved(''); }}>Nova seção</button>}
      />
      {sections.isError ? <Notice>Não foi possível carregar as seções.</Notice> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {list.map((section) => {
          const current = !creating && draft.id === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => { setCreating(false); edit(section); }}
              className={`rounded-full px-4 py-2 text-sm transition ${current ? 'bg-magenta-600 text-white' : 'border border-blush-200 bg-white text-ink-700 hover:border-magenta-400'}`}
            >
              {section.title}
              <span className={`ml-2 text-xs ${current ? 'text-white/80' : 'text-ink-500'}`}>{section.active ? 'Ativa' : 'Inativa'}</span>
            </button>
          );
        })}
      </div>
      {draft.id || creating ? (
      <section className="rounded-[1.75rem] border border-blush-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl text-magenta-700">{draft.title.trim() || 'Nova seção'}</h2>
            {draft.id ? <p className="mt-1 text-sm text-ink-500">{placementLabel(draft.placement)}</p> : null}
          </div>
          <div className="flex items-center gap-4">
            {draft.id ? <button type="button" className="text-sm text-magenta-700" onClick={() => void remove()}>Excluir</button> : null}
            {creating ? <button type="button" className="text-sm text-ink-500" onClick={() => { setCreating(false); setDraft(empty); }}>Cancelar</button> : null}
            <button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={() => void save()}>Salvar</button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Título">
            <TextInput value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </Field>
          <Field label="Subtítulo">
            <TextInput value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} />
          </Field>
          <Field label="Tipo">
            <Select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
              {types.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Onde aparece">
            <Select value={draft.placement} onChange={(event) => setDraft({ ...draft, placement: event.target.value })}>
              {placements.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Quantidade">
            <TextInput value={draft.productsLimit} onChange={(event) => setDraft({ ...draft, productsLimit: event.target.value })} />
          </Field>
          <Field label="Ordem">
            <TextInput value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} />
          </Field>
          <Field label="Texto do botão">
            <TextInput value={draft.buttonText} onChange={(event) => setDraft({ ...draft, buttonText: event.target.value })} />
          </Field>
          <Field label="Link do botão">
            <TextInput value={draft.buttonUrl} onChange={(event) => setDraft({ ...draft, buttonUrl: event.target.value })} placeholder="/produtos" />
          </Field>
          {draft.type === 'category' ? (
            <Field label="Categoria">
              <Select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
                <option value="">Escolha</option>
                {categories.data?.data.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          <div className="flex items-end">
            <Check label="Seção ativa" checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
          </div>
          <div className="md:col-span-2">
            <Field label="Descrição">
              <Area value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </Field>
          </div>
        </div>
        {draft.type === 'manual' ? (
          <div className="mt-4">
            <p className="text-sm font-medium">Produtos, na ordem marcada</p>
            <div className="mt-2 grid max-h-64 gap-1 overflow-auto sm:grid-cols-2">
              {products.data?.data.map((product) => (
                <Check
                  key={product.id}
                  label={product.name}
                  checked={draft.productIds.includes(product.id)}
                  onChange={(checked) => toggleProduct(product.id, checked)}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-4">
          <p className="text-sm font-medium text-ink-700">Imagem opcional</p>
          <label className="mt-2 inline-flex cursor-pointer items-center rounded-full border border-magenta-500 px-4 py-2 text-[11px] font-semibold tracking-wide text-magenta-600 uppercase transition hover:bg-magenta-500 hover:text-white">
            Enviar imagem
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file || !draft.id) {
                  if (file) setError('Salve a seção antes de enviar a imagem.');
                  return;
                }
                void apiUpload<DataResponse<{ imageUrl: string }>>(`/api/admin/sections/${draft.id}/image`, file)
                  .then(async (response) => {
                    setDraft((current) => ({ ...current, bannerImageUrl: response.data.imageUrl }));
                    await refresh();
                  })
                  .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Não foi possível enviar a imagem.'));
              }}
            />
          </label>
          {draft.bannerImageUrl ? <img src={draft.bannerImageUrl} alt="" className="mt-3 h-24 rounded-2xl border border-blush-100 object-contain" /> : null}
        </div>
        <p className="mt-4 text-xs text-ink-500">
          A grade principal é a faixa “Produtos em destaque”. Um bloco novo aparece abaixo dos banners. A posição guardada fica só no painel.
        </p>
        {error ? <div className="mt-3"><Notice>{error}</Notice></div> : null}
        {saved ? <p className="mt-3 text-sm text-ink-700">{saved}</p> : null}
      </section>
      ) : null}
    </div>
  );
}
