import { supabase } from './supabase';
import type { Order } from './orders';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  shop_name: string | null;
  is_seller: boolean;
  is_admin: boolean;
  created_at: string;
}

export type ReportReason = 'spam' | 'fake' | 'prohibited' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export const REPORT_REASONS: Record<ReportReason, string> = {
  spam: 'Спам или реклама',
  fake: 'Недостоверное описание или подделка',
  prohibited: 'Запрещённый товар или контент',
  other: 'Другое',
};

export interface Report {
  id: number;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  created_at: string;
  product_id: number | null;
  review_id: number | null;
  product: { id: number; name: string; status: string } | null;
  review: { id: number; product_id: number; rating: number; text: string } | null;
  reporter: { name: string } | null;
}

export type AdminOrder = Order & { user_id: string };

function fail(message: string, error: unknown): never {
  console.error('Supabase:', error);
  throw new Error(message);
}

// ----- Пользователи -----
export async function fetchUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) fail('Не удалось загрузить пользователей.', error);
  return (data ?? []) as AdminUser[];
}

export async function setSeller(
  userId: string,
  isSeller: boolean,
  shopName: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_seller', {
    p_user_id: userId,
    p_is_seller: isSeller,
    p_shop_name: shopName,
  });
  if (error) fail('Не удалось изменить роль.', error);
}

// ----- Жалобы -----
export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      'id, reason, details, status, created_at, product_id, review_id, product:products(id, name, status), review:reviews(id, product_id, rating, text), reporter:profiles(name)'
    )
    .order('id', { ascending: false });
  if (error) fail('Не удалось загрузить жалобы.', error);
  return (data ?? []) as unknown as Report[];
}

export async function setReportStatus(
  id: number,
  status: ReportStatus
): Promise<void> {
  const { error } = await supabase.from('reports').update({ status }).eq('id', id);
  if (error) fail('Не удалось обновить жалобу.', error);
}

export async function createReport(
  target: { productId?: number; reviewId?: number },
  reason: ReportReason,
  details: string
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    product_id: target.productId ?? null,
    review_id: target.reviewId ?? null,
    reason,
    details,
  });
  if (error) {
    console.error('Supabase:', error);
    throw new Error(
      'Не удалось отправить жалобу. Возможно, вы уже жаловались на это и жалоба ещё на рассмотрении.'
    );
  }
}

export async function hideProduct(id: number): Promise<void> {
  const { data, error } = await supabase
    .from('products')
    .update({ status: 'hidden' })
    .eq('id', id)
    .select('id');
  if (error || !data || data.length === 0) {
    fail('Не удалось скрыть товар.', error);
  }
}

// ----- Категории -----
export async function addCategory(name: string, slug: string): Promise<void> {
  const { error } = await supabase.from('categories').insert({ name, slug });
  if (error) {
    console.error('Supabase:', error);
    throw new Error(
      error.code === '23505'
        ? 'Категория с таким адресом уже есть.'
        : 'Не удалось добавить категорию.'
    );
  }
}

export async function renameCategory(id: number, name: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ name }).eq('id', id);
  if (error) fail('Не удалось переименовать категорию.', error);
}

export async function deleteCategory(id: number): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    console.error('Supabase:', error);
    throw new Error(
      error.code === '23503'
        ? 'В этой категории есть товары. Сначала перенесите или удалите их.'
        : 'Не удалось удалить категорию.'
    );
  }
}

// ----- Все заказы -----
export async function fetchAllOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, user_id, status, total, address, phone, created_at, order_items(id, product_id, product_name, quantity, price)'
    )
    .order('id', { ascending: false })
    .limit(200);
  if (error) fail('Не удалось загрузить заказы.', error);
  return (data ?? []) as AdminOrder[];
}