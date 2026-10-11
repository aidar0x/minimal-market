import { useState } from 'react';
import { Search, X } from 'lucide-react';
import ProductCard from '../component/products/ProductCard';
import { useShop } from '../context/ShopContext';

function HomePage() {
  const { allProducts: products, loading, loadError } = useShop();
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    if (!normalizedQuery) return true;

    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <>
      <section className="hero">
        <p className="eyebrow">
          МЕНЬШЕ ЛИШНЕГО — БОЛЬШЕ НУЖНОГО
        </p>

        <h1>
          Вещи, которые
          <br />
          хочется оставить.
        </h1>

        <p className="hero-description">
          Находи интересные вещи и продавай то,
          что больше не нужно.
        </p>

        <a className="primary-button" href="#catalog">
          Смотреть каталог →
        </a>
      </section>

      <section className="catalog" id="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">НАША ПОДБОРКА</p>
            <h2>Популярные товары</h2>
          </div>

          <span className="product-count">
            {normalizedQuery
              ? `Найдено: ${filteredProducts.length} из ${products.length}`
              : `${products.length} товара`}
          </span>
        </div>

        <div className="search-box">
          <Search size={19} />

          <input
            type="search"
            placeholder="Поиск товаров..."
            aria-label="Поиск товаров"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {query && (
            <button
              className="search-clear"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {loading ? (
          <p className="status-message">Загружаем товары...</p>
        ) : loadError ? (
          <p className="status-message form-error">{loadError}</p>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>
              {normalizedQuery
                ? `По запросу «${query}» ничего не найдено.`
                : 'Пока нет ни одного товара.'}
            </p>
            {normalizedQuery && (
              <button
                className="secondary-button"
                onClick={() => setQuery('')}
              >
                Сбросить поиск
              </button>
            )}
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="about" id="about">
        <h2>Покупай осознанно.</h2>

        <p>
          Минималистичный маркетплейс для вещей,
          которые заслуживают второго шанса.
        </p>
      </section>
    </>
  );
}

export default HomePage;