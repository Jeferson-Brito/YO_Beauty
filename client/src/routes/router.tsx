import { createBrowserRouter, Navigate } from 'react-router-dom';
import { StoreLayout } from '../components/layout/StoreLayout';
import { AdminLayout, AdminLoginPage } from '../pages/admin/AdminLayout';
import { BannersPage } from '../pages/admin/BannersAdmin';
import { CategoriesPage } from '../pages/admin/CategoriesAdmin';
import { ProductFormPage, ProductListPage } from '../pages/admin/ProductsAdmin';
import { SectionsPage } from '../pages/admin/SectionsAdmin';
import { SettingsPage } from '../pages/admin/SettingsAdmin';
import { DashboardPage } from '../pages/admin/DashboardAdmin';
import { OrdersPage } from '../pages/admin/OrdersAdmin';
import { CartPage, FavoritesPage } from '../pages/CartPage';
import { AccountPage, LoginPage, RegisterPage } from '../pages/AuthPages';
import { CheckoutPage, OrderPage } from '../pages/CheckoutPage';
import { CatalogPage, CategoryPage, ProductPage, ShelfPage } from '../pages/CatalogPage';
import { ContentPage } from '../pages/ContentPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/admin/entrar', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'produtos', element: <ProductListPage /> },
      { path: 'produtos/novo', element: <ProductFormPage /> },
      { path: 'produtos/:id', element: <ProductFormPage /> },
      { path: 'categorias', element: <CategoriesPage /> },
      { path: 'secoes', element: <SectionsPage /> },
      { path: 'banners', element: <BannersPage /> },
      { path: 'pedidos', element: <OrdersPage /> },
      { path: 'indicadores', element: <Navigate to="/admin" replace /> },
      { path: 'configuracoes', element: <SettingsPage /> },
    ],
  },
  {
    element: <StoreLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/produtos', element: <CatalogPage /> },
      { path: '/lancamentos', element: <ShelfPage title="Lançamentos" description="Novidades marcadas como lançamento no cadastro do produto." collection="new" /> },
      { path: '/ofertas', element: <ShelfPage title="Ofertas" description="Produtos que estão com preço promocional." collection="sale" /> },
      { path: '/categoria/:slug', element: <CategoryPage /> },
      { path: '/produto/:slug', element: <ProductPage /> },
      { path: '/carrinho', element: <CartPage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/pedido/:id', element: <OrderPage /> },
      { path: '/favoritos', element: <FavoritesPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterPage /> },
      { path: '/minha-conta', element: <AccountPage /> },
      { path: '/pagina/:slug', element: <ContentPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
