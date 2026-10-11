import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import ReportButton from './ReportButton';
import {
  canReview,
  deleteReview,
  fetchReviews,
  saveReview,
} from '../../lib/reviews';
import type { Review } from '../../lib/reviews';

// Звёзды только для показа
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" aria-label={`Рейтинг ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= rounded ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

function pluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} отзыв`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} отзыва`;
  }
  return `${n} отзывов`;
}

function Reviews({ productId }: { productId: number }) {
  const { user } = useAuth();
  const { refresh } = useShop();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const mine = reviews.find((r) => r.user_id === user?.id);

  const load = async () => {
    try {
      setReviews(await fetchReviews(productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [productId]);

  useEffect(() => {
    if (!user) {
      setAllowed(false);
      return;
    }
    canReview(productId).then(setAllowed);
  }, [productId, user?.id]);

  // Подставляем свой отзыв в форму
  useEffect(() => {
    setRating(mine?.rating ?? 0);
    setText(mine?.text ?? '');
  }, [mine?.id, mine?.rating, mine?.text]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (rating < 1) {
      setError('Поставьте оценку от 1 до 5.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await saveReview(productId, rating, text.trim());
      await load();
      refresh(); // обновить средний рейтинг на карточках
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!mine || !window.confirm('Удалить ваш отзыв?')) return;
    try {
      await deleteReview(mine.id);
      setRating(0);
      setText('');
      await load();
      refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
  };

  return (
    <section className="reviews">
      <h2>Отзывы</h2>

      {/* ----- Форма ----- */}
      {!user ? (
        <p className="product-meta">
          <Link to="/auth">Войдите</Link>, чтобы оставить отзыв.
        </p>
      ) : allowed ? (
        <form className="review-form sell-form" onSubmit={handleSubmit}>
          <p>{mine ? 'Ваш отзыв' : 'Оставьте отзыв'}</p>

          <div className="star-input" role="radiogroup" aria-label="Оценка">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} из 5`}
                onClick={() => setRating(n)}
              >
                <Star size={26} fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Что понравилось, а что нет (необязательно)"
          />

          {error && <p className="form-error">{error}</p>}

          <div className="product-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Сохраняем...' : mine ? 'Обновить' : 'Опубликовать'}
            </button>
            {mine && (
              <button
                className="secondary-button"
                type="button"
                onClick={handleDelete}
              >
                Удалить
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="product-meta">
          Оставить отзыв можно после получения этого товара.
        </p>
      )}

      {/* ----- Список ----- */}
      {loading ? (
        <p className="status-message">Загружаем отзывы...</p>
      ) : reviews.length === 0 ? (
        <p>Отзывов пока нет.</p>
      ) : (
        <>
          <p className="product-meta">{pluralReviews(reviews.length)}</p>
          <ul className="review-list">
            {reviews.map((review) => (
              <li key={review.id} className="review-item">
                <div className="order-head">
                  <strong>{review.author?.name || 'Покупатель'}</strong>
                  <span className="product-meta">
                    {new Date(review.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <Stars value={review.rating} />
                {review.text && <p>{review.text}</p>}
                {review.user_id !== user?.id && (
                  <ReportButton reviewId={review.id} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default Reviews;