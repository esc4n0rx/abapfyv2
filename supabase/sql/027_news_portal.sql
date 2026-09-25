-- Apply after 026. Only administrators publish; all signed-in users can read and like.
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 180),
  summary text not null default '',
  body_md text not null check (length(trim(body_md)) > 0),
  author_id uuid not null references auth.users(id),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger news_posts_updated before update on public.news_posts
  for each row execute function public.set_updated_at();
create or replace function public.keep_news_author()
returns trigger language plpgsql as $$
begin
  if new.author_id is distinct from old.author_id then raise exception 'Author cannot be changed'; end if;
  return new;
end $$;
create trigger news_posts_keep_author before update on public.news_posts
  for each row execute function public.keep_news_author();
alter table public.news_posts enable row level security;
create policy news_posts_read on public.news_posts for select to authenticated
  using (published or public.is_abapfy_admin());
create policy news_posts_insert on public.news_posts for insert to authenticated
  with check (public.is_abapfy_admin() and author_id = auth.uid());
create policy news_posts_update on public.news_posts for update to authenticated
  using (public.is_abapfy_admin()) with check (public.is_abapfy_admin());
create policy news_posts_delete on public.news_posts for delete to authenticated
  using (public.is_abapfy_admin());

create table public.news_likes (
  post_id uuid not null references public.news_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.news_likes enable row level security;
create policy news_likes_read on public.news_likes for select to authenticated using (true);
create policy news_likes_insert on public.news_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.news_posts p where p.id = post_id and p.published));
create policy news_likes_delete on public.news_likes for delete to authenticated using (user_id = auth.uid());
