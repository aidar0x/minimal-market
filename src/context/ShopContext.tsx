import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { deleteProductImage } from '../lib/storage';
import { useAuth } from './AuthContext';
import type { Product } from '../data/products';

export type ProductId = number | string;

export interface CartItem {
  productId: ProductId;
  quantity: number;
}

// Данные формы продажи (id и владельца задаём сами)
export type NewProduct = Omit<Product, 'id' | 'user_id'>;

interface ShopContextValue {
  favoriteIds: ProductId[];
  cartItems: CartItem[];
  allProducts: Product[];
  userProducts: Product[];
  loading: boolean;
  loadError: string;

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
const PRODUCT_FIELDS =
  'id, name, category, price, emoji, description, user_id, image_url';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [favoriteIds, setFavoriteIds] = useState<ProductId[]>(() =>
    loadFromStorage<ProductId[]>(FAVORITES_KEY, [])
  );
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    loadFromStorage<CartItem[]>(CART_KEY, [])
  );

  // Загружаем товары из Supabase при старте
  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_FIELDS)
        .order('id', { ascending: false });

      if (cancelled) return;

      if (error) {
        setLoadError('Не удалось загрузить товары. Попробуйте позже.');
        console.error('Supabase:', error);
      } else {
        setAllProducts((data ?? []) as Product[]);
      }
      setLoading(false);
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // Товары текущего пользователя
  const userProducts = user
    ? allProducts.filter((p) => p.user_id === user.id)
    : [];

  // ----- Избранное -----
  const isFavorite = (id: ProductId) => favoriteIds.includes(id);

  const toggleFavorite = (id: ProductId) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ----- Корзина -----
  const isInCart = (id: ProductId) =>
    cartItems.some((item) => item.productId === id);

  const addToCart = (id: ProductId) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === id);
      if (existing) {
        return prev.map((item) =>
          item.productId === id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: id, quantity: 1 }];
    });
  };

  const removeFromCart = (id: ProductId) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== id));
  };

  const changeQuantity = (id: ProductId, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.productId === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCartItems([]);

  // ----- Товары в базе -----
  const addProduct = async (data: NewProduct): Promise<Product> => {
    if (!user) {
      throw new Error('Войдите в аккаунт, чтобы продавать товары.');
    }

    const { data: created, error } = await supabase
      .from('products')
      .insert({ ...data, user_id: user.id })
      .select(PRODUCT_FIELDS)
      .single();

    if (error || !created) {
      console.error('Supabase:', error);
      throw new Error('Не удалось опубликовать товар.');
    }

    const product = created as Product;
    setAllProducts((prev) => [product, ...prev]);
    return product;
  };

  const removeProduct = async (id: number): Promise<void> => {
    const target = allProducts.find((p) => p.id === id);

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

    // Строка удалена, теперь удаляем и файл с фото
    await deleteProductImage(target?.image_url);

    setAllProducts((prev) => prev.filter((p) => p.id !== id));
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
        loading,
        loadError,
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