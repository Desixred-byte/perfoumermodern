create extension if not exists pgcrypto;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 40),
  user_email text not null,
  perfume_slug text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 2 and 600),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.comments
  add column if not exists username text;

alter table public.comments
  add column if not exists avatar_url text;

update public.comments
set username = left(split_part(user_email, '@', 1), 40)
where username is null or btrim(username) = '';

alter table public.comments
  alter column username set not null;

alter table public.comments
  drop constraint if exists comments_username_length_check;

alter table public.comments
  add constraint comments_username_length_check check (char_length(username) between 3 and 40);

create index if not exists comments_perfume_slug_created_at_idx
  on public.comments (perfume_slug, created_at desc);

create unique index if not exists comments_user_perfume_unique_idx
  on public.comments (user_id, perfume_slug);

create table if not exists public.wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  perfume_slug text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, perfume_slug)
);

create index if not exists wishlists_user_created_at_idx
  on public.wishlists (user_id, created_at desc);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  perfume_slug text not null,
  size_ml integer not null check (size_ml > 0),
  quantity integer not null default 1 check (quantity > 0 and quantity <= 50),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkout_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 3 and 120),
  phone text not null check (char_length(btrim(phone)) between 7 and 24),
  line1 text not null check (char_length(btrim(line1)) between 5 and 240),
  line2 text not null default '',
  city text not null check (char_length(btrim(city)) between 2 and 120),
  postal_code text not null check (char_length(btrim(postal_code)) between 3 and 20),
  country text not null check (char_length(btrim(country)) between 2 and 120),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  locale text not null default 'en' check (char_length(locale) between 2 and 10),
  title text not null default '' check (char_length(title) <= 140),
  preview text not null default '' check (char_length(preview) <= 300),
  messages_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '3 hours')
);

alter table public.cart_items
  add column if not exists perfume_slug text;

alter table public.cart_items
  add column if not exists size_ml integer;

alter table public.cart_items
  add column if not exists quantity integer not null default 1;

alter table public.cart_items
  add column if not exists unit_price numeric(10, 2) not null default 0;

alter table public.cart_items
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.cart_items
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.cart_items
  alter column perfume_slug set not null;

alter table public.cart_items
  alter column size_ml set not null;

alter table public.cart_items
  drop constraint if exists cart_items_size_ml_check;

alter table public.cart_items
  add constraint cart_items_size_ml_check check (size_ml > 0);

alter table public.cart_items
  drop constraint if exists cart_items_quantity_check;

alter table public.cart_items
  add constraint cart_items_quantity_check check (quantity > 0 and quantity <= 50);

alter table public.cart_items
  drop constraint if exists cart_items_unit_price_check;

alter table public.cart_items
  add constraint cart_items_unit_price_check check (unit_price >= 0);

create unique index if not exists cart_items_user_variant_unique_idx
  on public.cart_items (user_id, perfume_slug, size_ml);

create index if not exists cart_items_user_created_at_idx
  on public.cart_items (user_id, created_at desc);

create index if not exists checkout_addresses_user_created_at_idx
  on public.checkout_addresses (user_id, created_at desc);

create index if not exists ai_chat_sessions_user_last_message_idx
  on public.ai_chat_sessions (user_id, last_message_at desc);

create index if not exists ai_chat_sessions_user_expires_idx
  on public.ai_chat_sessions (user_id, expires_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_cart_items_updated_at on public.cart_items;
create trigger set_cart_items_updated_at
before update on public.cart_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_checkout_addresses_updated_at on public.checkout_addresses;
create trigger set_checkout_addresses_updated_at
before update on public.checkout_addresses
for each row
execute function public.set_updated_at();

drop trigger if exists set_ai_chat_sessions_updated_at on public.ai_chat_sessions;
create trigger set_ai_chat_sessions_updated_at
before update on public.ai_chat_sessions
for each row
execute function public.set_updated_at();

alter table public.comments enable row level security;
alter table public.wishlists enable row level security;
alter table public.cart_items enable row level security;
alter table public.checkout_addresses enable row level security;
alter table public.ai_chat_sessions enable row level security;

drop policy if exists "Comments are visible to everyone" on public.comments;
create policy "Comments are visible to everyone"
  on public.comments
  for select
  using (true);

drop policy if exists "Users can insert own comments" on public.comments;
create policy "Users can insert own comments"
  on public.comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and user_email = coalesce(auth.jwt() ->> 'email', '')
  );

drop policy if exists "Users can update own comments" on public.comments;
create policy "Users can update own comments"
  on public.comments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and user_email = coalesce(auth.jwt() ->> 'email', '')
  );

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own wishlists" on public.wishlists;
create policy "Users can read own wishlists"
  on public.wishlists
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own wishlists" on public.wishlists;
create policy "Users can insert own wishlists"
  on public.wishlists
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own wishlists" on public.wishlists;
create policy "Users can delete own wishlists"
  on public.wishlists
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own cart items" on public.cart_items;
create policy "Users can read own cart items"
  on public.cart_items
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own cart items" on public.cart_items;
create policy "Users can insert own cart items"
  on public.cart_items
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own cart items" on public.cart_items;
create policy "Users can update own cart items"
  on public.cart_items
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own cart items" on public.cart_items;
create policy "Users can delete own cart items"
  on public.cart_items
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own checkout addresses" on public.checkout_addresses;
create policy "Users can read own checkout addresses"
  on public.checkout_addresses
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own checkout addresses" on public.checkout_addresses;
create policy "Users can insert own checkout addresses"
  on public.checkout_addresses
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own checkout addresses" on public.checkout_addresses;
create policy "Users can update own checkout addresses"
  on public.checkout_addresses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own checkout addresses" on public.checkout_addresses;
create policy "Users can delete own checkout addresses"
  on public.checkout_addresses
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own ai chat sessions" on public.ai_chat_sessions;
create policy "Users can read own ai chat sessions"
  on public.ai_chat_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own ai chat sessions" on public.ai_chat_sessions;
create policy "Users can insert own ai chat sessions"
  on public.ai_chat_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own ai chat sessions" on public.ai_chat_sessions;
create policy "Users can update own ai chat sessions"
  on public.ai_chat_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own ai chat sessions" on public.ai_chat_sessions;
create policy "Users can delete own ai chat sessions"
  on public.ai_chat_sessions
  for delete
  to authenticated
  using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar images" on storage.objects;
create policy "Users can upload own avatar images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar images" on storage.objects;
create policy "Users can update own avatar images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar images" on storage.objects;
create policy "Users can delete own avatar images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Orders table for tracking customer purchases
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_method text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'completed', 'failed', 'refunded')),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  currency text not null default 'AZN',
  items_json jsonb not null default '[]'::jsonb,
  delivery_address_json jsonb,
  tracking_number text,
  kapital_order_id text,
  kapital_payment_id text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists orders_order_number_idx
  on public.orders (order_number);

create index if not exists orders_status_idx
  on public.orders (status);

create policy if not exists "Users can view their own orders"
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid());

create policy if not exists "Users can update their own order notes"
  on public.orders
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
