import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequireSeller({ children }: { children: ReactNode }) {
  const { loading, isSeller } = useAuth();

  if (loading) {
    return <p>Загрузка…</p>;
  }

  if (!isSeller) {
    return (
      <div>
        <h1>Раздел для продавцов</h1>
        <p>
          Продавцами становятся по приглашению администратора. Если вы хотите
          продавать на Minimal Market, свяжитесь с нами.
        </p>
        <Link to="/profile">Вернуться в профиль</Link>
      </div>
    );
  }

  return <>{children}</>;
}