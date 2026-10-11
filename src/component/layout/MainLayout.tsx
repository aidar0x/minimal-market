
import { Outlet } from 'react-router-dom';
import Header from './Header';

export function MainLayout() {
  return (
    <div className="app">
      <Header />

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <span className="logo">
          minimal<span>market</span>
        </span>

        <p>© 2026 Minimal Market</p>
      </footer>
    </div>
  );
}

