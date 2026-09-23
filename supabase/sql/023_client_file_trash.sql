-- Apply after 022_client_folders_and_original_files.sql.
alter table public.client_files
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id);
create index client_files_trash_idx on public.client_files(client_id, deleted_at desc)
  where deleted_at is not null;

create table public.client_file_events (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null,
  client_id uuid not null,
  module_id uuid not null,
  file_name text not null,
  action text not null check (action in ('TRASHED', 'RESTORED', 'PURGED')),
  actor_id uuid not null,
  occurred_at timestamptz not null default now()
);
create index client_file_events_client_time_idx on public.client_file_events(client_id, occurred_at desc);
alter table public.client_file_events enable row level security;
create policy client_file_events_read on public.client_file_events
  for select to authenticated using (true);

create or replace function public.guard_client_file_trash()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if not public.is_abapfy_admin() then raise exception 'Only administrators can empty the trash'; end if;
    if old.deleted_at is null then raise exception 'Move the file to the trash before purging it'; end if;
    return old;
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_at := now();
    new.deleted_by := auth.uid();
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
  elsif new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by then
    raise exception 'Trash metadata cannot be edited directly';
  end if;
  return new;
end $$;
create trigger client_files_guard_trash before update or delete on public.client_files
  for each row execute function public.guard_client_file_trash();

create or replace function public.audit_client_file_trash()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into public.client_file_events(file_id, client_id, module_id, file_name, action, actor_id)
    values (old.id, old.client_id, old.module_id, old.name, 'PURGED', auth.uid());
    return old;
  end if;
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.client_file_events(file_id, client_id, module_id, file_name, action, actor_id)
    values (new.id, new.client_id, new.module_id, new.name, 'TRASHED', auth.uid());
  elsif old.deleted_at is not null and new.deleted_at is null then
    insert into public.client_file_events(file_id, client_id, module_id, file_name, action, actor_id)
    values (new.id, new.client_id, new.module_id, new.name, 'RESTORED', auth.uid());
  end if;
  return new;
end $$;
create trigger client_files_audit_trash after update or delete on public.client_files
  for each row execute function public.audit_client_file_trash();

drop policy if exists client_files_delete on public.client_files;
create policy client_files_delete_admin on public.client_files for delete to authenticated
  using (public.is_abapfy_admin() and deleted_at is not null);
drop policy if exists client_files_storage_delete on storage.objects;
create policy client_files_storage_delete_admin on storage.objects for delete to authenticated
  using (bucket_id = 'client-files' and (
    (public.is_abapfy_admin() and exists (
      select 1 from public.client_files f where f.storage_path = name and f.deleted_at is not null
    )) or
    (owner_id = auth.uid()::text and not exists (
      select 1 from public.client_files f where f.storage_path = name
    ))
  ));
