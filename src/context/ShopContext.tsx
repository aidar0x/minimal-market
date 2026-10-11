import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { deleteProductImage } from '../lib/storage';
import { useAuth } from './AuthContext';
import type { Category, Product, ProductStatus } from '../data/products';

export type ProductId = number | string;

export interface CartItem {
  productId: ProductId;
  quantity: number;
}

// Данные формы продажи (id, артикул и продавца задаём сами)
export interface NewProduct {
  name: string;
  category_id: number;
  brand: string | null;
  price: number;
  old_price: number | null;
  stock: number;
  description: string;
  specs: Record<string, string>;
  status?: ProductStatus;
  imageUrls: string[]; // до 5 штук, порядок = порядок показа
}

interface ShopContextValue {
  favoriteIds: ProductId[];
  cartItems: CartItem[];
  allProducts: Product[]; // каталог: только активные товары
  userProducts: Product[]; // все товары текущего продавца
  categories: Category[];
  loading: boolean;
  loadError: string;
  refresh: () => void; // перечитать товары, остатки, корзину и избранное

  isFavorite: (id: ProductId) => boolean;
  toggleFavorite: (id: ProductId) => void;

  isInCart: (id: ProductId) => boolean;
  addToCart: (id: ProductId) => void;
  removeFromCart: (id: ProductId) => void;
  changeQuantity: (id: ProductId, delta: number) => void;
  clearCart: () => void;

  addProduct: (data: NewProduct) => Promise<Product>;
  removeProduct: (id: number) => Promise<void>;

  favoritesCount: number;
  cartCount: number;
}

const FAVORITES_KEY = 'minimal-market:favorites';
const CART_KEY = 'minimal-market:cart';

// Товар вместе с фото, категорией и продавцом одним запросом
const PRODUCT_SELECT = `
  id, seller_id, category_id, name, brand, sku, price, old_price, stock,
  description, specs, status, created_at, rating_avg, reviews_count,
  images:product_images(id, url, position),
  category:categories(id, name, slug, parent_id),
  seller:profiles(id, name, shop_name, avatar_url)
`;

function normalizeProduct(row: unknown): Product {
  const product = row as Product;
  return {
    ...product,
    images: [...(product.images ?? [])].sort((a, b) => a.position - b.position),
  };
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // хранилище недоступно, не страшно
  }
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // Все товары, которые разрешено видеть этому пользователю
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [favoriteIds, setFavoriteIds] = useState<ProductId[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Загружаем товары и категории при старте, смене пользователя и refresh()
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select(PRODUCT_SELECT)
          .order('id', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name, slug, parent_id')
          .order('name'),
      ]);

      if (cancelled) return;

      if (productsRes.error || categoriesRes.error) {
        setLoadError('Не удалось загрузить товары. Попробуйте позже.');
        console.error('Supabase:', productsRes.error ?? categoriesRes.error);
      } else {
        setLoadError('');
        setProducts((productsRes.data ?? []).map(normalizeProduct));
        setCategories((categoriesRes.data ?? []) as Category[]);
      }
      setLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshKey]);

  // Избранное и корзина: гость берёт из localStorage, вошедший из базы
  useEffect(() => {
    if (authLoading) return;

    // Гость
    if (!user) {
      setFavoriteIds(loadFromStorage<ProductId[]>(FAVORITES_KEY, []));
      setCartItems(loadFromStorage<CartItem[]>(CART_KEY, []));
      return;
    }

    // Вошедший пользователь
    let cancelled = false;
    const userId = user.id;

    async function syncUserLists() {
      const [favRes, cartRes] = await Promise.all([
        supabase.from('favorites').select('product_id'),
        supabase.from('cart_items').select('product_id, quantity'),
      ]);

      if (cancelled) return;

      if (favRes.error || cartRes.error) {
        console.error('Supabase:', favRes.error ?? cartRes.error);
        return;
      }

      const dbFavorites = (favRes.data ?? []).map((row) =>
        Number(row.product_id)
      );
      const dbCart = new Map<number, number>(
        (cartRes.data ?? []).map((row) => [Number(row.product_id), row.quantity])
      );

      // Что гость успел накопить до входа
      const localFavorites = loadFromStorage<ProductId[]>(FAVORITES_KEY, [])
        .map(Number)
        .filter((n) => Number.isInteger(n));
      const localCart = loadFromStorage<CartItem[]>(CART_KEY, [])
        .map((item) => ({
          productId: Number(item.productId),
          quantity: item.quantity,
        }))
        .filter(
          (item) => Number.isInteger(item.productId) && item.quantity > 0
        );

      // Оставляем только товары, которые реально есть в базе
      const localIds = [
        ...new Set([...localFavorites, ...localCart.map((i) => i.productId)]),
      ];
      let existing = new Set<number>();
      if (localIds.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('id')
          .in('id', localIds);
        existing = new Set((data ?? []).map((row) => Number(row.id)));
      }

      const newFavorites = localFavorites.filter(
        (id) => existing.has(id) && !dbFavorites.includes(id)
      );

      const mergedCart = new Map(dbCart);
      const cartToSave: {
        user_id: string;
        product_id: number;
        quantity: number;
      }[] = [];
      for (const item of localCart) {
        if (!existing.has(item.productId)) continue;
        const current = mergedCart.get(item.productId) ?? 0;
        if (item.quantity > current) {
          mergedCart.set(item.productId, item.quantity);
          cartToSave.push({
            user_id: userId,
            product_id: item.productId,
            quantity: item.quantity,
          });
        }
      }

      if (newFavorites.length > 0) {
        const { error } = await supabase.from('favorites').upsert(
          newFavorites.map((id) => ({ user_id: userId, product_id: id })),
          { onConflict: 'user_id,product_id', ignoreDuplicates: true }
        );
        if (error) console.error('Supabase:', error);
      }

      if (cartToSave.length > 0) {
        const { error } = await supabase
          .from('cart_items')
          .upsert(cartToSave, { onConflict: 'user_id,product_id' });
        if (error) console.error('Supabase:', error);
      }

      if (cancelled) return;

      // Гостевые данные перенесены, чистим
      localStorage.removeItem(FAVORITES_KEY);
      localStorage.removeItem(CART_KEY);

      setFavoriteIds([...new Set([...dbFavorites, ...newFavorites])]);
      setCartItems(
        [...mergedCart.entries()].map(([productId, quantity]) => ({
          productId,
          quantity,
        }))
      );
    }

    syncUserLists();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Каталог видит только активные товары
  const allProducts = products.filter((p) => p.status === 'active');

  // Товары текущего продавца (включая черновики и скрытые)
  const userProducts = user
    ? products.filter((p) => p.seller_id === user.id)
    : [];

  // ----- Избранное -----
  const isFavorite = (id: ProductId) => favoriteIds.includes(id);

  const toggleFavorite = (id: ProductId) => {
    const previous = favoriteIds;
    const wasFavorite = previous.includes(id);
    const next = wasFavorite
      ? previous.filter((x) => x !== id)
      : [...previous, id];

    setFavoriteIds(next);

    if (!user) {
      saveToStorage(FAVORITES_KEY, next);
      return;
    }

    const request = wasFavorite
      ? supabase.from('favorites').delete().eq('product_id', id)
      : supabase.from('favorites').upsert(
          { user_id: user.id, product_id: id },
          { onConflict: 'user_id,product_id', ignoreDuplicates: true }
        );

    request.then(({ error }) => {
      if (error) {
        console.error('Supabase:', error);
        setFavoriteIds(previous); // откат
      }
    });
  };

  // ----- Корзина -----
  const isInCart = (id: ProductId) =>
    cartItems.some((item) => item.productId === id);

  // Сохраняет новое состояние корзины для одного товара
  const applyCart = (next: CartItem[], changedId: ProductId) => {
    const previous = cartItems;
    setCartItems(next);

    if (!user) {
      saveToStorage(CART_KEY, next);
      return;
    }

    const item = next.find((x) => x.productId === changedId);
    const request = item
      ? supabase.from('cart_items').upsert(
          { user_id: user.id, product_id: changedId, quantity: item.quantity },
          { onConflict: 'user_id,product_id' }
        )
      : supabase.from('cart_items').delete().eq('product_id', changedId);

    request.then(({ error }) => {
      if (error) {
        console.error('Supabase:', error);
        setCartItems(previous); // откат
      }
    });
  };

  const stockOf = (id: ProductId) =>
    products.find((p) => p.id === id)?.stock ?? 0;

  const addToCart = (id: ProductId) => {
    const existing = cartItems.find((item) => item.productId === id);
    const nextQuantity = (existing?.quantity ?? 0) + 1;

    if (nextQuantity > stockOf(id)) return;

    const next = existing
      ? cartItems.map((item) =>
          item.productId === id ? { ...item, quantity: nextQuantity } : item
        )
      : [...cartItems, { productId: id, quantity: 1 }];

    applyCart(next, id);
  };

  const removeFromCart = (id: ProductId) => {
    applyCart(
      cartItems.filter((item) => item.productId !== id),
      id
    );
  };

  const changeQuantity = (id: ProductId, delta: number) => {
    const existing = cartItems.find((item) => item.productId === id);
    if (!existing) return;

    const nextQuantity = existing.quantity + delta;

    // Больше остатка добавить нельзя
    if (delta > 0 && nextQuantity > stockOf(id)) return;

    const next =
      nextQuantity > 0
        ? cartItems.map((item) =>
            item.productId === id ? { ...item, quantity: nextQuantity } : item
          )
        : cartItems.filter((item) => item.productId !== id);

    applyCart(next, id);
  };

  const clearCart = () => {
    const previous = cartItems;
    setCartItems([]);

    if (!user) {
      saveToStorage(CART_KEY, []);
      return;
    }

    supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) {
          console.error('Supabase:', error);
          setCartItems(previous); // откат
        }
      });
  };

  // ----- Товары в базе -----
  const addProduct = async (data: NewProduct): Promise<Product> => {
    if (!user) {
      throw new Error('Войдите в аккаунт, чтобы продавать товары.');
    }

    const { imageUrls, ...fields } = data;

    // 1. Сам товар
    const { data: created, error } = await supabase
      .from('products')
      .insert({ ...fields, seller_id: user.id })
      .select('id')
      .single();

    if (error || !created) {
      console.error('Supabase:', error);
      throw new Error(
        'Не удалось опубликовать товар. Проверьте, что у вас есть права продавца.'
      );
    }

    // 2. Фотографии
    if (imageUrls.length > 0) {
      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(
          imageUrls.map((url, index) => ({
            product_id: created.id,
            url,
            position: index,
          }))
        );

      if (imagesError) {
        console.error('Supabase:', imagesError);
        // Откатываем: не оставляем товар без фото
        await supabase.from('products').delete().eq('id', created.id);
        throw new Error('Не удалось сохранить фотографии товара.');
      }
    }

    // 3. Читаем товар целиком (с фото, категорией, продавцом)
    const { data: full, error: fullError } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', created.id)
      .single();

    if (fullError || !full) {
      console.error('Supabase:', fullError);
      throw new Error(
        'Товар создан, но не удалось его загрузить. Обновите страницу.'
      );
    }

    const product = normalizeProduct(full);
    setProducts((prev) => [product, ...prev]);
    return product;
  };

  const removeProduct = async (id: number): Promise<void> => {
    const target = products.find((p) => p.id === id);

    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      console.error('Supabase:', error);
      throw new Error('Не удалось удалить товар.');
    }

    // Если база ничего не удалила, значит, товар чужой
    if (!data || data.length === 0) {
      throw new Error('Этот товар можно удалить только его владельцу.');
    }

    // Строки удалены (фото, избранное и корзины ушли каскадом),
    // теперь удаляем сами файлы
    await Promise.allSettled(
      (target?.images ?? []).map((image) => deleteProductImage(image.url))
    );

    setProducts((prev) => prev.filter((p) => p.id !== id));
    setFavoriteIds((prev) => prev.filter((x) => x !== id));
    setCartItems((prev) => prev.filter((item) => item.productId !== id));
  };

  // ----- Счётчики -----
  const favoritesCount = favoriteIds.length;
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ShopContext.Provider
      value={{
        favoriteIds,
        cartItems,
        allProducts,
        userProducts,
        categories,
        loading,
        loadError,
        refresh,
        isFavorite,
        toggleFavorite,
        isInCart,
        addToCart,
        removeFromCart,
        changeQuantity,
        clearCart,
        addProduct,
        removeProduct,
        favoritesCount,
        cartCount,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop нужно использовать внутри <ShopProvider>');
  }
  return context;
}