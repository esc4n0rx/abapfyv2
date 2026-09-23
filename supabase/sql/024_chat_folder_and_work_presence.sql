-- Apply after 023_client_file_trash.sql.
alter table public.chats add column folder_id uuid references public.client_folders(id) on delete set null;

create or replace function public.validate_chat_folder()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.folder_id is not null and not exists (
    select 1 from public.client_folders f
    where f.id = new.folder_id and f.client_id = new.client_id and f.module_id = new.module_id
  ) then raise exception 'Chat folder belongs to another client or module'; end if;
  return new;
end $$;
create trigger chats_validate_folder before insert or update on public.chats
  for each row execute function public.validate_chat_folder();
create index chats_folder_idx on public.chats(folder_id) where folder_id is not null;

create table public.client_work_presence (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  surface text not null check (surface in ('CHAT', 'DRIVE')),
  client_id uuid not null references public.clients(id) on delete cascade,
  module_id uuid not null,
  folder_id uuid references public.client_folders(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  foreign key (client_id, module_id) references public.client_modules(client_id, id) on delete cascade
);
create index client_work_presence_recent_idx on public.client_work_presence(last_seen_at desc);
create index client_work_presence_scope_idx on public.client_work_presence(client_id, module_id, folder_id);

create or replace function public.validate_client_work_presence()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Presence owner cannot be changed';
  end if;
  if new.folder_id is not null and not exists (
    select 1 from public.client_folders f where f.id = new.folder_id
      and f.client_id = new.client_id and f.module_id = new.module_id
  ) then raise exception 'Presence folder belongs to another client or module'; end if;
  if new.chat_id is not null and not exists (
    select 1 from public.chats c where c.id = new.chat_id
      and c.client_id = new.client_id and c.module_id = new.module_id
  ) then raise exception 'Presence chat belongs to another client or module'; end if;
  new.last_seen_at := now();
  return new;
end $$;
create trigger client_work_presence_validate before insert or update on public.client_work_presence
  for each row execute function public.validate_client_work_presence();
alter table public.client_work_presence enable row level security;
create policy client_work_presence_read on public.client_work_presence for select to authenticated using (true);
create policy client_work_presence_insert on public.client_work_presence for insert to authenticated
  with check (user_id = auth.uid());
create policy client_work_presence_update on public.client_work_presence for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy client_work_presence_delete on public.client_work_presence for delete to authenticated
  using (user_id = auth.uid());
