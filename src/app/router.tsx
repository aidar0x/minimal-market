import { createBrowserRouter } from 'react-router-dom';

import { MainLayout } from '../component/layout/MainLayout';
import RequireAuth from '../component/auth/RequireAuth';
import RequireSeller from '../component/auth/RequireSeller';
import HomePage from '../pages/HomePage';
import ProductPage from '../pages/ProductPage';
import ProfilePage from '../pages/ProfilePage';
import SellPage from '../pages/SellPage';
import FavoritesPage from '../pages/FavoritesPage';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import OrdersPage from '../pages/OrdersPage';
import AuthPage from '../pages/AuthPage';
import NotFoundPage from '../pages/NotFoundPage';
import SellerPage from '../pages/SellerPage';
import RequireAdmin from '../component/auth/RequireAdmin';
import AdminPage from '../pages/AdminPage';


export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'auth', element: <AuthPage /> },
      {
        path: 'checkout',
        element: (
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        ),
      },
      {
        path: 'orders',
        element: (
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: 'sell',
        element: (
          <RequireAuth>
            <RequireSeller>
              <SellPage />
            </RequireSeller>
          </RequireAuth>
        ),
      },
            {
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          </RequireAuth>
        ),
      },
            {
        path: 'seller',
        element: (
          <RequireAuth>
            <RequireSeller>
              <SellerPage />
            </RequireSeller>
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);