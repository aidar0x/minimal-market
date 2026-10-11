import { Link } from 'react-router-dom';
import ProductCard from '../component/products/ProductCard';
import { useShop } from '../context/ShopContext';

function FavoritesPage() {
  const { allProducts: products, favoriteIds, loading } = useShop();

  if (loading) {
    return (
      <section className="simple-page">
        <p>Загружаем...</p>
      </section>
    );
  }

  const favoriteProducts = products.filter((product) =>
    favoriteIds.includes(product.id)
  );

  return (
    <section className="catalog">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ВАШИ СОХРАНЁННЫЕ ВЕЩИ</p>
          <h2>Избранное</h2>
        </div>

        <span className="product-count">
          {favoriteProducts.length} шт.
        </span>
      </div>

      {favoriteProducts.length === 0 ? (
        <div className="empty-state">
          <p>В избранном пока пусто.</p>
          <Link className="primary-button" to="/">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {favoriteProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

export default FavoritesPage;