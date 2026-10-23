import { useQuery } from '@tanstack/react-query';
import { Banknote, ChevronDown, CreditCard, Heart, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandArt } from '../visuals/BrandArt';
import { useHome, useShop } from '../../context/ShopContext';
import { configureAnalytics, denyConsent, grantConsent, readConsent, track } from '../../services/analytics';
import { apiGet } from '../../services/api';
import type { ListResponse, ProductCard, StoreSettings } from '../../types/catalog';
import { formatBRL, whatsappHref } from '../../utils/money';
import { enabledPaymentMethods } from '../../utils/order-whatsapp';
export function StoreLayout() {
  const home = useHome();
  const location = useLocation();
  const [reviewingConsent, setReviewingConsent] = useState(false);
  const [consentVersion, setConsentVersion] = useState(0);
  const loadedStore = home.data?.data.store;
  useEffect(() => {
    if (!loadedStore) return;
    configureAnalytics(loadedStore);
    track('page_view', { path: location.pathname });
  }, [location.pathname, loadedStore]);

  if (home.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-header">
        <img src="/brand/logo-transparente.png" alt="Yo Beauty" className="h-28 w-28 object-contain" />
      </div>
    );
  }
  if (home.isError || !home.data) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <p>Não foi possível carregar a loja. Verifique se a API está em execução.</p>
      </div>
    );
  }

  const { store, menuCategories } = home.data.data;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="sticky top-0 z-30 shadow-sm" style={{ overflowAnchor: 'none' }}>
        <SiteHeader categories={menuCategories} />
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter store={store} onReviewConsent={() => setReviewingConsent(true)} />
      {store.analyticsEnabled && (reviewingConsent || (consentVersion >= 0 && readConsent() === null)) ? (
        <ConsentBanner
          onAllow={() => {
            grantConsent();
            setReviewingConsent(false);
            setConsentVersion((value) => value + 1);
          }}
          onDeny={() => {
            denyConsent();
            setReviewingConsent(false);
            setConsentVersion((value) => value + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function SiteHeader({ categories }: { categories: { name: string; slug: string }[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, user } = useShop();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const compact = scrolled || location.pathname !== '/';
  const categoryLinks = categories.filter((category) => category.slug !== 'lancamentos' && category.slug !== 'promocoes');
  const onCategoryPage = categoryLinks.some((category) => location.pathname === `/categoria/${category.slug}`);
  const query = term.trim();
  const suggestions = useQuery({
    queryKey: ['search-suggest', debounced],
    enabled: suggestOpen && debounced.length > 0,
    queryFn: () => apiGet<ListResponse<ProductCard>>(`/api/products?pageSize=8&sort=name&q=${encodeURIComponent(debounced)}`),
  });

  useEffect(() => {
    let compactNow = window.scrollY > 160;
    const onScroll = () => {
      const y = window.scrollY;
      const next = compactNow ? y > 48 : y > 160;
      if (next === compactNow) return;
      compactNow = next;
      setScrolled(next);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const apply = () => document.documentElement.style.setProperty('--store-header-offset', `${node.offsetHeight + 16}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setTerm(new URLSearchParams(location.search).get('q') ?? '');
    setSuggestOpen(false);
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!formRef.current?.contains(event.target as Node)) setSuggestOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    setSuggestOpen(false);
    setOpen(false);
    navigate(query ? `/produtos?q=${encodeURIComponent(query)}` : '/produtos');
  }

  function closeSuggestions() {
    setSuggestOpen(false);
    setOpen(false);
  }

  const current = query === debounced ? suggestions.data : undefined;
  const results = current?.data ?? [];
  const total = current?.meta?.total ?? results.length;
  const waiting = query.length > 0 && (query !== debounced || suggestions.isFetching);

  return (
    <header ref={headerRef} className="bg-header">
      <div className={`store-wrap grid grid-cols-[auto_1fr_auto] items-center lg:grid-cols-[1fr_auto_1fr] ${compact ? 'gap-3 py-2' : 'gap-4 py-4'}`}>
        <button type="button" className="text-ink-700 transition hover:text-magenta-600 lg:hidden" aria-label="Abrir menu" onClick={() => setOpen(true)}>
          <Menu />
        </button>
        <form ref={formRef} onSubmit={search} className={`relative col-span-3 lg:col-span-1 lg:col-start-1 ${suggestOpen ? 'z-20' : ''}`}>
          <label className="relative block">
            <span className="sr-only">Buscar produtos</span>
            <button type="submit" className="absolute top-1/2 left-3 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-500 transition hover:text-magenta-600" aria-label="Pesquisar">
              <Search size={16} />
            </button>
            <input
              value={term}
              role="combobox"
              aria-expanded={suggestOpen && query.length > 0}
              aria-controls="search-suggestions"
              aria-autocomplete="list"
              onChange={(event) => {
                const value = event.target.value;
                setTerm(value);
                setSuggestOpen(value.trim().length > 0);
              }}
              onFocus={() => {
                if (query.length > 0) setSuggestOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSuggestOpen(false);
              }}
              placeholder="O que você procura?"
              className={`w-full rounded-full border border-blush-200 bg-white pr-4 pl-11 text-sm outline-none placeholder:text-ink-500 focus:border-magenta-400 lg:max-w-xs ${compact ? 'py-2' : 'py-2.5'}`}
            />
          </label>
          {suggestOpen && query.length > 0 ? (
            <div id="search-suggestions" className="absolute top-full left-0 z-40 mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-blush-200 bg-white shadow-lg">
              {waiting && results.length === 0 ? <p className="px-4 py-3 text-sm text-ink-500">Buscando...</p> : null}
              {!waiting && results.length === 0 ? <p className="px-4 py-3 text-sm text-ink-500">Nenhum produto encontrado.</p> : null}
              <ul>
                {results.map((product) => {
                  const category = product.categories.find((item) => item.isPrimary) ?? product.categories[0];
                  return (
                    <li key={product.id}>
                      <Link
                        to={`/produto/${product.slug}`}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-ink-900 transition hover:bg-blush-50"
                        onClick={closeSuggestions}
                      >
                        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-blush-50">
                          <BrandArt slug={category?.slug} label={product.name} imageUrl={product.coverImageUrl} alt="" fit="contain" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{product.name}</span>
                        <span className="shrink-0 text-xs font-semibold text-magenta-700">{formatBRL(product.effectivePriceCents)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button type="submit" className="w-full border-t border-blush-200 px-4 py-3 text-left text-sm font-semibold text-magenta-700 transition hover:bg-blush-50">
                Pesquisar “{query}”{total > results.length ? ` · ${total} produtos` : ''}
              </button>
            </div>
          ) : null}
        </form>
        <Link to="/" className="col-start-2 row-start-1 justify-self-center transition duration-200 hover:opacity-75 lg:col-start-2">
          <img
            src="/brand/logo-horizontal.png"
            alt="Yo Beauty"
            className="h-auto w-[132px] object-contain sm:w-[156px] lg:w-[180px]"
          />
        </Link>
        <div className={`col-start-3 row-start-1 flex items-center justify-end text-ink-700 ${compact ? 'gap-4' : 'gap-5'}`}>
          <Link to={user ? '/minha-conta' : '/login'} aria-label="Minha conta" className="hidden text-center transition hover:text-magenta-600 sm:block">
            <UserRound className="mx-auto" size={22} />
            <span className={compact ? 'sr-only' : 'mt-1 block text-[11px] leading-tight'}>{user ? user.name.split(' ')[0] : 'Entrar'}</span>
            <span className={compact ? 'sr-only' : 'block text-[11px] leading-tight text-ink-500'}>Minha conta</span>
          </Link>
          <Link to="/favoritos" aria-label="Favoritos" className="hidden text-center transition hover:text-magenta-600 sm:block">
            <Heart className="mx-auto" size={22} />
            <span className={compact ? 'sr-only' : 'mt-1 block text-[11px]'}>Favoritos</span>
          </Link>
          <Link to="/carrinho" aria-label={`Meu carrinho, ${cartCount} itens`} className="relative text-center transition hover:text-magenta-600">
            <ShoppingBag className="mx-auto" size={22} />
            <span className="absolute -top-2 right-0 grid h-5 min-w-5 translate-x-1/3 place-items-center rounded-full bg-magenta-500 px-1 text-[10px] font-semibold text-white">
              {cartCount}
            </span>
            <span className={compact ? 'sr-only' : 'mt-1 hidden text-[11px] sm:block'}>Meu carrinho</span>
          </Link>
        </div>
      </div>
      <nav className={`store-wrap hidden items-start justify-center lg:flex ${compact ? 'gap-x-6 gap-y-2 pb-2' : 'gap-x-8 gap-y-3 pb-4'}`} aria-label="Categorias">
        <NavLink to="/" end className="nav-link inline-flex h-5 items-center leading-none">
          Início
        </NavLink>
        <div className="group relative flex">
          <span className="nav-link inline-flex h-5 items-center gap-1 leading-none group-hover:text-magenta-600" aria-haspopup="true" aria-current={onCategoryPage ? 'page' : undefined}>
            <span className="underline-offset-[6px] group-hover:underline">Categorias</span>
            <ChevronDown size={14} strokeWidth={2.25} aria-hidden className="transition-transform duration-200 group-hover:rotate-180" />
          </span>
          <div className="pointer-events-none invisible absolute top-full left-1/2 z-40 w-56 -translate-x-1/2 pt-3 group-hover:pointer-events-auto group-hover:visible">
            <ul className="overflow-hidden rounded-2xl bg-white py-1 shadow-lg ring-1 ring-blush-100">
              {categoryLinks.map((category) => (
                <li key={category.slug}>
                  <Link
                    to={`/categoria/${category.slug}`}
                    className="block px-4 py-2.5 text-sm tracking-wide text-ink-900 transition hover:bg-blush-50 hover:text-magenta-600"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <NavLink to="/lancamentos" className="nav-link inline-flex h-5 items-center leading-none">
          Lançamentos
        </NavLink>
        <span className="cursor-default text-center text-[13px] font-medium tracking-[0.14em] text-ink-500/60 uppercase">
          <span className="inline-flex h-5 items-center leading-none">Cupons</span>
          <span className="mt-0.5 block text-[10px] font-normal tracking-normal text-ink-500 normal-case">em breve</span>
        </span>
        <NavLink to="/ofertas" className="nav-link inline-flex h-5 items-center leading-none">
          Ofertas
        </NavLink>
      </nav>
      {open ? (
        <div className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-72 bg-header p-6" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="transition hover:text-magenta-600" aria-label="Fechar menu" onClick={() => setOpen(false)}>
              <X />
            </button>
            <div className="mt-6 flex flex-col gap-4">
              <NavLink to="/" end className="nav-link" onClick={() => setOpen(false)}>
                Início
              </NavLink>
              <span className="nav-link">Categorias</span>
              {categoryLinks.map((category) => (
                <Link key={category.slug} to={`/categoria/${category.slug}`} className="pl-3 text-sm text-ink-700 transition hover:text-magenta-600" onClick={() => setOpen(false)}>
                  {category.name}
                </Link>
              ))}
              <NavLink to="/lancamentos" className="nav-link" onClick={() => setOpen(false)}>
                Lançamentos
              </NavLink>
              <span className="text-sm font-medium tracking-[0.14em] text-ink-500/60 uppercase">
                Cupons
                <span className="mt-0.5 block text-[10px] font-normal tracking-normal text-ink-500 normal-case">em breve</span>
              </span>
              <NavLink to="/ofertas" className="nav-link" onClick={() => setOpen(false)}>
                Ofertas
              </NavLink>
              <Link to={user ? '/minha-conta' : '/login'} className="text-link" onClick={() => setOpen(false)}>
                Minha conta
              </Link>
              <Link to="/favoritos" className="text-link" onClick={() => setOpen(false)}>
                Favoritos
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

const paymentIcons = {
  cash: Banknote,
  pix: PixIcon,
  credit: CreditCard,
  debit: CreditCard,
};

function SiteFooter({ store, onReviewConsent }: { store: StoreSettings; onReviewConsent: () => void }) {
  const payments = enabledPaymentMethods(store.paymentMethods);

  return (
    <footer className="mt-8 bg-magenta-600 text-white">
      <div className="store-wrap grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src="/brand/logo-horizontal-branco.png" alt="Yo Beauty" className="h-auto w-full max-w-[240px]" />
        </div>
        <div>
          <h2 className="text-sm tracking-[0.16em]">INSTITUCIONAL</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/90">
            <li><Link to="/pagina/sobre" className="transition hover:text-white hover:underline">Sobre nós</Link></li>
            <li><Link to="/pagina/privacidade" className="transition hover:text-white hover:underline">Política de privacidade</Link></li>
            <li><Link to="/pagina/termos" className="transition hover:text-white hover:underline">Termos de uso</Link></li>
            <li><Link to="/pagina/contato" className="transition hover:text-white hover:underline">Fale conosco</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm tracking-[0.16em]">ATENDIMENTO</h2>
          <div className="mt-4 space-y-2 text-sm text-white/90">
            {store.contactPhone ? <p>{store.contactPhone}</p> : null}
            {store.contactEmail ? <p>{store.contactEmail}</p> : null}
            <p>{store.businessHours}</p>
          </div>
        </div>
        <div>
          <h2 className="text-sm tracking-[0.16em]">FORMAS DE PAGAMENTO</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {payments.map((method) => {
              const Icon = paymentIcons[method.id];
              return (
                <li key={method.id} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-magenta-700 shadow-sm">
                  <Icon size={18} aria-hidden="true" />
                  <span className="text-xs font-semibold tracking-wide">{method.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="store-wrap flex flex-col items-center justify-between gap-4 py-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm">♥ {store.footerNote}</p>
            <p className="text-xs text-white/80">Site desenvolvido pela Brisoft.</p>
            {store.analyticsEnabled ? (
              <button type="button" className="mt-1 text-xs text-white/80 underline transition hover:text-white" onClick={onReviewConsent}>
                Preferências de visita
              </button>
            ) : null}
          </div>
          <SocialRow instagram={store.socialLinks.instagram} whatsapp={whatsappHref(store.whatsappNumber, store.whatsappMessage)} />
        </div>
      </div>
    </footer>
  );
}

function SocialRow({ instagram, whatsapp }: { instagram?: string; whatsapp: string | null }) {
  const className = 'grid h-9 w-9 place-items-center rounded-full border border-white/40 transition hover:border-white hover:bg-white hover:text-magenta-600';
  const items = [
    { label: 'Instagram', href: instagram, icon: <InstagramIcon /> },
    { label: 'WhatsApp', href: whatsapp, icon: <WhatsAppIcon /> },
  ];
  return (
    <div className="flex gap-3">
      {items.map((item) => item.href ? (
        <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} className={className}>
          {item.icon}
        </a>
      ) : (
        <span key={item.label} aria-label={item.label} title={item.label} className={className}>
          {item.icon}
        </span>
      ))}
    </div>
  );
}

function ConsentBanner({ onAllow, onDeny }: { onAllow: () => void; onDeny: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blush-200 bg-white p-4 shadow-lg">
      <div className="store-wrap flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-ink-700">
          A Yo Beauty pode registrar uma visita anônima neste navegador para saber o que é mais visto. Isso não identifica você e pode ser recusado.
        </p>
        <div className="flex gap-2">
          <button type="button" className="rounded-full border border-blush-200 px-4 py-2 text-sm" onClick={onDeny}>Agora não</button>
          <button type="button" className="rounded-full bg-magenta-600 px-4 py-2 text-sm text-white" onClick={onAllow}>Permitir visitas</button>
        </div>
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 4a8 8 0 0 0-6.9 12L4 20l4.1-1.1A8 8 0 1 0 12.04 4Zm4.6 11.3c-.2.5-1.1.9-1.5 1-.4.1-.9.1-1.4-.1-.3-.1-.7-.2-1.2-.5-2.1-1.1-3.5-3.2-3.6-3.4-.1-.2-.9-1.2-.9-2.3s.6-1.6.8-1.8.4-.3.6-.3h.4c.1 0 .3 0 .4.3.2.5.6 1.6.6 1.7.1.1 0 .3 0 .4l-.3.4c-.1.1-.2.3-.1.4.1.2.5.9 1.1 1.4.8.7 1.4.9 1.6 1 .2.1.3.1.4 0l.5-.6c.1-.2.3-.1.5-.1l1.1.5c.2.1.3.2.4.3.1.3 0 .7-.2 1.2Z" />
    </svg>
  );
}

function PixIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.2 14.4 7.1 12 9.2 9.6 7.1 12 3.2Zm6.8 6.4 1.8 2.4-1.8 2.4-2.4-1.8 2.4-3Zm-13.6 0 2.4 1.8-2.4 1.8L3.8 12l1.4-2.4ZM12 14.8l2.4 1.9L12 20.8 9.6 16.7 12 14.8Z" />
    </svg>
  );
}
