
import './App.css';

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  emoji: string;
};

const products: Product[] = [
  {
    id: 1,
    name: 'Наушники',
    category: 'Электроника',
    price: 4990,
    emoji: '🎧',
  },
  {
    id: 2,
    name: 'Городской рюкзак',
    category: 'Аксессуары',
    price: 3290,
    emoji: '🎒',
  },
  {
    id: 3,
    name: 'Настольная лампа',
    category: 'Для дома',
    price: 2190,
    emoji: '💡',
  },
  {
    id: 4,
    name: 'Плёночный фотоаппарат',
    category: 'Электроника',
    price: 6790,
    emoji: '📷',
  },
];

function App() {
  return (
    <div className="app">
      <header className="header">
        <a className="logo" href="/">
          minimal<span>market</span>
        </a>

        <nav className="navigation">
          <a href="#catalog">Каталог</a>
          <a href="#about">О проекте</a>
        </nav>

        <button className="profile-button">
          Мой профиль
        </button>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">МЕНЬШЕ ЛИШНЕГО — БОЛЬШЕ НУЖНОГО</p>

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
              {products.length} товара
            </span>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  <span>{product.emoji}</span>
                </div>

                <p className="product-category">
                  {product.category}
                </p>

                <h3>{product.name}</h3>

                <p className="product-price">
                  {product.price.toLocaleString('ru-RU')} ₽
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="about" id="about">
          <h2>Покупай осознанно.</h2>
          <p>
            Минималистичный маркетплейс для вещей,
            которые заслуживают второго шанса.
          </p>
        </section>
      </main>

      <footer className="footer">
        <a className="logo" href="/">
          minimal<span>market</span>
        </a>
        <p>© 2026 Minimal Market</p>
      </footer>
    </div>
  );
}

export default App;
