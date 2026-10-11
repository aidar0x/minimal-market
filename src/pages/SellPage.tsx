import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  deleteProductImage,
  uploadProductImage,
} from '../lib/storage';

function SellPage() {
  const { addProduct, categories } = useShop();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Превью выбранного фото
  useEffect(() => {
    if (!photo) {
      setPreview('');
      return;
    }

    const url = URL.createObjectURL(photo);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Подходят только файлы JPG, PNG или WebP.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Фото слишком большое. Максимум 5 МБ.');
      event.target.value = '';
      return;
    }

    setError('');
    setPhoto(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const priceNumber = Number(price);
    const stockNumber = Math.floor(Number(stock));

    if (!name.trim()) {
      setError('Укажите название товара.');
      return;
    }

    if (!categoryId) {
      setError('Выберите категорию.');
      return;
    }

    if (!price || Number.isNaN(priceNumber) || priceNumber <= 0) {
      setError('Укажите цену больше нуля.');
      return;
    }

    if (Number.isNaN(stockNumber) || stockNumber < 0) {
      setError('Остаток не может быть отрицательным.');
      return;
    }

    if (!user) {
      setError('Войдите в аккаунт, чтобы продавать товары.');
      return;
    }

    setError('');
    setSubmitting(true);

    let imageUrl: string | null = null;

    try {
      if (photo) {
        imageUrl = await uploadProductImage(photo, user.id);
      }

      const product = await addProduct({
        name: name.trim(),
        category_id: Number(categoryId),
        brand: brand.trim() || null,
        price: Math.round(priceNumber),
        old_price: null,
        stock: stockNumber,
        description: description.trim() || 'Описание не указано.',
        specs: {},
        imageUrls: imageUrl ? [imageUrl] : [],
      });

      navigate(`/product/${product.id}`);
    } catch (e) {
      // Товар не создался, значит, загруженное фото не нужно
      await deleteProductImage(imageUrl);
      setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
      setSubmitting(false);
    }
  };

  return (
    <section className="simple-page">
      <p className="eyebrow">ДЛЯ ПРОДАВЦОВ</p>
      <h1>Продать товар</h1>
      <p>Заполните форму, и товар сразу появится в каталоге.</p>

      <form className="sell-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Название</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Виниловый проигрыватель"
          />
        </label>

        <div className="form-row">
          <label className="form-field">
            <span>Категория</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Выберите категорию</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Бренд</span>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Необязательно"
            />
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            <span>Цена, ₽</span>
            <input
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1500"
            />
          </label>

          <label className="form-field">
            <span>Остаток, шт.</span>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </label>
        </div>

        <div className="form-field">
          <span>Фото (необязательно, до 5 МБ)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
          />

          {preview && (
            <div className="photo-preview-wrap">
              <img className="photo-preview" src={preview} alt="Превью" />
              <button
                type="button"
                className="text-button"
                onClick={() => setPhoto(null)}
              >
                Убрать фото
              </button>
            </div>
          )}
        </div>

        <label className="form-field">
          <span>Описание</span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Расскажите о товаре и его особенностях"
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button
          className="primary-button"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Публикуем...' : 'Опубликовать'}
        </button>
      </form>
    </section>
  );
}

export default SellPage;