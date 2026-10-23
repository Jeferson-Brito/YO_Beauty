import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet, apiSend } from '../services/api';
import { track } from '../services/analytics';
import type { DataResponse, HomeData, ProductCard, SessionUser } from '../types/catalog';

export type CartLine = {
  id: string;
  slug: string;
  name: string;
  unitPriceCents: number;
  imageUrl: string | null;
  quantity: number;
};

type ShopContextValue = {
  user: SessionUser | null;
  authLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  cart: CartLine[];
  cartCount: number;
  addToCart: (product: ProductCard, quantity?: number) => boolean;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

const ShopContext = createContext<ShopContextValue | null>(null);
const CART_KEY = 'yb_cart';
const FAVORITE_KEY = 'yb_favorites';
const PENDING_CART_KEY = 'yb_pending_cart';

function mergeCart(current: CartLine[], product: ProductCard, quantity: number): CartLine[] {
  const existing = current.find((line) => line.id === product.id);
  if (!existing) {
    track('add_to_cart', { productId: product.id, properties: { quantity } });
    return [
      ...current,
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        unitPriceCents: product.effectivePriceCents,
        imageUrl: product.coverImageUrl,
        quantity,
      },
    ];
  }
  return current.map((line) => {
    if (line.id !== product.id) return line;
    track('add_to_cart', { productId: product.id, properties: { quantity } });
    return { ...line, quantity: line.quantity + quantity };
  });
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ['me'],
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error('Não foi possível consultar a sessão.');
      const body = (await response.json()) as DataResponse<SessionUser>;
      return body.data;
    },
  });
  const [cart, setCart] = useState<CartLine[]>(() => readJson<CartLine[]>(CART_KEY, []));
  const [favorites, setFavorites] = useState<string[]>(() => readJson<string[]>(FAVORITE_KEY, []));

  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem(FAVORITE_KEY, JSON.stringify(favorites)), [favorites]);
  useEffect(() => {
    if (!session.data) return;
    const raw = sessionStorage.getItem(PENDING_CART_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_CART_KEY);
    try {
      const pending = JSON.parse(raw) as { product: ProductCard; quantity?: number };
      if (!pending.product?.inStock || !pending.product.id) return;
      const quantity = Math.max(1, pending.quantity ?? 1);
      setCart((current) => mergeCart(current, pending.product, quantity));
    } catch {
      sessionStorage.removeItem(PENDING_CART_KEY);
    }
  }, [session.data]);

  const value = useMemo<ShopContextValue>(() => {
    const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
    return {
      user: session.data ?? null,
      authLoading: session.isLoading,
      refreshUser: async () => {
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      },
      logout: async () => {
        await apiSend('/api/auth/logout', 'POST');
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      },
      cart,
      cartCount,
      addToCart: (product, quantity = 1) => {
        if (!product.inStock) return false;
        if (session.isLoading) return false;
        if (!session.data) {
          const path = `${window.location.pathname}${window.location.search}`;
          if (!path.startsWith('/login') && !path.startsWith('/cadastro')) {
            sessionStorage.setItem(PENDING_CART_KEY, JSON.stringify({ product, quantity }));
            window.location.assign(`/login?next=${encodeURIComponent(path)}`);
          }
          return false;
        }
        setCart((current) => mergeCart(current, product, quantity));
        return true;
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) track('remove_from_cart', { productId: id, properties: { quantity: 1 } });
        setCart((current) =>
          quantity <= 0 ? current.filter((line) => line.id !== id) : current.map((line) => (line.id === id ? { ...line, quantity } : line)),
        );
      },
      removeFromCart: (id) => {
        track('remove_from_cart', { productId: id, properties: { quantity: 1 } });
        setCart((current) => current.filter((line) => line.id !== id));
      },
      clearCart: () => setCart([]),
      favorites,
      toggleFavorite: (id) => {
        setFavorites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
      },
      isFavorite: (id) => favorites.includes(id),
    };
  }, [cart, favorites, queryClient, session.data, session.isLoading]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop precisa estar dentro do ShopProvider.');
  return context;
}

export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () => apiGet<DataResponse<HomeData>>('/api/home'),
    staleTime: 30_000,
  });
}
