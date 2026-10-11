import { Link, NavLink } from 'react-router-dom';
import { Heart, ShoppingBag, UserRound } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const { favoritesCount, cartCount } = useShop();
  const { user } = useAuth();

  return (
    <header className="header">
      <Link className="logo" to="/">
        minimal<span>market</span>
      </Link>

      <nav className="navigation">
        <NavLink to="/">Каталог</NavLink>
        <NavLink to="/sell">Продать</NavLink>
      </nav>

      <div className="header-actions">
        <Link
          className="icon-button"
          to="/favorites"
          aria-label="Избранное"
        >
          <Heart size={19} />
          {favoritesCount > 0 && (
            <span className="badge">{favoritesCount}</span>
          )}
        </Link>

        <Link className="icon-button" to="/cart" aria-label="Корзина">
          <ShoppingBag size={19} />
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </Link>

        <Link className="profile-button" to={user ? '/profile' : '/auth'}>
          <UserRound size={17} />
          <span>{user ? 'Профиль' : 'Войти'}</span>
        </Link>
      </div>
    </header>
  );
}

export default Header;