import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError, apiGet, apiSend, apiUpload } from '../../services/api';
import type { AdminBanner } from '../../types/admin';
import type { DataResponse } from '../../types/catalog';
import { Field, Notice, PageHeader, Select, TextInput } from './ui';

type Draft = {
  id?: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  altText: string;
  buttonText: string;
  buttonUrl: string;
  position: string;
  active: boolean;
  sortOrder: string;
  imageUrl: string | null;
};

const empty: Draft = {
  title: '',
  subtitle: '',
  eyebrow: '',
  altText: '',
  buttonText: '',
  buttonUrl: '',
  position: 'hero',
  active: true,
  sortOrder: '1',
  imageUrl: null,
};

const positions: Record<string, string> = {
  hero: 'Principal',
  'promo-left': 'Kits, à esquerda',
  'promo-right': 'Lançamentos, à direita',
};

export function BannersPage() {
  const queryClient = useQueryClient();
  const banners = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: () => apiGet<DataResponse<AdminBanner[]>>('/api/admin/banners'),
  });
  const [draft, setDraft] = useState<Draft>(empty);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (creating || draft.id || !banners.data?.data[0]) return;
    const banner = banners.data.data[0];
    setDraft({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      eyebrow: banner.eyebrow,
      altText: banner.altText,
      buttonText: banner.buttonText ?? '',
      buttonUrl: banner.buttonUrl ?? '',
      position: banner.position,
      active: banner.active,
      sortOrder: String(banner.sortOrder),
      imageUrl: banner.imageUrl,
    });
  }, [banners.data, creating, draft.id]);

  function edit(banner: AdminBanner) {
    setDraft({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      eyebrow: banner.eyebrow,
      altText: banner.altText,
      buttonText: banner.buttonText ?? '',
      buttonUrl: banner.buttonUrl ?? '',
      position: banner.position,
      active: banner.active,
      sortOrder: String(banner.sortOrder),
      imageUrl: banner.imageUrl,
    });
    setError('');
    setSaved('');
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    await queryClient.invalidateQueries({ queryKey: ['home'] });
  }

  async function save() {
    setError('');
    setSaved('');
    const body = {
      title: draft.title,
      subtitle: draft.subtitle,
      eyebrow: draft.eyebrow,
      altText: draft.altText,
      buttonText: draft.buttonText || null,
      buttonUrl: draft.buttonUrl || null,
      position: draft.position,
      active: draft.active,
      sortOrder: Number(draft.sortOrder) || 0,
      imageUrl: draft.imageUrl,
    };
    try {
      if (draft.id) await apiSend(`/api/admin/banners/${draft.id}`, 'PATCH', body);
      else {
        const created = await apiSend<DataResponse<AdminBanner>>('/api/admin/banners', 'POST', body);
        setCreating(false);
        setDraft((current) => ({ ...current, id: created.data.id }));
      }
      setSaved('Banner salvo.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar.');
    }
  }

  async function remove() {
    if (!draft.id) return;
    try {
      await apiSend(`/api/admin/banners/${draft.id}`, 'DELETE');
      setCreating(false);
      setDraft(empty);
      setSaved('Banner excluído.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível excluir.');
    }
  }

  const list = banners.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Banners"
        hint="O principal é o destaque do topo. Os outros dois ficam na faixa de kits e lançamentos."
        action={<button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={() => { setCreating(true); setDraft(empty); setError(''); setSaved(''); }}>Novo banner</button>}
      />
      {banners.isError ? <Notice>Não foi possível carregar os banners.</Notice> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {list.map((banner) => {
          const current = !creating && draft.id === banner.id;
          return (
            <button
              key={banner.id}
              type="button"
              onClick={() => { setCreating(false); edit(banner); }}
              className={`rounded-full px-4 py-2 text-sm transition ${current ? 'bg-magenta-600 text-white' : 'border border-blush-200 bg-white text-ink-700 hover:border-magenta-400'}`}
            >
              {banner.title}
              <span className={`ml-2 text-xs ${current ? 'text-white/80' : 'text-ink-500'}`}>{positions[banner.position] ?? banner.position}</span>
            </button>
          );
        })}
      </div>
      {draft.id || creating ? (
        <section className="rounded-[1.75rem] border border-blush-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl text-magenta-700">{draft.title.trim() || 'Novo banner'}</h2>
              <p className="mt-1 text-sm text-ink-500">{positions[draft.position] ?? 'Posição'}</p>
            </div>
            <div className="flex items-center gap-4">
              {draft.id ? <button type="button" className="text-sm text-magenta-700" onClick={() => void remove()}>Excluir</button> : null}
              {creating ? <button type="button" className="text-sm text-ink-500" onClick={() => { setCreating(false); setDraft(empty); }}>Cancelar</button> : null}
              <button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={() => void save()}>Salvar</button>
            </div>
          </div>
          <label className="mb-4 block cursor-pointer overflow-hidden rounded-[1.5rem] border border-dashed border-blush-200 bg-blush-50">
            {draft.imageUrl ? <img src={draft.imageUrl} alt="" className="h-44 w-full object-contain" /> : <span className="grid h-36 place-items-center px-4 text-center text-sm text-ink-500">Sem imagem, a vitrine usa a composição da marca. Clique para enviar.</span>}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              aria-label="Enviar imagem do banner"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file || !draft.id) {
                  if (file) setError('Salve o banner antes de enviar a imagem.');
                  return;
                }
                void apiUpload<DataResponse<{ imageUrl: string }>>(`/api/admin/banners/${draft.id}/image`, file)
                  .then(async (response) => {
                    setDraft((current) => ({ ...current, imageUrl: response.data.imageUrl }));
                    await refresh();
                  })
                  .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Não foi possível enviar a imagem.'));
              }}
            />
          </label>
          {draft.imageUrl ? (
            <button type="button" className="mb-4 text-sm text-magenta-700" onClick={() => setDraft({ ...draft, imageUrl: null })}>
              Remover imagem ao salvar
            </button>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Título">
              <TextInput value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </Field>
            <Field label="Linha de cima">
              <TextInput value={draft.eyebrow} onChange={(event) => setDraft({ ...draft, eyebrow: event.target.value })} />
            </Field>
            <Field label="Subtítulo" hint="No banner principal, este texto aparece em letra cursiva.">
              <TextInput value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} />
            </Field>
            <Field label="Posição">
              <Select value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })}>
                <option value="hero">Principal</option>
                <option value="promo-left">Kits, à esquerda</option>
                <option value="promo-right">Lançamentos, à direita</option>
              </Select>
            </Field>
            <Field label="Texto do botão">
              <TextInput value={draft.buttonText} onChange={(event) => setDraft({ ...draft, buttonText: event.target.value })} />
            </Field>
            <Field label="Link do botão">
              <TextInput value={draft.buttonUrl} onChange={(event) => setDraft({ ...draft, buttonUrl: event.target.value })} />
            </Field>
            <Field label="Texto alternativo da imagem">
              <TextInput value={draft.altText} onChange={(event) => setDraft({ ...draft, altText: event.target.value })} />
            </Field>
            <div className="flex items-end">
              <button type="button" aria-pressed={draft.active} onClick={() => setDraft({ ...draft, active: !draft.active })} className={`rounded-full px-4 py-2 text-sm font-medium ${draft.active ? 'bg-magenta-600 text-white' : 'border border-blush-200 text-ink-500'}`}>
                {draft.active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          </div>
          {error ? <div className="mt-3"><Notice>{error}</Notice></div> : null}
          {saved ? <p className="mt-3 text-sm text-ink-700">{saved}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
