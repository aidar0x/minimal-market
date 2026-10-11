-- Таблица товаров
create table public.products (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  price integer not null check (price > 0),
  emoji text not null default '📦',
  description text not null default '',
  image_url text,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Читать товары могут все
create policy "Все могут читать товары"
  on public.products for select
  using (true);

-- Добавлять могут только вошедшие и только от своего имени
create policy "Авторизованные добавляют свои товары"
  on public.products for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Менять и удалять может только владелец
create policy "Владелец изменяет свои товары"
  on public.products for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Владелец удаляет свои товары"
  on public.products for delete
  to authenticated
  using (auth.uid() = user_id);

-- Хранилище для фотографий
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Вошедшие загружают фото в свою папку"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Владелец удаляет свои фото"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );