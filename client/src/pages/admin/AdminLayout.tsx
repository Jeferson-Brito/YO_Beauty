import { BarChart3, ClipboardList, ImageIcon, LayoutGrid, LogOut, Menu, MessageCircle, Package, Settings, Store, Tags, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { ApiError, apiSend } from '../../services/api';
import type { DataResponse, SessionUser } from '../../types/catalog';

type AdminLink = {
  to: string;
  label: string;
  hint: string;
  icon: typeof Package;
  end: boolean;
};

const indicatorsLink: AdminLink = { to: '/admin', label: 'Indicadores', hint: 'Vendas e visitas', icon: BarChart3, end: true };
const ordersLink: AdminLink = { to: '/admin/pedidos', label: 'Pedidos', hint: 'Acompanhar e cancelar', icon: ClipboardList, end: false };

const groups: { label: string; links: AdminLink[] }[] = [
  {
    label: 'Catálogo',
    links: [
      { to: '/admin/produtos', label: 'Produtos', hint: 'Preço, estoque e fotos', icon: Package, end: false },
      { to: '/admin/categorias', label: 'Categorias', hint: 'Menu e página inicial', icon: Tags, end: false },
      { to: '/admin/secoes', label: 'Seções', hint: 'Faixas da página inicial', icon: LayoutGrid, end: false },
      { to: '/admin/banners', label: 'Banners', hint: 'Destaques visuais', icon: ImageIcon, end: false },
    ],
  },
  {
    label: 'Loja',
    links: [
      { to: '/admin/configuracoes', label: 'Configurações', hint: 'Textos, redes e páginas', icon: Settings, end: false },
    ],
  },
];

function SideLink({ link, onNavigate }: { link: AdminLink; onNavigate: () => void }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-2.5 py-2 transition ${isActive ? 'bg-magenta-600 text-white shadow-sm' : 'text-ink-700 hover:bg-blush-100'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isActive ? 'bg-white/15' : 'bg-blush-50 text-magenta-600'}`}>
            <link.icon size={18} />
          </span>
          <span>
            <span className="block text-sm font-medium">{link.label}</span>
            <span className={`block text-xs ${isActive ? 'text-white/80' : 'text-ink-500'}`}>{link.hint}</span>
          </span>
        </>
      )}
    </NavLink>
  );
}

function SoonLink({ label, icon: Icon }: { label: string; icon: typeof Package }) {
  return (
    <div className="flex cursor-default items-center gap-3 rounded-2xl px-2.5 py-2 text-zinc-400" aria-disabled="true">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100">
        <Icon size={18} />
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs">em breve</span>
      </span>
    </div>
  );
}

export function AdminLayout() {
  const { user, authLoading, logout } = useShop();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  if (authLoading) return <main className="p-10 text-ink-500">Carregando painel...</main>;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/admin/entrar" replace />;

  const initial = user.name.trim().charAt(0).toUpperCase() || 'Y';

  return (
    <div className="min-h-screen bg-blush-50 text-ink-900">
      {menuOpen ? <button type="button" className="fixed inset-0 z-30 bg-ink-900/30 lg:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} /> : null}
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-blush-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
            <NavLink to="/admin" end onClick={() => setMenuOpen(false)} className="block">
              <img src="/brand/logo-horizontal.png" alt="Yo Beauty" className="h-auto w-[168px]" />
              <span className="mt-2 block text-[11px] tracking-[0.18em] text-ink-500 uppercase">Painel</span>
            </NavLink>
            <button type="button" className="rounded-full p-1 text-ink-700 hover:bg-blush-100 lg:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
            <div className="space-y-1">
              <SideLink link={indicatorsLink} onNavigate={() => setMenuOpen(false)} />
              <SideLink link={ordersLink} onNavigate={() => setMenuOpen(false)} />
            </div>
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 text-[11px] tracking-[0.16em] text-ink-500 uppercase">{group.label}</p>
                <div className="space-y-1">
                  {group.links.map((link) => (
                    <SideLink key={link.to} link={link} onNavigate={() => setMenuOpen(false)} />
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="px-3 pb-1 text-[11px] tracking-[0.16em] text-ink-500 uppercase">Atendimento</p>
              <SoonLink label="WhatsApp" icon={MessageCircle} />
            </div>
          </nav>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-blush-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <button type="button" className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-ink-700 hover:bg-blush-100 lg:hidden" onClick={() => setMenuOpen((open) => !open)}>
              <Menu size={18} /> Menu
            </button>
            <p className="hidden items-center gap-2 text-sm text-ink-700 lg:inline-flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blush-100 font-medium text-magenta-700">{initial}</span>
              {user.name}
            </p>
            <div className="flex items-center gap-1">
              <a href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-magenta-700 transition hover:bg-blush-100">
                <Store size={16} /> Ver loja
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-700 transition hover:bg-blush-100"
                onClick={async () => {
                  await logout();
                  navigate('/admin/entrar');
                }}
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          </header>
          <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminLoginPage() {
  const { user, authLoading, refreshUser } = useShop();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (authLoading) return <main className="p-10">Carregando...</main>;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const response = await apiSend<DataResponse<SessionUser>>('/api/auth/login', 'POST', { email, password });
      await refreshUser();
      if (response.data.role !== 'ADMIN') {
        setError('Esta conta não administra a loja.');
        return;
      }
      navigate('/admin');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível entrar.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-blush-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-blush-200 bg-white p-8 shadow-sm">
        <img src="/brand/logo-horizontal.png" alt="Yo Beauty" className="h-auto w-[200px]" />
        <h1 className="mt-4 font-display text-3xl text-magenta-700">Entrar no painel</h1>
        <p className="mt-1 mb-6 text-sm text-ink-500">Use a conta de administradora criada no computador da loja.</p>
        <label className="block text-sm">
          E-mail
          <input className="field mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="mt-4 block text-sm">
          Senha
          <input className="field mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="mt-3 text-sm text-magenta-700">{error}</p> : null}
        {user ? (
          <p className="mt-3 text-sm text-ink-500">Você está em uma conta de cliente. Entre com a conta administrativa para abrir o painel.</p>
        ) : null}
        <button type="submit" className="btn-cart mt-6" disabled={pending}>
          Entrar
        </button>
      </form>
    </main>
  );
}
