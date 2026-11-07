import { ArrowLeft, ArrowUpRight, BarChart3, ChevronRight, ClipboardList, ImageIcon, LayoutGrid, LogOut, Menu, Package, Settings, Store, Tags, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AutoPrintOrders } from '../../components/admin/AutoPrintOrders';
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
        `admin-side-link flex items-center gap-3 rounded-xl px-3 py-2 transition ${isActive ? 'admin-side-active' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${isActive ? 'bg-white/15 text-gold-300' : 'bg-white/5 text-white/65'}`}>
            <link.icon size={18} />
          </span>
          <span>
            <span className="block text-xs font-medium">{link.label}</span>
            <span className={`mt-0.5 block text-[10px] ${isActive ? 'text-white/65' : 'text-white/45'}`}>{link.hint}</span>
          </span>
        </>
      )}
    </NavLink>
  );
}

export function AdminLayout() {
  const { user, authLoading, logout } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitError, setExitError] = useState('');
  const menuRef = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    menuRef.current?.querySelector('button')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key !== 'Tab') return;
      const items = menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); menuTrigger.current?.focus(); };
  }, [menuOpen]);
  if (authLoading) return <main className="grid min-h-screen place-items-center bg-blush-50 text-sm text-ink-500" role="status">Preparando seu painel...</main>;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/admin/entrar" replace />;
  const initial = user.name.trim().charAt(0).toUpperCase() || 'Y';
  const links = [indicatorsLink, ordersLink, ...groups.flatMap(group => group.links)];
  const current = links.find(link => link.end ? location.pathname === link.to : location.pathname.startsWith(link.to));

  return (
    <div className="admin-shell min-h-screen text-ink-900">
      <a href="#admin-content" className="admin-skip-link">Ir para o conteúdo</a>
      {menuOpen ? <button type="button" className="fixed inset-0 z-30 bg-ink-900/40 backdrop-blur-sm lg:hidden" aria-label="Fechar menu de navegação" onClick={() => setMenuOpen(false)} /> : null}
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[256px_minmax(0,1fr)]">
        <aside ref={menuRef} id="admin-navigation" role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen || undefined} aria-label="Menu administrativo" className={`admin-sidebar fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:visible ${menuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}>
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5">
            <NavLink to="/admin" end onClick={() => setMenuOpen(false)} className="block">
              <img src="/brand/logo-horizontal-branco.png" alt="Yo Beauty" className="h-auto w-[156px]" />
              <span className="mt-3 block text-[9px] tracking-[0.25em] text-white/45 uppercase">Gestão da loja</span>
            </NavLink>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10 lg:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
          </div>
          <nav aria-label="Administração" className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
            <div><p className="admin-nav-heading">Visão geral</p><div className="space-y-1"><SideLink link={indicatorsLink} onNavigate={() => setMenuOpen(false)} /><SideLink link={ordersLink} onNavigate={() => setMenuOpen(false)} /></div></div>
            {groups.map(group => <div key={group.label}><p className="admin-nav-heading">{group.label}</p><div className="space-y-1">{group.links.map(link => <SideLink key={link.to} link={link} onNavigate={() => setMenuOpen(false)} />)}</div></div>)}
          </nav>
          <div className="mx-4 mb-5 border-t border-white/10 pt-5"><div className="flex items-center gap-3 px-2"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-300 text-sm font-semibold text-magenta-900">{initial}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{user.name}</p><p className="mt-1 text-[10px] text-white/45">Administração</p></div></div></div>
        </aside>
        <div className="min-w-0">
          <header className="admin-topbar sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 px-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button ref={menuTrigger} type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blush-200 bg-white lg:hidden" aria-label="Abrir menu do painel" aria-controls="admin-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><Menu size={19} /></button>
              <div className="min-w-0"><p className="hidden text-[10px] tracking-[.12em] text-ink-500 uppercase sm:block">Seu espaço de gestão</p><p className="mt-1 flex items-center gap-2 truncate text-sm font-medium"><span className="hidden text-ink-500 sm:inline">Painel</span><ChevronRight size={13} className="hidden text-ink-500 sm:block" />{current?.label ?? 'Loja'}</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a href="/" className="admin-view-store"><Store size={16} /><span className="hidden sm:inline">Ver loja</span><ArrowUpRight size={14} /></a>
              <button type="button" className="admin-exit" aria-label="Sair do painel" onClick={async () => {
                try { await logout(); navigate('/admin/entrar'); } catch { setExitError('Não foi possível sair. Tente novamente.'); }
              }}><LogOut size={17} /><span className="hidden sm:inline">Sair</span></button>
            </div>
          </header>
          <main id="admin-content" className="admin-content mx-auto max-w-[1440px] p-4 sm:p-7 lg:p-9">
            {exitError ? <p role="alert" className="mb-4 text-sm text-magenta-700">{exitError}</p> : null}
            <AutoPrintOrders />
            <div className="page-enter" key={location.pathname}><Outlet /></div>
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
    <main className="admin-login-page grid min-h-screen place-items-center px-4 py-10">
      <form onSubmit={submit} className="admin-login-card w-full max-w-md rounded-[2rem] border border-blush-200 bg-white p-7 sm:p-10">
        <img src="/brand/logo-horizontal.png" alt="Yo Beauty" className="h-auto w-[200px]" />
        <p className="workspace-eyebrow mt-8">Área administrativa</p><h1 className="type-title mt-3 !text-4xl">Sua loja em boas mãos.</h1>
        <p className="mt-1 mb-6 text-sm text-ink-500">Entre com sua conta administrativa para cuidar da loja.</p>
        <label className="block text-sm">
          E-mail
          <input className="field mt-2" autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="mt-4 block text-sm">
          Senha
          <input className="field mt-2" autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="mt-3 text-sm text-magenta-700">{error}</p> : null}
        {user ? (
          <p className="mt-3 text-sm text-ink-500">Você está em uma conta de cliente. Entre com a conta administrativa para abrir o painel.</p>
        ) : null}
        <button type="submit" className="btn-cart mt-6" disabled={pending}>
          {pending ? 'Entrando...' : 'Acessar meu painel'}
        </button>
        <a href="/" className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-500"><ArrowLeft size={14} /> Voltar para a loja</a>
      </form>
    </main>
  );
}
