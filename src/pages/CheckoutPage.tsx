import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { PriceChangedError, createOrder } from '../lib/orders';

function CheckoutPage() {
  const { allProducts: products, cartItems, loading, refresh } = useShop();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // При открытии подтягиваем свежие цены и остатки
  useEffect(() => {
    refresh();
  }, []);

  if (loading) {
    return (
      <section className="simple-page">
        <p>Загружаем...</p>
      </section>
    );
  }

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

  const hasStockProblem = rows.some((row) => row.quantity > row.product.stock);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (address.trim().length < 5) {
      setError('Укажите адрес доставки.');
      return;
    }

    if (phone.replace(/\D/g, '').length < 10) {
      setError('Укажите корректный номер телефона.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await createOrder(address.trim(), phone.trim(), total);
      refresh();
      navigate('/orders');
    } catch (e) {
      refresh();
      if (e instanceof PriceChangedError) {
        setError(
          `Цены изменились. Новая сумма: ${e.newTotal.toLocaleString('ru-RU')} ₽. Проверьте и подтвердите заказ ещё раз.`
        );
      } else {
        setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
      }
      setSubmitting(false);
    }
  };

  if (rows.length === 0) {
    return (
      <section className="simple-page">
        <h1>Оформление заказа</h1>
        <p>Корзина пуста.</p>
        <Link className="primary-button" to="/">
          Перейти в каталог
        </Link>
      </section>
    );
  }

  return (
    <section className="catalog">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ПОСЛЕДНИЙ ШАГ</p>
          <h2>Оформление заказа</h2>
        </div>
        <Link className="text-button" to="/cart">
          ← Назад в корзину
        </Link>
      </div>

      <div className="cart-layout">
        <ul className="cart-list">
          {rows.map(({ product, quantity }) => (
            <li className="checkout-row" key={product.id}>
              <span>
                {product.name} × {quantity}
              </span>
              <strong>
                {(product.price * quantity).toLocaleString('ru-RU')} ₽
              </strong>
            </li>
          ))}
        </ul>

        <form className="cart-summary sell-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Адрес доставки</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Город, улица, дом, квартира"
            />
          </label>

          <label className="form-field">
            <span>Телефон</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 900 000-00-00"
            />
          </label>

          <p className="eyebrow">ИТОГО</p>
          <p className="cart-total">{total.toLocaleString('ru-RU')} ₽</p>

          {hasStockProblem && (
            <p className="form-error">
              Для некоторых товаров в корзине больше, чем есть в наличии.
              Вернитесь в корзину и уменьшите количество.
            </p>
          )}

          {error && <p className="form-error">{error}</p>}

          <button
            className="primary-button"
            type="submit"
            disabled={submitting || hasStockProblem}
          >
            {submitting ? 'Оформляем...' : 'Подтвердить заказ'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default CheckoutPage;