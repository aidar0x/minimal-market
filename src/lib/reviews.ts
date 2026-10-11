import { supabase } from './supabase';

export interface Review {
  id: number;
  product_id: number;
  user_id: string;
  rating: number;
  text: string;
  created_at: string;
  author: { name: string } | null;
}

export async function fetchReviews(productId: number): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, product_id, user_id, rating, text, created_at, author:profiles(name)')
    .eq('product_id', productId)
    .order('id', { ascending: false });

  if (error) {
    console.error('Supabase:', error);
    throw new Error('Не удалось загрузить отзывы.');
  }
  return (data ?? []) as unknown as Review[];
}

export async function canReview(productId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_review', {
    p_product_id: productId,
  });
  if (error) {
    console.error('Supabase:', error);
    return false;
  }
  return data === true;
}

export async function saveReview(
  productId: number,
  rating: number,
  text: string
): Promise<void> {
  const { error } = await supabase.from('reviews').upsert(
    { product_id: productId, rating, text },
    { onConflict: 'product_id,user_id' }
  );

  if (error) {
    console.error('Supabase:', error);
    throw new Error(
      'Не удалось сохранить отзыв. Отзыв можно оставить после получения товара.'
    );
  }
}

export async function deleteReview(id: number): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) {
    console.error('Supabase:', error);
    throw new Error('Не удалось удалить отзыв.');
  }
}