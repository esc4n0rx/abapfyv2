-- Apply after 022 (and preferably after 023-027). Repairs the upload path in the screenshot.
-- Storage insert happens before public.client_files insert, so the policy checks
-- the client/module path, not a file row that does not exist yet.
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-files', 'client-files', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists client_files_storage_read on storage.objects;
drop policy if exists client_files_storage_insert on storage.objects;
create policy client_files_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'client-files');
create policy client_files_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-files'
    and array_length(storage.foldername(storage.objects.name), 1) = 3
    and (storage.foldername(storage.objects.name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (select 1 from public.client_modules m
      where m.client_id::text = (storage.foldername(storage.objects.name))[1]
        and m.id::text = (storage.foldername(storage.objects.name))[2])
  );

drop policy if exists client_files_insert on public.client_files;
create policy client_files_insert on public.client_files for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.client_modules m
    where m.id = client_files.module_id and m.client_id = client_files.client_id
  ));
