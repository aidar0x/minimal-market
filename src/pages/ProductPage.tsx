import { Link, useParams } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import ProductImage from '../component/products/ProductImage';

function ProductPage() {
  const { id } = useParams();
  const {
    allProducts: products,
    loading,
    isFavorite,
    toggleFavorite,
    isInCart,
    addToCart,
  } = useShop();

  const product = products.find((item) => item.id === Number(id));

  if (loading) {
    return (
      <section className="simple-page">
        <p>Загружаем товар...</p>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="simple-page">
        <h1>Товар не найден</h1>
        <Link to="/">Вернуться в каталог</Link>
      </section>
    );
  }

  const favorite = isFavorite(product.id);
  const inCart = isInCart(product.id);

  return (
    <section className="product-details">
      <div className="product-details-image">
        <ProductImage product={product} />
      </div>

      <div>
        <p className="product-category">{product.category}</p>
        <h1>{product.name}</h1>
        <p>{product.description}</p>

        <p className="product-price">
          {product.price.toLocaleString('ru-RU')} ₽
        </p>

        <div className="product-actions">
          {inCart ? (
            <Link className="primary-button" to="/cart">
              В корзине · перейти
            </Link>
          ) : (
            <button
              className="primary-button"
              onClick={() => addToCart(product.id)}
            >
              В корзину
            </button>
          )}

          <button
            className={`secondary-button ${favorite ? 'active' : ''}`}
            onClick={() => toggleFavorite(product.id)}
          >
            <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
            {favorite ? 'В избранном' : 'В избранное'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ProductPage;