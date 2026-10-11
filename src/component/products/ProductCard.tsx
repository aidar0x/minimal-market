import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Product } from '../../data/products';
import { useShop } from '../../context/ShopContext';
import ProductImage from './ProductImage';
import { Stars } from './Reviews';

type ProductCardProps = {
  product: Product;
};

function ProductCard({ product }: ProductCardProps) {
  const { isFavorite, toggleFavorite, isInCart, addToCart } = useShop();

  const favorite = isFavorite(product.id);
  const inCart = isInCart(product.id);
  const outOfStock = product.stock === 0;

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-link">
        <div className="product-image">
          <ProductImage product={product} />
        </div>

        <p className="product-category">{product.category?.name}</p>

        <h3>{product.name}</h3>
        
        {product.reviews_count > 0 && (
          <p className="product-rating">
            <Stars value={product.rating_avg} size={14} />
            <span>
              {product.rating_avg.toFixed(1)} ({product.reviews_count})
            </span>
          </p>
        )}

        <p className="product-price">
          {product.price.toLocaleString('ru-RU')} ₽
          {product.old_price !== null && product.old_price > product.price && (
            <s className="old-price">
              {product.old_price.toLocaleString('ru-RU')} ₽
            </s>
          )}
        </p>
      </Link>

      <button
        className={`favorite-button ${favorite ? 'active' : ''}`}
        onClick={() => toggleFavorite(product.id)}
        aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
      >
        <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
      </button>

      {inCart ? (
        <Link className="card-cart-button in-cart" to="/cart">
          В корзине · перейти
        </Link>
      ) : (
        <button
          className="card-cart-button"
          disabled={outOfStock}
          onClick={() => addToCart(product.id)}
        >
          {outOfStock ? 'Нет в наличии' : 'В корзину'}
        </button>
      )}
    </div>
  );
}

export default ProductCard;