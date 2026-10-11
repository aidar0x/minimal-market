import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import type { Product, ProductStatus } from '../data/products';
import { ORDER_STATUS_LABELS } from '../lib/orders';
import {
  NEXT_STATUS,
  fetchSellerItems,
  setItemStatus,
  updateProduct,
} from '../lib/seller';
import type { SellerItem } from '../lib/seller';

type Tab = 'products' | 'orders' | 'stats';

const LOW_STOCK = 3;

// ---------- Строка товара с редактированием ----------
function ProductEditRow({
  product,
  onSaved,
}: {
  product: Product;
  onSaved: () => void;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [oldPrice, setOldPrice] = useState(
    product.old_price ? String(product.old_price) : ''
  );
  const [stock, setStock] = useState(String(product.stock));
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    const priceNumber = Math.round(Number(price));
    const stockNumber = Math.floor(Number(stock));
    const oldPriceNumber = oldPrice ? Math.round(Number(oldPrice)) : null;

    if (!priceNumber || priceNumber <= 0) {
      setMessage('Цена должна быть больше нуля.');
      return;
    }
    if (Number.isNaN(stockNumber) || stockNumber < 0) {
      setMessage('Остаток не может быть отрицательным.');
      return;
    }
    if (oldPriceNumber !== null && oldPriceNumber <= 0) {
      setMessage('Старая цена должна быть больше нуля.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await updateProduct(product.id, {
        price: priceNumber,
        old_price: oldPriceNumber,
        stock: stockNumber,
        status,
      });
      onSaved();
      setMessage('Сохранено.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setSaving(false);
  };

  return (
    <li className="seller-row">
      <div className="seller-row-title">
        <Link to={`/product/${product.id}`}>{product.name}</Link>
        <span className="product-meta">{product.sku}</span>
      </div>

      <div className="seller-row-fields">
        <label className="form-field">
          <span>Цена, ₽</span>
          <input
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Старая цена</span>
          <input
            type="number"
            min="1"
            value={oldPrice}
            onChange={(e) => setOldPrice(e.target.value)}
            placeholder="—"
          />
        </label>

        <label className="form-field">
          <span>Остаток</span>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Статус</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
          >
            <option value="active">Активен</option>
            <option value="draft">Черновик</option>
            <option value="hidden">Скрыт</option>
          </select>
        </label>

        <button
          className="primary-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      {message && <p className="product-meta">{message}</p>}
    </li>
  );
}

// ---------- Страница ----------
function SellerPage() {
  const { user, profile } = useAuth();
  const { userProducts, refresh, loading } = useShop();

  const [tab, setTab] = useState<Tab>('products');
  const [items, setItems] = useState<SellerItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadItems = async () => {
    if (!user) return;
    try {
      setItems(await fetchSellerItems(user.id));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setItemsLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, [user?.id]);

  const handleNext = async (item: SellerItem) => {
    const next = NEXT_STATUS[item.status];
    if (!next) return;

    setBusyId(item.id);
    try {
      await setItemStatus(item.id, next.status);
      await loadItems();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setBusyId(null);
  };

  // ----- Статистика (считаем только оплаченные позиции) -----
  const sold = items.filter(
    (i) => i.status !== 'created' && i.status !== 'cancelled'
  );
  const revenue = sold.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const units = sold.reduce((sum, i) => sum + i.quantity, 0);
  const ordersCount = new Set(sold.map((i) => i.order_id)).size;
  const average = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
  const toAssemble = items.filter((i) => i.status === 'paid').length;
  const lowStock = userProducts.filter(
    (p) => p.status === 'active' && p.stock <= LOW_STOCK
  );

  const topProducts = Object.values(
    sold.reduce<Record<string, { name: string; units: number; sum: number }>>(
      (acc, i) => {
        const key = String(i.product_id ?? i.product_name);
        const row = acc[key] ?? { name: i.product_name, units: 0, sum: 0 };
        row.units += i.quantity;
        row.sum += i.price * i.quantity;
        acc[key] = row;
        return acc;
      },
      {}
    )
  )
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 5);

  return (
    <section className="simple-page">
      <p className="eyebrow">КАБИНЕТ ПРОДАВЦА</p>
      <h1>{profile?.shop_name || 'Мой магазин'}</h1>

      <div className="seller-tabs">
        <button
          className={tab === 'products' ? 'active' : ''}
          onClick={() => setTab('products')}
        >
          Товары ({userProducts.length})
        </button>
        <button
          className={tab === 'orders' ? 'active' : ''}
          onClick={() => setTab('orders')}
        >
          Заказы{toAssemble > 0 ? ` · ${toAssemble} новых` : ''}
        </button>
        <button
          className={tab === 'stats' ? 'active' : ''}
          onClick={() => setTab('stats')}
        >
          Статистика
        </button>
      </div>

      {/* ----- Товары ----- */}
      {tab === 'products' && (
        <>
          <Link className="text-button" to="/sell">
            + Добавить товар
          </Link>

          {loading ? (
            <p className="status-message">Загружаем...</p>
          ) : userProducts.length === 0 ? (
            <p>У вас пока нет товаров.</p>
          ) : (
            <ul className="seller-list">
              {userProducts.map((product) => (
                <ProductEditRow
                  key={`${product.id}-${product.price}-${product.stock}-${product.status}-${product.old_price}`}
                  product={product}
                  onSaved={refresh}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {/* ----- Заказы ----- */}
      {tab === 'orders' && (
        <>
          {itemsLoading ? (
            <p className="status-message">Загружаем...</p>
          ) : error ? (
            <p className="status-message form-error">{error}</p>
          ) : items.length === 0 ? (
            <p>Заказов на ваши товары пока нет.</p>
          ) : (
            <ul className="seller-list">
              {items.map((item) => {
                const next = NEXT_STATUS[item.status];
                return (
                  <li className="seller-row" key={item.id}>
                    <div className="order-head">
                      <strong>
                        Заказ № {item.order_id} · {item.product_name} ×{' '}
                        {item.quantity}
                      </strong>
                      <span
                        className={`order-status order-status-${item.status}`}
                      >
                        {ORDER_STATUS_LABELS[item.status]}
                      </span>
                    </div>

                    <p className="product-meta">
                      {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                      {item.order &&
                        ` · ${new Date(item.order.created_at).toLocaleString('ru-RU')}`}
                    </p>

                    {item.order && (
                      <p className="product-meta">
                        Доставка: {item.order.address} · {item.order.phone}
                      </p>
                    )}

                    {item.status === 'created' && (
                      <p className="product-meta">
                        Покупатель ещё не оплатил заказ.
                      </p>
                    )}

                    {next && (
                      <button
                        className="primary-button"
                        disabled={busyId === item.id}
                        onClick={() => handleNext(item)}
                      >
                        {next.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ----- Статистика ----- */}
      {tab === 'stats' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Выручка</span>
              <strong>{revenue.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className="stat-card">
              <span>Продано штук</span>
              <strong>{units}</strong>
            </div>
            <div className="stat-card">
              <span>Заказов</span>
              <strong>{ordersCount}</strong>
            </div>
            <div className="stat-card">
              <span>Средний чек</span>
              <strong>{average.toLocaleString('ru-RU')} ₽</strong>
            </div>
          </div>

          <h2>Лучшие товары</h2>
          {topProducts.length === 0 ? (
            <p>Оплаченных заказов пока нет.</p>
          ) : (
            <ul className="order-items">
              {topProducts.map((row) => (
                <li key={row.name}>
                  <span>
                    {row.name} · {row.units} шт.
                  </span>
                  <span>{row.sum.toLocaleString('ru-RU')} ₽</span>
                </li>
              ))}
            </ul>
          )}

          <h2>Заканчиваются (≤ {LOW_STOCK} шт.)</h2>
          {lowStock.length === 0 ? (
            <p>Всё в порядке.</p>
          ) : (
            <ul className="order-items">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link to={`/product/${p.id}`}>{p.name}</Link>
                  <span>{p.stock} шт.</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default SellerPage;