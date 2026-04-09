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

alter table public.comments enable row level security;
alter table public.wishlists enable row level security;

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
