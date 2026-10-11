import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import ProductCard from '../component/products/ProductCard';
import { useShop } from '../context/ShopContext';

const PAGE_SIZE = 12;

type SortKey = 'new' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'new', label: 'Сначала новые' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
];

// 1 товар, 2 товара, 5 товаров
function pluralProducts(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} товара`;
  }
  return `${n} товаров`;
}

// Какие номера страниц показывать
function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);
  return [...pages].sort((a, b) => a - b);
}

function HomePage() {
  const {
    allProducts: products,
    categories,
    loading,
    loadError,
  } = useShop();
  const [params, setParams] = useSearchParams();
  const firstRender = useRef(true);

  // ----- Состояние фильтров берём из адреса -----
  const query = params.get('q') ?? '';
  const categorySlug = params.get('category') ?? '';
  const minPrice = params.get('min') ?? '';
  const maxPrice = params.get('max') ?? '';
  const inStockOnly = params.get('stock') === '1';
  const sortParam = params.get('sort');
  const sort: SortKey =
    sortParam === 'price_asc' || sortParam === 'price_desc'
      ? sortParam
      : 'new';

  // Меняет параметры адреса; при смене фильтра возвращаемся на 1 страницу
  const update = (changes: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!keepPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const resetFilters = () => setParams({}, { replace: true });

  // ----- Фильтрация -----
  const normalizedQuery = query.trim().toLowerCase();
  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const min = minPrice ? Number(minPrice) : null;
  const max = maxPrice ? Number(maxPrice) : null;

  const filtered = products.filter((product) => {
    if (normalizedQuery) {
      const matches =
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category?.name.toLowerCase().includes(normalizedQuery) ||
        product.brand?.toLowerCase().includes(normalizedQuery);
      if (!matches) return false;
    }
    if (activeCategory && product.category_id !== activeCategory.id) {
      return false;
    }
    if (min !== null && !Number.isNaN(min) && product.price < min) return false;
    if (max !== null && !Number.isNaN(max) && product.price > max) return false;
    if (inStockOnly && product.stock <= 0) return false;
    return true;
  });

  // ----- Сортировка -----
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    return b.id - a.id; // новые сверху
  });

  // ----- Страницы -----
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const requestedPage = Number(params.get('page')) || 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToPage = (n: number) => update({ page: n === 1 ? '' : String(n) }, true);

  // При смене страницы возвращаем взгляд к началу каталога
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  }, [page]);

  // Сколько товаров в каждой категории (для подписей)
  const countByCategory = new Map<number, number>();
  for (const product of products) {
    if (product.category_id !== null) {
      countByCategory.set(
        product.category_id,
        (countByCategory.get(product.category_id) ?? 0) + 1
      );
    }
  }

  const hasFilters =
    query || categorySlug || minPrice || maxPrice || inStockOnly || sort !== 'new';

  return (
    <>
      <section className="hero">
  <div className="hero-content">
    <p className="eyebrow">MINIMAL MARKET · МАГАЗИН НА КАЖДЫЙ ДЕНЬ</p>

    <h1>
      Всё нужное.
      <br />
      Ничего лишнего.
    </h1>

    <p className="hero-description">
      Находи товары для себя, дома и повседневной жизни.
      Удобный каталог, понятные цены и покупки в одном месте.
    </p>

    <div className="hero-actions">
      <a className="primary-button" href="#catalog">
        Перейти в каталог <span aria-hidden="true">→</span>
      </a>
      <span className="hero-caption">Покупки без лишнего шума.</span>
    </div>
  </div>

  <div className="hero-visual" aria-hidden="true">
    <div className="hero-visual-card hero-visual-card-main">
      <span className="hero-visual-label">YOUR DAILY PICKS</span>
      <div className="hero-visual-symbol">m<span>.</span></div>
      <span className="hero-visual-bottom">MINIMAL MARKET</span>
    </div>
    <div className="hero-visual-card hero-visual-card-small">
      <span className="hero-small-dot" />
      <span>Хороший выбор<br />на каждый день</span>
    </div>
  </div>
</section>

      <section className="catalog" id="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">КАТАЛОГ</p>
            <h2>{activeCategory ? activeCategory.name : 'Все товары'}</h2>
          </div>

          <span className="product-count">
            {hasFilters
              ? `Найдено: ${filtered.length} из ${products.length}`
              : pluralProducts(products.length)}
          </span>
        </div>

        <div className="search-box">
          <Search size={19} />

          <input
            type="search"
            placeholder="Поиск по названию, бренду, категории..."
            aria-label="Поиск товаров"
            value={query}
            onChange={(event) => update({ q: event.target.value })}
          />

          {query && (
            <button
              className="search-clear"
              onClick={() => update({ q: '' })}
              aria-label="Очистить поиск"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ----- Категории ----- */}
        <div className="category-chips">
          <button
            className={!activeCategory ? 'active' : ''}
            onClick={() => update({ category: '' })}
          >
            Все ({products.length})
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={activeCategory?.id === category.id ? 'active' : ''}
              onClick={() => update({ category: category.slug })}
            >
              {category.name} ({countByCategory.get(category.id) ?? 0})
            </button>
          ))}
        </div>

        {/* ----- Фильтры и сортировка ----- */}
        <div className="filters-bar">
          <label className="form-field">
            <span>Цена от, ₽</span>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => update({ min: e.target.value })}
              placeholder="0"
            />
          </label>

          <label className="form-field">
            <span>до, ₽</span>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => update({ max: e.target.value })}
              placeholder="любая"
            />
          </label>

          <label className="form-field">
            <span>Сортировка</span>
            <select
              value={sort}
              onChange={(e) =>
                update({ sort: e.target.value === 'new' ? '' : e.target.value })
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-check">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => update({ stock: e.target.checked ? '1' : '' })}
            />
            <span>Только в наличии</span>
          </label>

          {hasFilters && (
            <button className="text-button" onClick={resetFilters}>
              Сбросить всё
            </button>
          )}
        </div>

        {/* ----- Результат ----- */}
        {loading ? (
          <p className="status-message">Загружаем товары...</p>
        ) : loadError ? (
          <p className="status-message form-error">{loadError}</p>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <p>
              {hasFilters
                ? 'По выбранным условиям ничего не найдено.'
                : 'Пока нет ни одного товара.'}
            </p>
            {hasFilters && (
              <button className="secondary-button" onClick={resetFilters}>
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="product-grid">
              {pageItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="pagination" aria-label="Страницы каталога">
                <button
                  disabled={page === 1}
                  onClick={() => goToPage(page - 1)}
                >
                  ← Назад
                </button>

                {pageNumbers(page, totalPages).map((n, index, list) => (
                  <span key={n} className="pagination-item">
                    {index > 0 && n - list[index - 1] > 1 && <span>…</span>}
                    <button
                      className={n === page ? 'active' : ''}
                      aria-current={n === page ? 'page' : undefined}
                      onClick={() => goToPage(n)}
                    >
                      {n}
                    </button>
                  </span>
                ))}

                <button
                  disabled={page === totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Вперёд →
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      <section className="about" id="about">
        <h2>Покупай осознанно.</h2>

        <p>
          Максимальный комфорт без чувства упущенных возможностей. 
        </p>
      </section>
    </>
  );
}

export default HomePage;