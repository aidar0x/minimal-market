import { supabase } from './supabase';
import type { OrderStatus } from './orders';
import type { ProductStatus } from '../data/products';

export interface SellerItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  order: {
    id: number;
    created_at: string;
    address: string;
    phone: string;
  } | null;
}

// Какой статус следующий и как называется кнопка
export const NEXT_STATUS: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string }>
> = {
  paid: { status: 'assembled', label: 'Отметить «Собран»' },
  assembled: { status: 'shipped', label: 'Отметить «Отправлен»' },
  shipped: { status: 'delivered', label: 'Отметить «Доставлен»' },
};

export async function fetchSellerItems(userId: string): Promise<SellerItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select(
      'id, order_id, product_id, product_name, quantity, price, status, order:orders(id, created_at, address, phone)'
    )
    .eq('seller_id', userId)
    .order('id', { ascending: false });

  if (error) {
    console.error('Supabase:', error);
    throw new Error('Не удалось загрузить заказы.');
  }
  return (data ?? []) as unknown as SellerItem[];
}

export async function setItemStatus(
  itemId: number,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase.rpc('seller_set_item_status', {
    p_item_id: itemId,
    p_status: status,
  });

  if (error) {
    console.error('Supabase:', error);
    if (error.message.includes('BAD_TRANSITION')) {
      throw new Error('Этот статус сейчас нельзя поставить.');
    }
    throw new Error('Не удалось сменить статус.');
  }
}

export interface ProductChanges {
  price: number;
  old_price: number | null;
  stock: number;
  status: ProductStatus;
}

export async function updateProduct(
  id: number,
  changes: ProductChanges
): Promise<void> {
  const { data, error } = await supabase
    .from('products')
    .update(changes)
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('Supabase:', error);
    throw new Error('Не удалось сохранить товар.');
  }
  if (!data || data.length === 0) {
    throw new Error('Менять товар может только его владелец.');
  }
}