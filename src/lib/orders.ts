import { supabase } from './supabase';

export type OrderStatus =
  | 'created'
  | 'paid'
  | 'assembled'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: 'Ожидает оплаты',
  paid: 'Оплачен',
  assembled: 'Собран',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  address: string;
  phone: string;
  created_at: string;
  order_items: OrderItem[];
}

// Цена изменилась, пока покупатель оформлял заказ
export class PriceChangedError extends Error {
  newTotal: number;

  constructor(newTotal: number) {
    super('Цены изменились.');
    this.newTotal = newTotal;
  }
}

function toFriendlyError(message: string): Error {
  const priceMatch = message.match(/PRICE_CHANGED:(\d+)/);
  if (priceMatch) return new PriceChangedError(Number(priceMatch[1]));

  const name = message.split(':').slice(1).join(':').trim();

  if (message.includes('CART_EMPTY')) return new Error('Корзина пуста.');
  if (message.includes('ADDRESS_REQUIRED'))
    return new Error('Укажите адрес доставки.');
  if (message.includes('PHONE_INVALID'))
    return new Error('Укажите корректный номер телефона.');
  if (message.includes('UNAVAILABLE'))
    return new Error(`Товар «${name}» больше недоступен. Уберите его из корзины.`);
  if (message.includes('NO_STOCK'))
    return new Error(`Товара «${name}» не хватает на складе. Уменьшите количество.`);
  if (message.includes('ORDER_NOT_PAYABLE'))
    return new Error('Этот заказ уже нельзя оплатить.');
  if (message.includes('ORDER_NOT_CANCELLABLE'))
    return new Error('Этот заказ уже нельзя отменить.');
  if (message.includes('AUTH_REQUIRED')) return new Error('Войдите в аккаунт.');

  return new Error('Не удалось выполнить действие. Попробуйте ещё раз.');
}

export async function createOrder(
  address: string,
  phone: string,
  expectedTotal: number
): Promise<number> {
  const { data, error } = await supabase.rpc('create_order', {
    p_address: address,
    p_phone: phone,
    p_expected_total: expectedTotal,
  });

  if (error) {
    console.error('Supabase:', error);
    throw toFriendlyError(error.message);
  }
  return Number(data);
}

export async function fetchOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, total, address, phone, created_at, order_items(id, product_id, product_name, quantity, price)'
    )
    .eq('user_id', userId)
    .order('id', { ascending: false });

  if (error) {
    console.error('Supabase:', error);
    throw new Error('Не удалось загрузить заказы.');
  }
  return (data ?? []) as Order[];
}

export async function payOrder(orderId: number): Promise<void> {
  const { error } = await supabase.rpc('pay_order', { p_order_id: orderId });
  if (error) {
    console.error('Supabase:', error);
    throw toFriendlyError(error.message);
  }
}

export async function cancelOrder(orderId: number): Promise<void> {
  const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
  if (error) {
    console.error('Supabase:', error);
    throw toFriendlyError(error.message);
  }
}