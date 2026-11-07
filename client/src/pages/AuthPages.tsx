import { ArrowRight, ChevronRight, Heart, LogOut, Mail, Package, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { LineThumb } from '../components/catalog/LineThumb';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';
import { useShop } from '../context/ShopContext';
import { ApiError, apiSend } from '../services/api';
import { track } from '../services/analytics';
import { useMyOrders } from './CheckoutPage';
import { formatBRL } from '../utils/money';
import type { DataResponse, SessionUser } from '../types/catalog';

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

const registerSchema = z
  .object({
    email: z.string().trim().email('Informe um e-mail válido.'),
    emailConfirm: z.string().trim().min(1, 'Confirme o e-mail.'),
    firstName: z.string().trim().min(2, 'Informe o nome.'),
    lastName: z.string().trim().min(2, 'Informe o sobrenome.'),
    password: z
      .string()
      .min(8, 'A senha deve ter pelo menos 8 caracteres.')
      .regex(/[A-Za-z]/, 'Inclua ao menos uma letra.')
      .regex(/[0-9]/, 'Inclua ao menos um número.'),
  })
  .refine((value) => value.email.toLowerCase() === value.emailConfirm.toLowerCase(), {
    message: 'Os e-mails não coincidem.',
    path: ['emailConfirm'],
  });

function nextPath(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/admin')) return raw;
  return '/minha-conta';
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destination = nextPath(params.get('next'));
  const { refreshUser } = useShop();
  const [error, setError] = useState('');
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  async function submit(values: z.infer<typeof loginSchema>) {
    setError('');
    try {
      await apiSend<DataResponse<SessionUser>>('/api/auth/login', 'POST', values);
      await refreshUser();
      track('login_success', { path: '/login' });
      navigate(destination);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível entrar.');
    }
  }

  async function enterWithGoogle(credential: string) {
    setError('');
    try {
      await apiSend<DataResponse<SessionUser>>('/api/auth/google', 'POST', { credential });
      await refreshUser();
      track('login_success', { path: '/login' });
      navigate(destination);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível entrar com o Google.');
    }
  }

  return (
    <AuthShell title="Entrar" subtitle="Acesse sua conta para acompanhar pedidos.">
      <GoogleAuthButton onCredential={(credential) => void enterWithGoogle(credential)} onError={setError} />
      {error ? <p role="alert" className="mt-3 text-sm text-magenta-700">{error}</p> : null}
      <p className="my-4 text-center text-xs tracking-wide text-ink-500 uppercase">ou</p>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="E-mail" error={form.formState.errors.email?.message}>
          <input type="email" autoComplete="username" className="field" {...form.register('email')} />
        </Field>
        <Field label="Senha" error={form.formState.errors.password?.message}>
          <input type="password" autoComplete="current-password" className="field" {...form.register('password')} />
        </Field>
        <button type="submit" className="btn-cart" disabled={form.formState.isSubmitting}>
          Entrar
        </button>
      </form>
      <p className="mt-4 text-sm">
        Ainda não tem conta?{' '}
        <Link to={params.get('next') ? `/cadastro?next=${encodeURIComponent(destination)}` : '/cadastro'} className="text-link">
          Cadastre-se
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destination = nextPath(params.get('next'));
  const { refreshUser } = useShop();
  const [error, setError] = useState('');
  const form = useForm<z.input<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  const email = form.watch('email');
  const emailConfirm = form.watch('emailConfirm');
  const emailReady = Boolean(email && emailConfirm && email.trim().toLowerCase() === emailConfirm.trim().toLowerCase() && z.string().email().safeParse(email.trim()).success);

  async function submit(values: z.input<typeof registerSchema>) {
    setError('');
    try {
      await apiSend('/api/auth/register', 'POST', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      });
      await refreshUser();
      track('sign_up', { path: '/cadastro' });
      navigate(destination);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível criar a conta.');
    }
  }

  async function enterWithGoogle(credential: string) {
    setError('');
    try {
      await apiSend<DataResponse<SessionUser>>('/api/auth/google', 'POST', { credential });
      await refreshUser();
      track('sign_up', { path: '/cadastro' });
      navigate(destination);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível criar a conta com o Google.');
    }
  }

  return (
    <AuthShell title="Criar conta" subtitle="Crie seu cantinho para salvar favoritos e acompanhar cada pedido.">
      <GoogleAuthButton onCredential={(credential) => void enterWithGoogle(credential)} onError={setError} />
      {error ? <p role="alert" className="mt-3 text-sm text-magenta-700">{error}</p> : null}
      <p className="my-4 text-center text-xs tracking-wide text-ink-500 uppercase">ou</p>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="E-mail" error={form.formState.errors.email?.message}>
          <input type="email" autoComplete="email" className="field" {...form.register('email')} />
        </Field>
        <Field label="Confirmar e-mail" error={form.formState.errors.emailConfirm?.message}>
          <input type="email" autoComplete="email" className="field" {...form.register('emailConfirm')} />
        </Field>
        {emailReady ? (
          <>
            <Field label="Nome" error={form.formState.errors.firstName?.message}>
              <input autoComplete="given-name" className="field" {...form.register('firstName')} />
            </Field>
            <Field label="Sobrenome" error={form.formState.errors.lastName?.message}>
              <input autoComplete="family-name" className="field" {...form.register('lastName')} />
            </Field>
            <Field label="Senha" error={form.formState.errors.password?.message}>
              <input type="password" autoComplete="new-password" className="field" {...form.register('password')} />
            </Field>
            <button type="submit" className="btn-cart" disabled={form.formState.isSubmitting}>
              Cadastrar
            </button>
          </>
        ) : null}
      </form>
    </AuthShell>
  );
}

export function AccountPage() {
  const { user, authLoading, logout, favorites } = useShop();
  const orders = useMyOrders();
  const navigate = useNavigate();
  const [exitError, setExitError] = useState('');
  const [leaving, setLeaving] = useState(false);
  if (authLoading) return <main className="store-wrap py-16 text-ink-500" role="status">Carregando sua conta...</main>;
  if (!user) return <LoginPage />;
  const initial = user.name.trim().charAt(0).toUpperCase() || 'Y';
  const list = orders.data?.data;
  const pending = list?.filter(order => order.paymentStatus === 'PENDING').length;

  return (
    <main className="account-page store-wrap py-8 sm:py-12">
      <div className="account-welcome">
        <div>
          <p className="workspace-eyebrow"><Sparkles size={14} aria-hidden /> Seu cantinho na Yo Beauty</p>
          <h1 className="type-title mt-3">Olá, {user.name.split(' ')[0]}<span className="text-gold-700">.</span></h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-ink-500">Seus pedidos, seus favoritos e tudo o que faz parte da sua rotina de beleza.</p>
        </div>
        <Link to="/produtos" className="account-shop-link">Explorar a loja <ArrowRight size={17} /></Link>
      </div>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="account-profile lg:sticky lg:top-[var(--store-header-offset,196px)]">
          <div className="account-profile-top">
            <span className="account-avatar" aria-hidden>{initial}</span>
            <h2 className="mt-4 text-base font-semibold break-words">{user.name}</h2>
            <p className="mt-1 break-all text-xs leading-5 text-ink-500">{user.email}</p>
          </div>
          <nav aria-label="Minha conta" className="account-navigation">
            <a href="#meus-pedidos" className="account-nav-link"><Package size={17} /> Meus pedidos <ChevronRight size={15} className="ml-auto" /></a>
            <Link to="/favoritos" className="account-nav-link"><Heart size={17} /> Meus favoritos <span className="ml-auto text-xs">{favorites.length}</span></Link>
            {user.role === 'ADMIN' ? <Link to="/admin" className="account-nav-link"><UserRound size={17} /> Painel da loja <ChevronRight size={15} className="ml-auto" /></Link> : null}
          </nav>
          <div className="border-t border-blush-100 p-4">
            <button type="button" className="account-logout" disabled={leaving} onClick={async () => {
              setLeaving(true); setExitError('');
              try { await logout(); navigate('/'); }
              catch { setExitError('Não foi possível sair. Tente novamente.'); setLeaving(false); }
            }}><LogOut size={16} />{leaving ? 'Saindo...' : 'Sair da conta'}</button>
            {exitError ? <p role="alert" className="mt-2 text-xs text-magenta-700">{exitError}</p> : null}
          </div>
        </aside>
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <AccountMetric label="Pedidos recentes" value={list ? String(list.length) : '—'} icon={ShoppingBag} />
            <AccountMetric label="Aguardando pagamento" value={pending == null ? '—' : String(pending)} icon={Package} />
            <AccountMetric label="Favoritos" value={String(favorites.length)} icon={Heart} />
          </div>
          <OrdersPreview orders={orders} />
          <div className="account-help"><Mail size={20} className="shrink-0 text-magenta-600" /><div><p className="text-sm font-semibold text-ink-900">Podemos te ajudar?</p><p className="mt-1 text-xs leading-5 text-ink-500">Fale com a gente para tirar dúvidas sobre sua compra.</p></div><Link to="/pagina/contato" className="ml-auto shrink-0 text-sm font-semibold text-magenta-700">Contato <ArrowRight size={15} className="inline" /></Link></div>
        </div>
      </div>
    </main>
  );
}

function AccountMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Heart }) {
  return <div className="account-metric"><Icon size={18} aria-hidden /><p className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">{value}</p><p className="mt-1 text-[10px] leading-4 text-ink-500 sm:text-xs">{label}</p></div>;
}

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

function orderStatusText(paymentStatus: string, orderStatus: string) {
  const payment = paymentLabel[paymentStatus] ?? paymentStatus;
  const fulfillment = orderLabel[orderStatus] ?? orderStatus;
  return payment === fulfillment ? payment : `${payment} · ${fulfillment}`;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function orderItemsText(items: { quantity: number; name: string }[]) {
  const names = items.slice(0, 2).map((item) => `${item.quantity}× ${item.name}`);
  const extra = items.length - names.length;
  const rest = extra === 1 ? 'e mais 1 item' : `e mais ${extra} itens`;
  return extra > 0 ? `${names.join(', ')} ${rest}` : names.join(', ');
}

function OrdersPreview({ orders }: { orders: ReturnType<typeof useMyOrders> }) {
  const list = orders.data?.data ?? [];
  return (
    <section id="meus-pedidos" className="account-orders scroll-mt-40">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div><p className="workspace-eyebrow mb-2">Acompanhe por aqui</p><h2 className="type-section !text-3xl">Meus pedidos</h2></div>
        {list.length > 0 ? <p className="text-sm text-ink-500">{list.length === 1 ? '1 pedido' : `${list.length} pedidos`}</p> : null}
      </div>
      {orders.isLoading ? <p className="text-sm text-ink-500">Carregando pedidos...</p> : null}
      {orders.isError ? <div role="alert" className="rounded-2xl bg-blush-50 p-5 text-sm text-magenta-700">Não foi possível carregar os pedidos. <button type="button" className="font-semibold underline" onClick={() => void orders.refetch()}>Tentar novamente</button></div> : null}
      {!orders.isLoading && !orders.isError && list.length === 0 ? (
        <div className="rounded-[1.75rem] border border-blush-200 bg-blush-50 px-6 py-10 text-center">
          <span className="empty-state-icon"><ShoppingBag size={28} strokeWidth={1.3} /></span><h3 className="type-product mt-5">Seu próximo favorito está esperando</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">Você ainda não tem pedidos. Assim que registrar uma compra, os detalhes aparecem neste espaço.</p>
          <Link to="/produtos" className="btn-cart mx-auto mt-5 max-w-xs">Ver produtos</Link>
        </div>
      ) : null}
      {list.length > 0 ? (
        <ul className="space-y-3">
          {list.map((order) => (
            <li key={order.id}>
              <Link to={`/pedido/${order.id}`} className="account-order-card block rounded-2xl border border-blush-200/70 bg-white p-4 transition hover:border-magenta-400 hover:shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-ink-500">{formatOrderDate(order.createdAt)}</p><span className={`order-status mt-3 ${order.paymentStatus === 'CANCELLED' ? 'order-status-muted' : order.paymentStatus === 'PAID' ? 'order-status-paid' : ''}`}>{orderStatusText(order.paymentStatus, order.orderStatus)}</span>
                  </div>
                  <p className="shrink-0 font-semibold text-price">{formatBRL(order.totalCents)}</p>
                </div>
                {order.items.length > 0 ? <div className="mt-4 flex items-center gap-3 border-t border-blush-100 pt-4"><div className="flex shrink-0 -space-x-3">{order.items.slice(0, 2).map(item => <LineThumb key={item.id} name={item.name} imageUrl={item.imageUrl} categorySlug={item.categorySlug} />)}</div><p className="min-w-0 text-xs leading-5 text-ink-700">{orderItemsText(order.items)}</p></div> : null}
                <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-magenta-700">Ver detalhes do pedido <ArrowRight size={14} /></p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="store-wrap py-8 sm:py-12">
      <div className="auth-layout mx-auto grid max-w-4xl overflow-hidden rounded-[2rem] border border-blush-200 bg-white lg:grid-cols-[.85fr_1fr]">
        <div className="auth-story relative hidden flex-col justify-between overflow-hidden bg-magenta-900 p-10 text-white lg:flex">
          <Sparkles size={25} className="text-gold-300" strokeWidth={1.3} />
          <div className="relative z-10 py-12"><p className="text-[10px] tracking-[.18em] text-gold-300 uppercase">Beleza que acompanha você</p><h2 className="mt-5 font-script text-5xl leading-tight">Seu cuidado.<br /><em>Seu momento.</em></h2><p className="mt-5 max-w-xs text-sm leading-7 text-white/75">Entre e deixe seus próximos favoritos mais perto.</p></div>
          <p className="relative z-10 text-xs text-white/60">Makes, cosméticos e acessórios · Yo Beauty</p>
        </div>
        <div className="p-6 sm:p-10 lg:p-12"><p className="workspace-eyebrow mb-3">Bem-vinda à Yo Beauty</p><h1 className="type-title !text-4xl">{title}</h1><p className="mt-3 mb-7 text-sm leading-6 text-ink-500">{subtitle}</p>{children}</div>
      </div>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      {label}
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs text-magenta-700">{error}</span> : null}
    </label>
  );
}
