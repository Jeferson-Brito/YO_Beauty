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

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .regex(/[A-Za-z]/, 'Inclua ao menos uma letra.')
    .regex(/[0-9]/, 'Inclua ao menos um número.'),
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
      {error ? <p className="mt-3 text-sm text-magenta-700">{error}</p> : null}
      <p className="my-4 text-center text-xs tracking-wide text-ink-500 uppercase">ou</p>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="E-mail" error={form.formState.errors.email?.message}>
          <input type="email" className="field" {...form.register('email')} />
        </Field>
        <Field label="Senha" error={form.formState.errors.password?.message}>
          <input type="password" className="field" {...form.register('password')} />
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
  const form = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  async function submit(values: z.infer<typeof registerSchema>) {
    setError('');
    try {
      await apiSend('/api/auth/register', 'POST', values);
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
    <AuthShell title="Criar conta" subtitle="O cadastro público cria uma conta de cliente.">
      <GoogleAuthButton onCredential={(credential) => void enterWithGoogle(credential)} onError={setError} />
      {error ? <p className="mt-3 text-sm text-magenta-700">{error}</p> : null}
      <p className="my-4 text-center text-xs tracking-wide text-ink-500 uppercase">ou</p>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="Nome" error={form.formState.errors.name?.message}>
          <input className="field" {...form.register('name')} />
        </Field>
        <Field label="E-mail" error={form.formState.errors.email?.message}>
          <input type="email" className="field" {...form.register('email')} />
        </Field>
        <Field label="Senha" error={form.formState.errors.password?.message}>
          <input type="password" className="field" {...form.register('password')} />
        </Field>
        <button type="submit" className="btn-cart" disabled={form.formState.isSubmitting}>
          Cadastrar
        </button>
      </form>
    </AuthShell>
  );
}

export function AccountPage() {
  const { user, authLoading, logout } = useShop();
  const navigate = useNavigate();
  if (authLoading) return <main className="store-wrap py-16">Carregando conta...</main>;
  if (!user) return <LoginPage />;
  const initial = user.name.trim().charAt(0).toUpperCase() || 'Y';

  return (
    <main className="store-wrap py-8 sm:py-10">
      <h1 className="script-title text-4xl sm:text-6xl">Minha conta</h1>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="rounded-[1.75rem] border border-blush-200 bg-white p-5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-blush-50 font-display text-2xl text-magenta-700" aria-hidden>
            {initial}
          </span>
          <h2 className="mt-4 font-display text-3xl text-ink-900">{user.name}</h2>
          <p className="mt-1 break-all text-sm text-ink-500">{user.email}</p>
          {user.role === 'ADMIN' ? (
            <Link to="/admin" className="text-link mt-4 inline-block text-sm">Abrir o painel da loja</Link>
          ) : null}
          <button
            type="button"
            className="btn-cart mt-5"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            Sair
          </button>
        </section>
        <OrdersPreview />
      </div>
    </main>
  );
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

function OrdersPreview() {
  const orders = useMyOrders();
  const list = orders.data?.data ?? [];
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-display text-3xl text-magenta-700">Pedidos</h2>
        {list.length > 0 ? <p className="text-sm text-ink-500">{list.length === 1 ? '1 pedido' : `${list.length} pedidos`}</p> : null}
      </div>
      {orders.isLoading ? <p className="text-sm text-ink-500">Carregando pedidos...</p> : null}
      {!orders.isLoading && list.length === 0 ? (
        <div className="rounded-[1.75rem] border border-blush-200 bg-blush-50 px-6 py-10 text-center">
          <h3 className="font-display text-2xl text-ink-900">Você ainda não tem pedidos</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">Quando uma compra for confirmada, o número, os itens e o total aparecem aqui.</p>
          <Link to="/produtos" className="btn-cart mx-auto mt-5 max-w-xs">Ver produtos</Link>
        </div>
      ) : null}
      {list.length > 0 ? (
        <ul className="space-y-3">
          {list.map((order) => (
            <li key={order.id}>
              <Link to={`/pedido/${order.id}`} className="block rounded-[1.5rem] border border-blush-200 bg-white p-4 transition hover:border-magenta-400 hover:shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{order.orderNumber}</p>
                    <p className="mt-1 text-sm text-ink-500">{[formatOrderDate(order.createdAt), orderStatusText(order.paymentStatus, order.orderStatus)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-price">{formatBRL(order.totalCents)}</p>
                </div>
                {order.items.length > 0 ? <p className="mt-3 text-sm leading-6 text-ink-700">{orderItemsText(order.items)}</p> : null}
                <p className="mt-3 text-sm text-magenta-600">Ver pedido</p>
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
    <main className="store-wrap py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-blush-200 bg-white p-5 shadow-sm sm:p-8">
        <h1 className="script-title text-4xl sm:text-6xl">{title}</h1>
        <p className="mt-2 mb-6 text-sm text-ink-500">{subtitle}</p>
        {children}
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
