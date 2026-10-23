import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LineThumb } from '../components/catalog/LineThumb';
import { useHome, useShop } from '../context/ShopContext';
import { useCartQuote } from './CartPage';
import { ApiError, apiGet, apiSend } from '../services/api';
import { track } from '../services/analytics';
import type { DataResponse } from '../types/catalog';
import { formatCep, formatPostalCode, lookupCep } from '../utils/cep';
import { formatBRL } from '../utils/money';
import { DEFAULT_STORE_WHATSAPP, enabledPaymentMethods, orderWhatsappHref, paymentMethodLabel, showWhatsapp, type PaymentMethodId } from '../utils/order-whatsapp';

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

type StoreOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  address: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  subtotalCents: number;
  shippingCostCents: number;
  totalCents: number;
  paymentStatus: string;
  orderStatus: string;
  payment?: { provider?: string | null; status?: string | null } | null;
  createdAt: string;
  items: {
    id: string;
    name: string;
    slug?: string;
    categorySlug?: string;
    imageUrl?: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[];
};

const paymentLabel: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago',
  FAILED: 'Pagamento não concluído',
  REFUNDED: 'Estornado',
  PARTIALLY_REFUNDED: 'Estornado em parte',
  CANCELLED: 'Cancelado',
};

const orderLabel: Record<string, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID_AWAITING_PROCESSING: 'Pago, aguardando separação',
  PROCESSING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export function CheckoutPage() {
  const { user, authLoading, cart, clearCart } = useShop();
  const quote = useCartQuote();
  const navigate = useNavigate();
  const home = useHome();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | ''>('');
  const [cepStatus, setCepStatus] = useState('');
  const checkoutTracked = useRef(false);
  const cepRequest = useRef(0);
  const numberRef = useRef<HTMLInputElement>(null);
  const quotedReady = Boolean(quote.data?.data.ready);
  useEffect(() => {
    if (!user || !quotedReady || checkoutTracked.current) return;
    checkoutTracked.current = true;
    track('begin_checkout', { path: '/checkout' });
  }, [quotedReady, user]);
  const [form, setForm] = useState({
    recipientName: '',
    phone: '',
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'PE',
  });

  useEffect(() => {
    if (!user?.name) return;
    setForm((current) => (current.recipientName ? current : { ...current, recipientName: user.name }));
  }, [user]);

  if (authLoading) return <main className="store-wrap py-16">Carregando...</main>;
  if (cart.length === 0) {
    return (
      <main className="store-wrap py-16">
        <p>Seu carrinho está vazio. <Link to="/produtos" className="text-link">Ver produtos</Link></p>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="store-wrap py-16">
        <h1 className="type-title">Finalizar compra</h1>
        <p className="mt-4 max-w-xl text-ink-700">Entre ou crie uma conta para confirmar o pedido. Os itens do carrinho continuam salvos neste navegador.</p>
        <div className="mt-6 flex max-w-xs flex-col gap-3">
          <Link to="/login?next=/checkout" className="btn-cart">Entrar</Link>
          <Link to="/cadastro?next=/checkout" className="text-link text-center text-sm">Criar conta</Link>
        </div>
      </main>
    );
  }

  const quoted = quote.data?.data;

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onCep(value: string) {
    const formatted = formatCep(value);
    update('postalCode', formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length < 8) {
      setCepStatus('');
      return;
    }
    const request = ++cepRequest.current;
    setCepStatus('Buscando endereço...');
    void lookupCep(digits)
      .then((found) => {
        if (request !== cepRequest.current) return;
        if (!found) {
          setCepStatus('CEP não encontrado. Confira os números.');
          return;
        }
        setForm((current) => {
          if (!current.number) queueMicrotask(() => numberRef.current?.focus());
          return {
            ...current,
            postalCode: formatted,
            street: found.street || current.street,
            neighborhood: found.neighborhood || current.neighborhood,
            city: found.city || current.city,
          state: states.includes(found.state) ? found.state : current.state,
        };
        });
        setCepStatus(found.street ? 'Endereço preenchido. Informe o número.' : 'Cidade preenchida. Complete a rua e o número.');
      })
      .catch(() => {
        if (request !== cepRequest.current) return;
        setCepStatus('Não foi possível consultar o CEP agora. Você pode preencher o endereço.');
      });
  }

  async function confirm() {
    if (!paymentMethod) {
      setError('Escolha a forma de pagamento.');
      return;
    }
    const popup = window.open('about:blank', '_blank');
    setError('');
    setPending(true);
    try {
      const response = await apiSend<DataResponse<StoreOrder>>('/api/orders', 'POST', {
        items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })),
        phone: form.phone,
        paymentMethod,
        address: {
          recipientName: form.recipientName,
          postalCode: form.postalCode,
          street: form.street,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
        },
      });
      const href = orderWhatsappHref(
        response.data,
        home.data?.data.store.whatsappNumber || DEFAULT_STORE_WHATSAPP,
        home.data?.data.store.freeShippingThresholdCents ?? 0,
      );
      showWhatsapp(popup, href);
      clearCart();
      navigate(`/pedido/${response.data.id}`);
    } catch (caught) {
      popup?.close();
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível registrar o pedido.');
    } finally {
      setPending(false);
    }
  }

  const photos = new Map(cart.map((line) => [line.id, line.imageUrl]));

  return (
    <main className="store-wrap grid items-start gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <section className="rounded-3xl border border-blush-200 bg-white p-4 sm:p-6">
        <h1 className="type-title">Entrega</h1>
        <p className="mt-2 text-sm text-ink-500">Digite o CEP para preencher a rua, o bairro, a cidade e a UF.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">Quem recebe<input className="field mt-1" value={form.recipientName} onChange={(event) => update('recipientName', event.target.value)} /></label>
          <label className="text-sm">Telefone<input className="field mt-1" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
          <label className="text-sm">CEP
            <input
              className="field mt-1"
              inputMode="numeric"
              autoComplete="postal-code"
              value={form.postalCode}
              onChange={(event) => onCep(event.target.value)}
              placeholder="00000-000"
              aria-describedby="cep-status"
            />
          </label>
          {cepStatus ? <p id="cep-status" className="text-sm text-magenta-700 sm:col-span-2" aria-live="polite">{cepStatus}</p> : null}
          <label className="text-sm sm:col-span-2">Rua<input className="field mt-1" value={form.street} onChange={(event) => update('street', event.target.value)} /></label>
          <label className="text-sm">Número<input ref={numberRef} className="field mt-1" value={form.number} onChange={(event) => update('number', event.target.value)} /></label>
          <label className="text-sm">Complemento<input className="field mt-1" value={form.complement} onChange={(event) => update('complement', event.target.value)} /></label>
          <label className="text-sm">Bairro<input className="field mt-1" value={form.neighborhood} onChange={(event) => update('neighborhood', event.target.value)} /></label>
          <label className="text-sm">Cidade<input className="field mt-1" value={form.city} onChange={(event) => update('city', event.target.value)} /></label>
          <label className="text-sm">UF
            <select className="field mt-1 rounded-2xl bg-white" value={form.state} onChange={(event) => update('state', event.target.value)}>
              {states.map((state) => <option key={state}>{state}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Forma de pagamento</legend>
          <p className="mt-1 text-sm text-ink-500">Escolha como prefere pagar. A loja confirma pelo WhatsApp e nada é cobrado nesta tela.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {enabledPaymentMethods(home.data?.data.store.paymentMethods).map((method) => (
              <label
                key={method.id}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${paymentMethod === method.id ? 'border-magenta-600 bg-magenta-600 text-white hover:bg-magenta-700' : 'border-blush-200 bg-white text-ink-700 hover:border-magenta-400 hover:text-magenta-700'}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="payment-method"
                  value={method.id}
                  checked={paymentMethod === method.id}
                  onChange={() => setPaymentMethod(method.id)}
                />
                {method.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>
      <aside className="h-fit rounded-3xl border border-blush-200 bg-white p-5 lg:sticky lg:top-[var(--store-header-offset,196px)]">
        <h2 className="type-section">Resumo</h2>
        <ul className="mt-4 space-y-3">
          {quoted?.lines.map((line) => (
            <li key={line.productId} className="flex items-center gap-3">
              <LineThumb
                name={line.name}
                slug={line.slug}
                categorySlug={line.categorySlug}
                imageUrl={line.imageUrl || photos.get(line.productId)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{line.quantity}× {line.name}</p>
                <p className="text-sm text-price">{formatBRL(line.lineTotalCents)}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-500">{quoted?.shippingLabel}</p>
        <p className="mt-2 text-lg font-semibold text-price">Total {quoted ? formatBRL(quoted.totalCents) : '...'}</p>
        <p className="mt-3 text-xs text-ink-500">Nenhum pagamento é feito no site. Ao confirmar, o WhatsApp abre com o pedido pronto para você enviar.</p>
        {error ? <p className="mt-3 text-sm text-magenta-700">{error}</p> : null}
        <button type="button" className="btn-cart mt-4" disabled={pending || !quoted?.ready || !paymentMethod} onClick={() => void confirm()}>
          {pending ? 'Registrando pedido...' : 'Confirmar e abrir WhatsApp'}
        </button>
      </aside>
    </main>
  );
}

export function OrderPage() {
  const { id } = useParams();
  const home = useHome();
  const order = useQuery({
    queryKey: ['order', id],
    enabled: Boolean(id),
    queryFn: () => apiGet<DataResponse<StoreOrder>>(`/api/orders/${id}`),
  });
  const data = order.data?.data;
  if (order.isLoading) return <main className="store-wrap py-16">Carregando pedido...</main>;
  if (!data) return <main className="store-wrap py-16">Pedido não encontrado.</main>;

  const address = data.address;
  const postal = formatPostalCode(address.postalCode);
  const whatsapp = orderWhatsappHref(
    data,
    home.data?.data.store.whatsappNumber || DEFAULT_STORE_WHATSAPP,
    home.data?.data.store.freeShippingThresholdCents ?? 0,
  );
  const method = paymentMethodLabel(data.payment?.provider);

  return (
    <main className="store-wrap max-w-3xl py-8 sm:py-10">
      <h1 className="type-title">Pedido confirmado</h1>
      <div className="mt-6 rounded-3xl border border-blush-200 bg-white p-4 sm:p-6">
        <p className="text-ink-700">Número {data.orderNumber}</p>
        <p className="mt-1 text-sm text-ink-500">{[paymentLabel[data.paymentStatus] ?? data.paymentStatus, orderLabel[data.orderStatus] ?? data.orderStatus].filter((label, index, list) => list.indexOf(label) === index).join(' · ')}</p>
        {data.paymentStatus === 'PENDING' ? (
          <p className="mt-4 text-sm text-ink-700">
            O pedido foi registrado e nenhuma cobrança foi feita no site. Envie a mensagem no WhatsApp para a loja confirmar o pagamento{method ? ` por ${method}` : ''}.
          </p>
        ) : null}
        <ul className="mt-6 space-y-3">
          {data.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-t border-blush-100 pt-3 first:border-t-0 first:pt-0">
              <LineThumb name={item.name} slug={item.slug} categorySlug={item.categorySlug} imageUrl={item.imageUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{item.quantity}× {item.name}</p>
                <p className="text-sm text-ink-500">{formatBRL(item.unitPriceCents)} cada</p>
              </div>
              <p className="shrink-0 font-semibold text-price">{formatBRL(item.lineTotalCents)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-right text-lg font-semibold text-price">Total {formatBRL(data.totalCents)}</p>
        <div className="mt-5 rounded-2xl bg-blush-50 p-4 text-sm text-ink-700">
          <p className="font-medium text-ink-900">Entrega para {data.customerName}</p>
          <p className="mt-1">
            {address.street?.trim()}, {address.number?.trim()}
            {address.complement?.trim() ? ` — ${address.complement.trim()}` : ''}
          </p>
          <p>{address.neighborhood?.trim()} — {address.city?.trim()}/{address.state?.trim()}</p>
          {postal ? <p>CEP {postal}</p> : null}
          {data.customerPhone ? <p>{data.customerPhone}</p> : null}
          {method ? <p className="mt-2">Pagamento escolhido: {method}</p> : null}
        </div>
        {whatsapp ? (
          <a className="btn-cart mt-5" href={whatsapp} target="_blank" rel="noreferrer">
            Enviar pedido pelo WhatsApp
          </a>
        ) : null}
        <Link to="/minha-conta" className="text-link mt-4 inline-block text-sm">Ver meus pedidos</Link>
      </div>
    </main>
  );
}

export function useMyOrders() {
  const { user } = useShop();
  return useQuery({
    queryKey: ['my-orders', user?.id],
    enabled: Boolean(user),
    queryFn: () => apiGet<DataResponse<StoreOrder[]>>('/api/orders'),
  });
}
