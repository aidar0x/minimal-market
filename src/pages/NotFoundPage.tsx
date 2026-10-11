
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="simple-page">
      <h1>404</h1>
      <p>Такой страницы не существует.</p>
      <Link to="/">Вернуться на главную</Link>
    </section>
  );
}

export default NotFoundPage;
