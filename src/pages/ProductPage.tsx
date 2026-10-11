import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import ProductImage from '../component/products/ProductImage';
import Reviews, { Stars } from '../component/products/Reviews';
import ReportButton from '../component/products/ReportButton';

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
  const [activeIndex, setActiveIndex] = useState(0);

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
  const inStock = product.stock > 0;
  const hasOldPrice =
    product.old_price !== null && product.old_price > product.price;
  const activeImage = product.images[activeIndex] ?? product.images[0];

  return (
    <>
      <section className="product-details">
        <div>
          <div className="product-details-image">
            {activeImage ? (
              <img src={activeImage.url} alt={product.name} />
            ) : (
              <ProductImage product={product} />
            )}
          </div>

          {product.images.length > 1 && (
            <div className="product-thumbs">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={`product-thumb ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Фото ${index + 1}`}
                >
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="product-category">{product.category?.name}</p>
          <h1>{product.name}</h1>

          <p className="product-rating">
            {product.reviews_count > 0 ? (
              <>
                <Stars value={product.rating_avg} />
                <span>
                  {product.rating_avg.toFixed(1)} · {product.reviews_count}
                </span>
              </>
            ) : (
              <span className="product-meta">Пока без оценок</span>
            )}
          </p>

          <p className="product-meta">
            {product.brand && <span>Бренд: {product.brand} · </span>}
            <span>Артикул: {product.sku}</span>
          </p>

          <p>{product.description}</p>

          <p className="product-price">
            {product.price.toLocaleString('ru-RU')} ₽
            {hasOldPrice && (
              <s className="old-price">
                {product.old_price!.toLocaleString('ru-RU')} ₽
              </s>
            )}
          </p>

          <p className="product-meta">
            {inStock ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
          </p>

          {product.seller && (
            <p className="product-meta">
              Продавец: {product.seller.shop_name || product.seller.name}
            </p>
          )}

          <div className="product-actions">
            {inCart ? (
              <Link className="primary-button" to="/cart">
                В корзине · перейти
              </Link>
            ) : (
              <button
                className="primary-button"
                disabled={!inStock}
                onClick={() => addToCart(product.id)}
              >
                {inStock ? 'В корзину' : 'Нет в наличии'}
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
            <ReportButton productId={product.id} />
        </div>
      </section>

      <Reviews productId={product.id} />
    </>
  );
}

export default ProductPage;