import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError, apiGet, apiSend } from '../../services/api';
import type { AdminPage, AdminSettings } from '../../types/admin';
import type { DataResponse } from '../../types/catalog';
import { centsFromInput, reaisInput } from '../../utils/money';
import { Area, Field, Notice, PageHeader, Panel, TextInput } from './ui';

type SettingsDraft = {
  storeName: string;
  tagline: string;
  logoUrl: string | null;
  whatsappNumber: string;
  whatsappMessage: string;
  contactEmail: string;
  contactPhone: string;
  freeShippingMessage: string;
  freeShipping: string;
  installmentMessage: string;
  supportBarMessage: string;
  businessHours: string;
  footerNote: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  cash: boolean;
  pix: boolean;
  creditCard: boolean;
  debitCard: boolean;
  benefits: { icon?: string; title: string; description: string }[];
  lowStockThreshold: string;
};

function fromSettings(settings: AdminSettings): SettingsDraft {
  return {
    storeName: settings.storeName,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl,
    whatsappNumber: settings.whatsappNumber,
    whatsappMessage: settings.whatsappMessage,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    freeShippingMessage: settings.freeShippingMessage,
    freeShipping: reaisInput(settings.freeShippingThresholdCents),
    installmentMessage: settings.installmentMessage,
    supportBarMessage: settings.supportBarMessage,
    businessHours: settings.businessHours,
    footerNote: settings.footerNote,
    instagram: settings.socialLinks.instagram ?? '',
    facebook: settings.socialLinks.facebook ?? '',
    tiktok: settings.socialLinks.tiktok ?? '',
    youtube: settings.socialLinks.youtube ?? '',
    cash: settings.paymentMethods.cash !== false,
    pix: Boolean(settings.paymentMethods.pix),
    creditCard: Boolean(settings.paymentMethods.creditCard),
    debitCard: Boolean(settings.paymentMethods.debitCard),
    benefits: settings.benefits.map((benefit) => ({
      icon: benefit.icon,
      title: benefit.title,
      description: benefit.description ?? '',
    })),
    lowStockThreshold: String(settings.lowStockThreshold),
  };
}

export function SettingsPage() {
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiGet<DataResponse<AdminSettings>>('/api/admin/settings'),
  });
  if (settings.isLoading) return <p>Carregando configurações...</p>;
  if (!settings.data) return <Notice>Não foi possível carregar as configurações.</Notice>;
  return <SettingsForm initial={settings.data.data} />;
}

function SettingsForm({ initial }: { initial: AdminSettings }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SettingsDraft>(() => fromSettings(initial));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  function patch(partial: Partial<SettingsDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function save() {
    setError('');
    setSaved('');
    const freeShippingThresholdCents = centsFromInput(draft.freeShipping);
    if (freeShippingThresholdCents == null) {
      setError('Informe o valor do frete grátis, por exemplo 199,00.');
      return;
    }
    try {
      await apiSend('/api/admin/settings', 'PATCH', {
        storeName: draft.storeName,
        tagline: draft.tagline,
        whatsappNumber: draft.whatsappNumber,
        whatsappMessage: draft.whatsappMessage,
        contactEmail: draft.contactEmail,
        contactPhone: draft.contactPhone,
        freeShippingMessage: draft.freeShippingMessage,
        freeShippingThresholdCents,
        installmentMessage: draft.installmentMessage,
        supportBarMessage: draft.supportBarMessage,
        businessHours: draft.businessHours,
        footerNote: draft.footerNote,
        socialLinks: {
          instagram: draft.instagram,
          facebook: draft.facebook,
          tiktok: draft.tiktok,
          youtube: draft.youtube,
        },
        paymentMethods: {
          cash: draft.cash,
          pix: draft.pix,
          creditCard: draft.creditCard,
          debitCard: draft.debitCard,
        },
        benefits: draft.benefits.map((benefit) => ({
          icon: benefit.icon,
          title: benefit.title,
          description: benefit.description || undefined,
        })),
        lowStockThreshold: Number(draft.lowStockThreshold) || 0,
      });
      setSaved('Configurações salvas.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      await queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Configurações"
        hint="Textos da loja, contato, frete, pagamentos e páginas. O salvar do topo grava estes blocos juntos."
        action={<button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={() => void save()}>Salvar</button>}
      />
      {error ? <Notice>{error}</Notice> : null}
      {saved ? <p className="text-sm text-ink-700">{saved}</p> : null}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Loja">
          <div className="grid gap-4">
            <Field label="Nome">
              <TextInput value={draft.storeName} onChange={(event) => patch({ storeName: event.target.value })} />
            </Field>
            <Field label="Frase">
              <TextInput value={draft.tagline} onChange={(event) => patch({ tagline: event.target.value })} />
            </Field>
            <Field label="Nota do rodapé">
              <TextInput value={draft.footerNote} onChange={(event) => patch({ footerNote: event.target.value })} />
            </Field>
          </div>
        </Panel>
        <Panel title="Contato">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp">
                <TextInput value={draft.whatsappNumber} onChange={(event) => patch({ whatsappNumber: event.target.value })} />
              </Field>
              <Field label="Telefone">
                <TextInput value={draft.contactPhone} onChange={(event) => patch({ contactPhone: event.target.value })} />
              </Field>
            </div>
            <Field label="Mensagem do WhatsApp">
              <TextInput value={draft.whatsappMessage} onChange={(event) => patch({ whatsappMessage: event.target.value })} />
            </Field>
            <Field label="E-mail">
              <TextInput value={draft.contactEmail} onChange={(event) => patch({ contactEmail: event.target.value })} />
            </Field>
            <Field label="Horário">
              <TextInput value={draft.businessHours} onChange={(event) => patch({ businessHours: event.target.value })} />
            </Field>
          </div>
        </Panel>
        <Panel title="Frete e pagamento">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frete grátis a partir de">
              <TextInput value={draft.freeShipping} onChange={(event) => patch({ freeShipping: event.target.value })} placeholder="199,00" />
            </Field>
            <Field label="Estoque baixo a partir de">
              <TextInput value={draft.lowStockThreshold} onChange={(event) => patch({ lowStockThreshold: event.target.value })} inputMode="numeric" />
            </Field>
            <Field label="Mensagem de frete">
              <TextInput value={draft.freeShippingMessage} onChange={(event) => patch({ freeShippingMessage: event.target.value })} />
            </Field>
            <Field label="Parcelamento">
              <TextInput value={draft.installmentMessage} onChange={(event) => patch({ installmentMessage: event.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Toggle pressed={draft.cash} onClick={() => patch({ cash: !draft.cash })}>Dinheiro</Toggle>
            <Toggle pressed={draft.pix} onClick={() => patch({ pix: !draft.pix })}>PIX</Toggle>
            <Toggle pressed={draft.creditCard} onClick={() => patch({ creditCard: !draft.creditCard })}>Crédito</Toggle>
            <Toggle pressed={draft.debitCard} onClick={() => patch({ debitCard: !draft.debitCard })}>Débito</Toggle>
          </div>
        </Panel>
        <Panel title="Instagram">
          <Field label="Endereço do perfil" hint="O rodapé mostra este ícone e o WhatsApp. Deixe vazio para o ícone ficar sem link.">
            <TextInput value={draft.instagram} onChange={(event) => patch({ instagram: event.target.value })} placeholder="https://" />
          </Field>
        </Panel>
      </div>
      <Panel title="Benefícios do produto">
        <p className="mb-3 text-sm text-ink-500">Aparecem na página do produto, abaixo do botão de compra.</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {draft.benefits.map((benefit, index) => (
            <div key={index} className="rounded-2xl border border-blush-100 p-3">
              <p className="mb-2 text-[11px] tracking-[0.12em] text-ink-500 uppercase">Benefício {index + 1}</p>
              <div className="grid gap-2">
                <TextInput
                  aria-label={`Título do benefício ${index + 1}`}
                  value={benefit.title}
                  onChange={(event) => {
                    const benefits = draft.benefits.slice();
                    benefits[index] = { ...benefit, title: event.target.value };
                    patch({ benefits });
                  }}
                />
                <TextInput
                  aria-label={`Descrição do benefício ${index + 1}`}
                  value={benefit.description}
                  placeholder="Descrição opcional"
                  onChange={(event) => {
                    const benefits = draft.benefits.slice();
                    benefits[index] = { ...benefit, description: event.target.value };
                    patch({ benefits });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <PagesEditor />
    </div>
  );
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

function PagesEditor() {
  const queryClient = useQueryClient();
  const pages = useQuery({
    queryKey: ['admin', 'pages'],
    queryFn: () => apiGet<DataResponse<AdminPage[]>>('/api/admin/pages'),
  });
  const [pageId, setPageId] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const list = pages.data?.data ?? [];
  const selected = list.find((page) => page.id === pageId);

  useEffect(() => {
    if (creating || pageId || !list[0]) return;
    const page = list[0];
    setPageId(page.id);
    setTitle(page.title);
    setSlug(page.slug);
    setContent(page.content);
    setActive(page.active);
  }, [creating, list, pageId]);

  function load(id: string) {
    setCreating(false);
    setPageId(id);
    const page = list.find((item) => item.id === id);
    setTitle(page?.title ?? '');
    setSlug(page?.slug ?? '');
    setContent(page?.content ?? '');
    setActive(page?.active ?? true);
    setError('');
    setSaved('');
  }

  function startNew() {
    setCreating(true);
    setPageId('');
    setTitle('');
    setSlug('');
    setContent('');
    setActive(true);
    setError('');
    setSaved('');
  }

  async function save() {
    setError('');
    setSaved('');
    try {
      if (pageId) await apiSend(`/api/admin/pages/${pageId}`, 'PATCH', { title, content, active });
      else {
        const created = await apiSend<DataResponse<{ id: string; slug: string }>>('/api/admin/pages', 'POST', { title, slug, content, active });
        setCreating(false);
        setPageId(created.data.id);
        setSlug(created.data.slug);
      }
      setSaved('Página salva.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar a página.');
    }
  }

  return (
    <Panel
      title="Páginas"
      extra={<button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={startNew}>Nova página</button>}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {list.map((page) => {
          const current = !creating && page.id === pageId;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => load(page.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${current ? 'bg-magenta-600 text-white' : 'border border-blush-200 bg-white text-ink-700 hover:border-magenta-400'}`}
            >
              {page.title}
            </button>
          );
        })}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-magenta-700">{title.trim() || 'Nova página'}</h3>
          {selected ? <p className="mt-1 text-sm text-ink-500">/pagina/{selected.slug}</p> : null}
        </div>
        <div className="flex items-center gap-4">
          {creating ? <button type="button" className="text-sm text-ink-500" onClick={() => { setCreating(false); setPageId(''); }}>Cancelar</button> : null}
          <button type="button" className="btn-cart w-auto shrink-0 px-6" onClick={() => void save()}>Salvar página</button>
        </div>
      </div>
      <div className="grid gap-4">
        <Field label="Título"><TextInput value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        {creating ? <Field label="Endereço" hint="Se ficar vazio, a loja gera a partir do título."><TextInput value={slug} onChange={(event) => setSlug(event.target.value)} /></Field> : null}
        <Field label="Conteúdo" hint="Separe os parágrafos com uma linha em branco.">
          <Area className="min-h-48" value={content} onChange={(event) => setContent(event.target.value)} />
        </Field>
        <Toggle pressed={active} onClick={() => setActive((value) => !value)}>{active ? 'Publicada' : 'Oculta'}</Toggle>
      </div>
      {error ? <div className="mt-3"><Notice>{error}</Notice></div> : null}
      {saved ? <p className="mt-3 text-sm text-ink-700">{saved}</p> : null}
    </Panel>
  );
}
