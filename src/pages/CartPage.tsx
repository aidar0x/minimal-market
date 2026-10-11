import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import ProductImage from '../component/products/ProductImage';

function CartPage() {
  const {
    allProducts: products,
    loading,
    cartItems,
    changeQuantity,
    removeFromCart,
    clearCart,
  } = useShop();

  if (loading) {
    return (
      <section className="simple-page">
        <p>Загружаем...</p>
      </section>
    );
  }

  // Соединяем id из корзины с реальными товарами
  const rows = cartItems
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { product, quantity: item.quantity } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const total = rows.reduce(
    (sum, row) => sum + row.product.price * row.quantity,
    0
  );

  return (
    <section className="catalog">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ВАШИ ПОКУПКИ</p>
          <h2>Корзина</h2>
        </div>

        {rows.length > 0 && (
          <button className="text-button" onClick={clearCart}>
            Очистить корзину
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <p>Корзина пуста.</p>
          <Link className="primary-button" to="/">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <ul className="cart-list">
            {rows.map(({ product, quantity }) => (
              <li className="cart-item" key={product.id}>
                <Link
                  to={`/product/${product.id}`}
                  className="cart-item-image"
                >
                  <ProductImage product={product} />
                </Link>

                <div className="cart-item-info">
                  <p className="product-category">{product.category?.name}</p>
                  <h3>{product.name}</h3>
                  <p className="product-price">
                    {product.price.toLocaleString('ru-RU')} ₽
                  </p>
                  {quantity > product.stock && (
                    <p className="form-error">
                      В наличии только {product.stock} шт.
                    </p>
                  )}
                </div>

                <div className="quantity-control">
                  <button
                    onClick={() => changeQuantity(product.id, -1)}
                    aria-label="Уменьшить количество"
                  >
                    <Minus size={15} />
                  </button>

                  <span>{quantity}</span>

                  <button
                    onClick={() => changeQuantity(product.id, 1)}
                    disabled={quantity >= product.stock}
                    aria-label="Увеличить количество"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <button
                  className="icon-button"
                  onClick={() => removeFromCart(product.id)}
                  aria-label="Удалить из корзины"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>

          <aside className="cart-summary">
            <p className="eyebrow">ИТОГО</p>
            <p className="cart-total">
              {total.toLocaleString('ru-RU')} ₽
            </p>
            <Link className="primary-button" to="/checkout">
                 Оформить заказ
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}

export default CartPage;