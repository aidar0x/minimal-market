-- ============================================================
-- Minimal Market: полная схема (новый проект Supabase)
-- Выполнить целиком в SQL Editor.
-- ============================================================

-- ---------- Общая функция ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Профили ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  shop_name text,
  is_seller boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false); $$;

create or replace function public.is_seller()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_seller from public.profiles where id = auth.uid()), false); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "Профили видят все"
  on public.profiles for select using (true);

create policy "Пользователь меняет свой профиль"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- is_seller и is_admin меняются только из SQL Editor (и позже из админки)
revoke update on public.profiles from anon, authenticated;
grant update (name, avatar_url, shop_name) on public.profiles to authenticated;

-- ---------- Категории ----------
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  parent_id bigint references public.categories(id) on delete set null
);
alter table public.categories enable row level security;

create policy "Категории читают все"
  on public.categories for select using (true);

create policy "Категории меняет только админ"
  on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.categories (name, slug) values
  ('Электроника', 'electronics'),
  ('Аксессуары', 'accessories'),
  ('Для дома', 'home'),
  ('Одежда', 'clothes'),
  ('Книги', 'books'),
  ('Другое', 'other')
on conflict (slug) do nothing;

-- ---------- Товары ----------
create table public.products (
  id bigint generated always as identity primary key,
  seller_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  category_id bigint not null
    references public.categories(id) on delete restrict,
  name text not null,
  brand text,
  price integer not null check (price > 0),
  old_price integer check (old_price is null or old_price > 0),
  stock integer not null default 0 check (stock >= 0),
  description text not null default '',
  specs jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('draft', 'active', 'hidden')),
  sku text generated always as ('MM-' || lpad(id::text, 6, '0')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);
create index products_seller_idx on public.products (seller_id);
create index products_status_idx on public.products (status);

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

create policy "Читать активные товары и свои"
  on public.products for select
  using (status = 'active' or seller_id = auth.uid() or public.is_admin());

create policy "Продавцы добавляют свои товары"
  on public.products for insert to authenticated
  with check (seller_id = auth.uid() and public.is_seller());

create policy "Владелец или админ меняет товар"
  on public.products for update to authenticated
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

create policy "Владелец или админ удаляет товар"
  on public.products for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin());

-- ---------- Фото товаров (до 5) ----------
create table public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  url text not null,
  position smallint not null default 0 check (position between 0 and 4),
  unique (product_id, position)
);
create index product_images_product_idx on public.product_images (product_id);
alter table public.product_images enable row level security;

create policy "Фото товаров читают все"
  on public.product_images for select using (true);

create policy "Владелец управляет фото своего товара"
  on public.product_images for all to authenticated
  using (exists (select 1 from public.products p
    where p.id = product_images.product_id
      and (p.seller_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.products p
    where p.id = product_images.product_id
      and (p.seller_id = auth.uid() or public.is_admin())));

-- ---------- Избранное и корзина ----------
create table public.favorites (
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.cart_items (
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create trigger cart_items_touch_updated_at
  before update on public.cart_items
  for each row execute function public.touch_updated_at();

alter table public.favorites enable row level security;
alter table public.cart_items enable row level security;

create policy "Свое избранное"
  on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Своя корзина"
  on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Заказы ----------
create table public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'created'
    check (status in ('created','paid','assembled','shipped','delivered','cancelled')),
  total integer not null check (total >= 0),
  address text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  price integer not null check (price > 0),
  status text not null default 'created'
    check (status in ('created','paid','assembled','shipped','delivered','cancelled'))
);

create index orders_user_idx on public.orders (user_id);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_seller_idx on public.order_items (seller_id);

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.is_order_seller(p_order_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.order_items
    where order_id = p_order_id and seller_id = auth.uid()
  );
$$;

-- Только чтение: создавать и менять заказы можно лишь через функции
create policy "Свои заказы"
  on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Продавец видит заказы со своими товарами"
  on public.orders for select to authenticated
  using (public.is_order_seller(id));

create policy "Позиции видят покупатель, продавец и админ"
  on public.order_items for select to authenticated
  using (
    seller_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid())
  );

-- ---------- Функции заказов ----------
create or replace function public.create_order(
  p_address text, p_phone text, p_expected_total integer
)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order_id bigint;
  v_total integer := 0;
  r record;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_address, ''))) < 5 then raise exception 'ADDRESS_REQUIRED'; end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'PHONE_INVALID';
  end if;
  if not exists (select 1 from public.cart_items where user_id = v_user) then
    raise exception 'CART_EMPTY';
  end if;

  for r in
    select p.id, p.name, p.price, p.stock, p.status, c.quantity
    from public.cart_items c
    join public.products p on p.id = c.product_id
    where c.user_id = v_user
    order by p.id
    for update of p
  loop
    if r.status <> 'active' then raise exception 'UNAVAILABLE:%', r.name; end if;
    if r.stock < r.quantity then raise exception 'NO_STOCK:%', r.name; end if;
    v_total := v_total + r.price * r.quantity;
  end loop;

  if v_total <> p_expected_total then
    raise exception 'PRICE_CHANGED:%', v_total;
  end if;

  insert into public.orders (user_id, total, address, phone)
  values (v_user, v_total, trim(p_address), trim(p_phone))
  returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, seller_id, product_name, quantity, price)
  select v_order_id, p.id, p.seller_id, p.name, c.quantity, p.price
  from public.cart_items c
  join public.products p on p.id = c.product_id
  where c.user_id = v_user;

  update public.products p
  set stock = p.stock - c.quantity
  from public.cart_items c
  where c.product_id = p.id and c.user_id = v_user;

  delete from public.cart_items where user_id = v_user;

  return v_order_id;
end;
$$;

create or replace function public.pay_order(p_order_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.orders set status = 'paid'
  where id = p_order_id and user_id = auth.uid() and status = 'created';
  if not found then raise exception 'ORDER_NOT_PAYABLE'; end if;

  update public.order_items set status = 'paid' where order_id = p_order_id;
end;
$$;

create or replace function public.cancel_order(p_order_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.orders set status = 'cancelled'
  where id = p_order_id and user_id = auth.uid() and status = 'created';
  if not found then raise exception 'ORDER_NOT_CANCELLABLE'; end if;

  update public.products p
  set stock = p.stock + i.quantity
  from public.order_items i
  where i.order_id = p_order_id and i.product_id = p.id;

  update public.order_items set status = 'cancelled' where order_id = p_order_id;
end;
$$;

create or replace function public.seller_set_item_status(
  p_item_id bigint, p_status text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.order_items%rowtype;
  v_new text;
begin
  select * into v_item from public.order_items
  where id = p_item_id and seller_id = auth.uid()
  for update;

  if not found then raise exception 'ITEM_NOT_FOUND'; end if;

  if not (
    (v_item.status = 'paid'      and p_status = 'assembled') or
    (v_item.status = 'assembled' and p_status = 'shipped') or
    (v_item.status = 'shipped'   and p_status = 'delivered')
  ) then
    raise exception 'BAD_TRANSITION';
  end if;

  update public.order_items set status = p_status where id = p_item_id;

  select case
    when bool_and(status = 'delivered') then 'delivered'
    when bool_and(status in ('shipped','delivered')) then 'shipped'
    when bool_and(status in ('assembled','shipped','delivered')) then 'assembled'
    else 'paid'
  end into v_new
  from public.order_items where order_id = v_item.order_id;

  update public.orders set status = v_new where id = v_item.order_id;
end;
$$;

revoke all on function public.create_order(text, text, integer) from public, anon;
revoke all on function public.pay_order(bigint) from public, anon;
revoke all on function public.cancel_order(bigint) from public, anon;
revoke all on function public.seller_set_item_status(bigint, text) from public, anon;
grant execute on function public.create_order(text, text, integer) to authenticated;
grant execute on function public.pay_order(bigint) to authenticated;
grant execute on function public.cancel_order(bigint) to authenticated;
grant execute on function public.seller_set_item_status(bigint, text) to authenticated;

-- ---------- Хранилище фото ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Продавцы загружают фото в свою папку"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_seller()
  );

create policy "Владелец удаляет свои фото"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';

-- ============================================================
-- ЭТАП 6: отзывы и рейтинги
-- ============================================================

alter table public.products
  add column if not exists rating_avg numeric(2,1) not null default 0,
  add column if not exists reviews_count integer not null default 0;

-- Из браузера можно менять только эти поля (рейтинг трогать нельзя)
revoke update on public.products from anon, authenticated;
grant update (name, category_id, brand, price, old_price, stock,
              description, specs, status)
  on public.products to authenticated;

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  text text not null default '' check (char_length(text) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists reviews_product_idx on public.reviews (product_id);

drop trigger if exists reviews_touch_updated_at on public.reviews;
create trigger reviews_touch_updated_at
  before update on public.reviews
  for each row execute function public.touch_updated_at();

-- Покупал ли пользователь этот товар (доставлен) и не свой ли он
create or replace function public.can_review(p_product_id bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.order_items i
    join public.orders o on o.id = i.order_id
    join public.products p on p.id = i.product_id
    where i.product_id = p_product_id
      and i.status = 'delivered'
      and o.user_id = auth.uid()
      and p.seller_id <> auth.uid()
  );
$$;

revoke all on function public.can_review(bigint) from public, anon;
grant execute on function public.can_review(bigint) to authenticated;

-- Пересчёт рейтинга товара
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_product bigint := coalesce(new.product_id, old.product_id);
begin
  update public.products
  set rating_avg = coalesce(
        (select round(avg(rating)::numeric, 1)
         from public.reviews where product_id = v_product), 0),
      reviews_count =
        (select count(*) from public.reviews where product_id = v_product)
  where id = v_product;
  return null;
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

alter table public.reviews enable row level security;

drop policy if exists "Отзывы читают все" on public.reviews;
create policy "Отзывы читают все"
  on public.reviews for select using (true);

drop policy if exists "Писать отзыв могут только купившие" on public.reviews;
create policy "Писать отзыв могут только купившие"
  on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and public.can_review(product_id));

drop policy if exists "Автор меняет свой отзыв" on public.reviews;
create policy "Автор меняет свой отзыв"
  on public.reviews for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Автор или админ удаляет отзыв" on public.reviews;
create policy "Автор или админ удаляет отзыв"
  on public.reviews for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());


notify pgrst, 'reload schema';

-- ============================================================
-- ЭТАП 7: админка и жалобы
-- ============================================================

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  review_id bigint references public.reviews(id) on delete set null,
  reason text not null check (reason in ('spam','fake','prohibited','other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open'
    check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status);

alter table public.reports enable row level security;

drop policy if exists "Жалобы видит автор и админ" on public.reports;
create policy "Жалобы видит автор и админ"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- Одна открытая жалоба от человека на один объект
drop policy if exists "Жалобу может подать любой вошедший" on public.reports;
create policy "Жалобу может подать любой вошедший"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and (product_id is not null or review_id is not null)
    and not exists (
      select 1 from public.reports r
      where r.reporter_id = auth.uid()
        and r.status = 'open'
        and r.product_id is not distinct from reports.product_id
        and r.review_id is not distinct from reports.review_id
    )
  );

drop policy if exists "Жалобы разбирает админ" on public.reports;
create policy "Жалобы разбирает админ"
  on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke update on public.reports from anon, authenticated;
grant update (status) on public.reports to authenticated;

-- Список пользователей с почтой (почта лежит в auth.users, напрямую её не прочитать)
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, name text, shop_name text,
  is_seller boolean, is_admin boolean, created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  return query
  select p.id, u.email::text, p.name, p.shop_name,
         p.is_seller, p.is_admin, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

-- Выдать или снять роль продавца
create or replace function public.admin_set_seller(
  p_user_id uuid, p_is_seller boolean, p_shop_name text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  update public.profiles
  set is_seller = p_is_seller,
      shop_name = case
        when p_is_seller then coalesce(nullif(trim(p_shop_name), ''), shop_name, name)
        else shop_name
      end
  where id = p_user_id;

  if not found then raise exception 'USER_NOT_FOUND'; end if;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_seller(uuid, boolean, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_seller(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';

-- ---------- Первый админ (подставьте почту после регистрации) ----------
-- update public.profiles set is_admin = true, is_seller = true
-- where id = (select id from auth.users where email = 'ВАША_ПОЧТА');