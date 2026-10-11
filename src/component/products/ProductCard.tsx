import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Product } from '../../data/products';
import { useShop } from '../../context/ShopContext';
import ProductImage from './ProductImage';

type ProductCardProps = {
  product: Product;
};

function ProductCard({ product }: ProductCardProps) {
  const { isFavorite, toggleFavorite, isInCart, addToCart } = useShop();

  const favorite = isFavorite(product.id);
  const inCart = isInCart(product.id);

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-link">
        <div className="product-image">
          <ProductImage product={product} />
        </div>

        <p className="product-category">{product.category}</p>

        <h3>{product.name}</h3>

        <p className="product-price">
          {product.price.toLocaleString('ru-RU')} ₽
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
          onClick={() => addToCart(product.id)}
        >
          В корзину
        </button>
      )}
    </div>
  );
}

export default ProductCard;