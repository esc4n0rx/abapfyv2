-- Apply after 021_clients_collaboration.sql.
create table public.client_folders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  module_id uuid not null,
  parent_id uuid,
  name text not null check (length(btrim(name)) between 1 and 120),
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, module_id) references public.client_modules(client_id, id) on delete cascade,
  foreign key (parent_id) references public.client_folders(id) on delete cascade,
  unique (id, client_id, module_id)
);
create trigger client_folders_updated before update on public.client_folders
  for each row execute function public.set_updated_at();
create trigger client_folders_keep_author before update on public.client_folders
  for each row execute function public.keep_content_author();
create trigger client_folders_keep_scope before update on public.client_folders
  for each row execute function public.keep_content_scope();

create or replace function public.validate_client_folder_parent()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.module_id is distinct from old.module_id then
    raise exception 'Folder module cannot be changed';
  end if;
  if new.parent_id is not null then
    if new.parent_id = new.id then raise exception 'A folder cannot be its own parent'; end if;
    if not exists (select 1 from public.client_folders p
      where p.id = new.parent_id and p.client_id = new.client_id and p.module_id = new.module_id) then
      raise exception 'Parent folder belongs to another module';
    end if;
    if tg_op = 'UPDATE' and exists (
      with recursive descendants as (
        select id from public.client_folders where parent_id = new.id
        union all
        select f.id from public.client_folders f join descendants d on f.parent_id = d.id
      ) select 1 from descendants where id = new.parent_id
    ) then raise exception 'A folder cannot be moved inside itself'; end if;
  end if;
  return new;
end $$;
create trigger client_folders_validate_parent before insert or update on public.client_folders
  for each row execute function public.validate_client_folder_parent();
create unique index client_folders_root_name on public.client_folders(module_id, lower(name)) where parent_id is null;
create unique index client_folders_child_name on public.client_folders(parent_id, lower(name)) where parent_id is not null;
create index client_folders_module_parent_idx on public.client_folders(module_id, parent_id);
alter table public.client_folders enable row level security;
create policy client_folders_read on public.client_folders for select to authenticated using (true);
create policy client_folders_insert on public.client_folders for insert to authenticated with check (user_id = auth.uid());
create policy client_folders_update on public.client_folders for update to authenticated using (true) with check (true);
create policy client_folders_delete on public.client_folders for delete to authenticated using (true);

alter table public.client_files add column folder_id uuid references public.client_folders(id) on delete set null;
alter table public.client_files add column storage_path text;
create unique index client_files_storage_path_unique on public.client_files(storage_path) where storage_path is not null;
create index client_files_module_folder_idx on public.client_files(module_id, folder_id);
create or replace function public.validate_client_file_folder()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.module_id is distinct from old.module_id or new.storage_path is distinct from old.storage_path) then
    raise exception 'File module and storage path cannot be changed';
  end if;
  if new.folder_id is not null and not exists (
    select 1 from public.client_folders f where f.id = new.folder_id
      and f.client_id = new.client_id and f.module_id = new.module_id
  ) then raise exception 'Folder belongs to another module'; end if;
  if new.storage_path is not null and new.storage_path !~
    ('^' || new.client_id::text || '/' || new.module_id::text || '/' || new.id::text || '/[^/]+$') then
    raise exception 'Invalid client file storage path';
  end if;
  return new;
end $$;
create trigger client_files_validate_folder before insert or update on public.client_files
  for each row execute function public.validate_client_file_folder();

insert into storage.buckets (id, name, public, file_size_limit)
values ('client-files', 'client-files', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
create policy client_files_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'client-files');
create policy client_files_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files' and exists (
    select 1 from public.client_modules m
    where m.client_id::text = (storage.foldername(name))[1]
      and m.id::text = (storage.foldername(name))[2]
      and (storage.foldername(name))[3] ~ '^[0-9a-f-]{36}$'
  ));
create policy client_files_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'client-files' and (owner_id = auth.uid()::text or exists (
    select 1 from public.client_files f where f.storage_path = name
  )));
