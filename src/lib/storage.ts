import { supabase } from './supabase';

const BUCKET = 'product-images';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 МБ
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Загружает фото в папку пользователя и возвращает публичную ссылку
export async function uploadProductImage(
  file: File,
  userId: string
): Promise<string> {
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : 'jpg';

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
  });

  if (error) {
    console.error('Storage:', error);
    throw new Error('Не удалось загрузить фото. Попробуйте ещё раз.');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Удаляет фото по его публичной ссылке (ошибки не пробрасываем)
export async function deleteProductImage(url?: string | null) {
  if (!url) return;

  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(url.slice(index + marker.length));
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) console.error('Storage:', error);
}