import { Link, useNavigate } from 'react-router-dom';
import { Heart, Package, ShoppingBag, Store, Trash2, Shield } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import ProductImage from '../component/products/ProductImage';

const STATUS_LABELS = {
  active: 'Активен',
  draft: 'Черновик',
  hidden: 'Скрыт',
} as const;

function ProfilePage() {
  const {
    userProducts,
    removeProduct,
    favoritesCount,
    cartCount,
    loading,
  } = useShop();
  const { user, signOut, isSeller, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleRemove = async (id: number, name: string) => {
    if (!window.confirm(`Удалить товар «${name}»?`)) return;

    try {
      await removeProduct(id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <section className="simple-page">
      <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
      <h1>Мой профиль</h1>

      <div className="profile-account">
        <span className="profile-email">{user?.email}</span>
        <button className="text-button" onClick={handleSignOut}>
          Выйти
        </button>
      </div>

      <div className="profile-links">
        {isAdmin && (
          <Link className="profile-link-card" to="/admin">
            <Shield size={20} />
            <span>Админка</span>
          </Link>
        )}

        {isSeller && (
          <Link className="profile-link-card" to="/seller">
            <Store size={20} />
            <span>Кабинет продавца</span>
          </Link>
        )}
        <Link className="profile-link-card" to="/orders">
          <Package size={20} />
          <span>Мои заказы</span>
        </Link>

        <Link className="profile-link-card" to="/favorites">
          <Heart size={20} />
          <span>Избранное</span>
          <strong>{favoritesCount}</strong>
        </Link>

        <Link className="profile-link-card" to="/cart">
          <ShoppingBag size={20} />
          <span>Корзина</span>
          <strong>{cartCount}</strong>
        </Link>
      </div>

      {isSeller && (
        <>
          <div className="profile-section-title">
            <h2>Мои товары</h2>
            <Link className="text-button" to="/sell">
              + Добавить товар
            </Link>
          </div>

          {loading ? (
            <p className="status-message">Загружаем...</p>
          ) : userProducts.length === 0 ? (
            <div className="empty-state">
              <p>Вы пока ничего не выставили на продажу.</p>
              <Link className="primary-button" to="/sell">
                Продать товар
              </Link>
            </div>
          ) : (
            <ul className="cart-list">
              {userProducts.map((product) => (
                <li className="my-product" key={product.id}>
                  <Link
                    to={`/product/${product.id}`}
                    className="cart-item-image"
                  >
                    <ProductImage product={product} />
                  </Link>

                  <div className="cart-item-info">
                    <p className="product-category">
                      {product.category?.name}
                    </p>
                    <h3>{product.name}</h3>
                    <p className="product-price">
                      {product.price.toLocaleString('ru-RU')} ₽
                    </p>
                    <p className="product-meta">
                      Остаток: {product.stock} шт. ·{' '}
                      {STATUS_LABELS[product.status]}
                    </p>
                  </div>

                  <button
                    className="icon-button"
                    onClick={() => handleRemove(product.id, product.name)}
                    aria-label="Удалить товар"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default ProfilePage;