import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import {
  ORDER_STATUS_LABELS,
  cancelOrder,
  fetchOrders,
  payOrder,
} from '../lib/orders';
import type { Order } from '../lib/orders';
import { useAuth } from '../context/AuthContext';

function OrdersPage() {
  const { refresh } = useShop();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      setOrders(await fetchOrders(user.id));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handlePay = async (id: number) => {
    setBusyId(id);
    try {
      await payOrder(id);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setBusyId(null);
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Отменить заказ?')) return;

    setBusyId(id);
    try {
      await cancelOrder(id);
      await load();
      refresh(); // остатки вернулись на склад
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setBusyId(null);
  };

  return (
    <section className="simple-page">
      <p className="eyebrow">ВАШИ ПОКУПКИ</p>
      <h1>Мои заказы</h1>

      {loading ? (
        <p className="status-message">Загружаем...</p>
      ) : error ? (
        <p className="status-message form-error">{error}</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>Заказов пока нет.</p>
          <Link className="primary-button" to="/">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <ul className="orders-list">
          {orders.map((order) => (
            <li className="order-card" key={order.id}>
              <div className="order-head">
                <strong>Заказ № {order.id}</strong>
                <span className={`order-status order-status-${order.status}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              <p className="product-meta">
                {new Date(order.created_at).toLocaleString('ru-RU')}
              </p>

              <ul className="order-items">
                {order.order_items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.product_id ? (
                        <Link to={`/product/${item.product_id}`}>
                          {item.product_name}
                        </Link>
                      ) : (
                        item.product_name
                      )}{' '}
                      × {item.quantity}
                    </span>
                    <span>
                      {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                    </span>
                  </li>
                ))}
              </ul>

              <p className="product-meta">Адрес: {order.address}</p>
              <p className="product-meta">Телефон: {order.phone}</p>

              <p className="product-price">
                Итого: {order.total.toLocaleString('ru-RU')} ₽
              </p>

              {order.status === 'created' && (
                <div className="product-actions">
                  <button
                    className="primary-button"
                    disabled={busyId === order.id}
                    onClick={() => handlePay(order.id)}
                  >
                    Оплатить (имитация)
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busyId === order.id}
                    onClick={() => handleCancel(order.id)}
                  >
                    Отменить заказ
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default OrdersPage;