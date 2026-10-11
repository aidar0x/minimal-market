import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return <p>Загрузка…</p>;
  }

  if (!isAdmin) {
    return (
      <div>
        <h1>Нет доступа</h1>
        <p>Этот раздел только для администраторов.</p>
        <Link to="/">На главную</Link>
      </div>
    );
  }

  return <>{children}</>;
}