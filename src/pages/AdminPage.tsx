import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { ORDER_STATUS_LABELS } from '../lib/orders';
import { deleteReview } from '../lib/reviews';
import {
  REPORT_REASONS,
  addCategory,
  deleteCategory,
  fetchAllOrders,
  fetchReports,
  fetchUsers,
  hideProduct,
  renameCategory,
  setReportStatus,
  setSeller,
} from '../lib/admin';
import type { AdminOrder, AdminUser, Report } from '../lib/admin';
import type { Category } from '../data/products';

type Tab = 'reports' | 'sellers' | 'categories' | 'orders';

const REPORT_STATUS_LABELS = {
  open: 'Открыта',
  resolved: 'Решена',
  dismissed: 'Отклонена',
} as const;

function showError(e: unknown) {
  window.alert(e instanceof Error ? e.message : 'Что-то пошло не так.');
}

// ---------- Продавцы ----------
function UserRow({
  user,
  isMe,
  onChanged,
}: {
  user: AdminUser;
  isMe: boolean;
  onChanged: () => void;
}) {
  const [shopName, setShopName] = useState(user.shop_name ?? '');
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !user.is_seller;
    if (!next && !window.confirm(`Снять роль продавца у ${user.email}?`)) return;
    setBusy(true);
    try {
      await setSeller(user.id, next, shopName);
      onChanged();
    } catch (e) {
      showError(e);
    }
    setBusy(false);
  };

  return (
    <li className="seller-row">
      <div className="order-head">
        <strong>{user.email}</strong>
        <span className="order-status">
          {user.is_admin ? 'Админ' : user.is_seller ? 'Продавец' : 'Покупатель'}
        </span>
      </div>

      <div className="seller-row-fields">
        <label className="form-field">
          <span>Название магазина</span>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder={user.name}
          />
        </label>

        <button
          className={user.is_seller ? 'secondary-button' : 'primary-button'}
          disabled={busy || (isMe && user.is_seller)}
          onClick={toggle}
        >
          {user.is_seller ? 'Снять роль продавца' : 'Сделать продавцом'}
        </button>
      </div>
    </li>
  );
}

// ---------- Категории ----------
function CategoryRow({
  category,
  onChanged,
}: {
  category: Category;
  onChanged: () => void;
}) {
  const [name, setName] = useState(category.name);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) return;
    try {
      await renameCategory(category.id, trimmed);
      onChanged();
    } catch (e) {
      showError(e);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Удалить категорию «${category.name}»?`)) return;
    try {
      await deleteCategory(category.id);
      onChanged();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <li className="seller-row">
      <div className="seller-row-fields">
        <label className="form-field">
          <span>/{category.slug}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="primary-button" onClick={save}>
          Сохранить
        </button>
        <button className="secondary-button" onClick={remove}>
          Удалить
        </button>
      </div>
    </li>
  );
}

// ---------- Страница ----------
function AdminPage() {
  const { user } = useAuth();
  const { categories, refresh } = useShop();

  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  const loadAll = async () => {
    try {
      const [r, u, o] = await Promise.all([
        fetchReports(),
        fetchUsers(),
        fetchAllOrders(),
      ]);
      setReports(r);
      setUsers(u);
      setOrders(o);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const act = async (fn: () => Promise<void>) => {
    try {
      await fn();
      await loadAll();
      refresh();
    } catch (e) {
      showError(e);
    }
  };

  const handleAddCategory = async () => {
    const name = newName.trim();
    const slug = newSlug.trim().toLowerCase();
    if (!name) return window.alert('Введите название.');
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return window.alert('Адрес: только латиница, цифры и дефис, например sport.');
    }
    try {
      await addCategory(name, slug);
      setNewName('');
      setNewSlug('');
      refresh();
    } catch (e) {
      showError(e);
    }
  };

  const openCount = reports.filter((r) => r.status === 'open').length;

  return (
    <section className="simple-page">
      <p className="eyebrow">АДМИНИСТРИРОВАНИЕ</p>
      <h1>Админка</h1>

      <div className="seller-tabs">
        <button
          className={tab === 'reports' ? 'active' : ''}
          onClick={() => setTab('reports')}
        >
          Жалобы{openCount > 0 ? ` · ${openCount}` : ''}
        </button>
        <button
          className={tab === 'sellers' ? 'active' : ''}
          onClick={() => setTab('sellers')}
        >
          Продавцы
        </button>
        <button
          className={tab === 'categories' ? 'active' : ''}
          onClick={() => setTab('categories')}
        >
          Категории
        </button>
        <button
          className={tab === 'orders' ? 'active' : ''}
          onClick={() => setTab('orders')}
        >
          Все заказы
        </button>
      </div>

      {loading && <p className="status-message">Загружаем...</p>}
      {error && <p className="status-message form-error">{error}</p>}

      {/* ----- Жалобы ----- */}
      {!loading && tab === 'reports' &&
        (reports.length === 0 ? (
          <p>Жалоб нет.</p>
        ) : (
          <ul className="seller-list">
            {reports.map((report) => (
              <li className="seller-row" key={report.id}>
                <div className="order-head">
                  <strong>{REPORT_REASONS[report.reason]}</strong>
                  <span className="order-status">
                    {REPORT_STATUS_LABELS[report.status]}
                  </span>
                </div>

                <p className="product-meta">
                  От {report.reporter?.name ?? '—'} ·{' '}
                  {new Date(report.created_at).toLocaleString('ru-RU')}
                </p>
                {report.details && <p>{report.details}</p>}

                {report.product && (
                  <p>
                    Товар:{' '}
                    <Link to={`/product/${report.product.id}`}>
                      {report.product.name}
                    </Link>{' '}
                    <span className="product-meta">({report.product.status})</span>
                  </p>
                )}

                {report.review && (
                  <p>
                    Отзыв ({report.review.rating}/5) на{' '}
                    <Link to={`/product/${report.review.product_id}`}>товар</Link>
                    : «{report.review.text || 'без текста'}»
                  </p>
                )}

                {!report.product && !report.review && (
                  <p className="product-meta">Объект жалобы уже удалён.</p>
                )}

                {report.status === 'open' && (
                  <div className="product-actions">
                    {report.product && report.product.status !== 'hidden' && (
                      <button
                        className="primary-button"
                        onClick={() =>
                          act(async () => {
                            await hideProduct(report.product!.id);
                            await setReportStatus(report.id, 'resolved');
                          })
                        }
                      >
                        Скрыть товар
                      </button>
                    )}
                    {report.review && (
                      <button
                        className="primary-button"
                        onClick={() =>
                          act(async () => {
                            await setReportStatus(report.id, 'resolved');
                            await deleteReview(report.review!.id);
                          })
                        }
                      >
                        Удалить отзыв
                      </button>
                    )}
                    <button
                      className="secondary-button"
                      onClick={() =>
                        act(() => setReportStatus(report.id, 'resolved'))
                      }
                    >
                      Решено
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        act(() => setReportStatus(report.id, 'dismissed'))
                      }
                    >
                      Отклонить
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}

      {/* ----- Продавцы ----- */}
      {!loading && tab === 'sellers' && (
        <ul className="seller-list">
          {users.map((u) => (
            <UserRow
              key={`${u.id}-${u.is_seller}-${u.shop_name}`}
              user={u}
              isMe={u.id === user?.id}
              onChanged={loadAll}
            />
          ))}
        </ul>
      )}

      {/* ----- Категории ----- */}
      {!loading && tab === 'categories' && (
        <>
          <div className="seller-row">
            <div className="seller-row-fields">
              <label className="form-field">
                <span>Название</span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Спорт"
                />
              </label>
              <label className="form-field">
                <span>Адрес (латиницей)</span>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="sport"
                />
              </label>
              <button className="primary-button" onClick={handleAddCategory}>
                Добавить
              </button>
            </div>
          </div>

          <ul className="seller-list">
            {categories.map((c) => (
              <CategoryRow
                key={`${c.id}-${c.name}`}
                category={c}
                onChanged={refresh}
              />
            ))}
          </ul>
        </>
      )}

      {/* ----- Все заказы ----- */}
      {!loading && tab === 'orders' &&
        (orders.length === 0 ? (
          <p>Заказов пока нет.</p>
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
                  {new Date(order.created_at).toLocaleString('ru-RU')} ·
                  покупатель {order.user_id.slice(0, 8)}
                </p>
                <ul className="order-items">
                  {order.order_items.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.product_name} × {item.quantity}
                      </span>
                      <span>
                        {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="product-meta">
                  {order.address} · {order.phone}
                </p>
                <p className="product-price">
                  {order.total.toLocaleString('ru-RU')} ₽
                </p>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

export default AdminPage;