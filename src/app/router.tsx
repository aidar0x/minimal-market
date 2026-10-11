import { createBrowserRouter } from 'react-router-dom';

import { MainLayout } from '../component/layout/MainLayout';
import RequireAuth from '../component/auth/RequireAuth';
import HomePage from '../pages/HomePage';
import ProductPage from '../pages/ProductPage';
import ProfilePage from '../pages/ProfilePage';
import SellPage from '../pages/SellPage';
import FavoritesPage from '../pages/FavoritesPage';
import CartPage from '../pages/CartPage';
import AuthPage from '../pages/AuthPage';
import NotFoundPage from '../pages/NotFoundPage';

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
            <SellPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);