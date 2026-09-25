-- Apply after 028. In a correlated subquery, bare `name` resolved to
-- client_modules.name / client_files.name rather than storage.objects.name.
-- Re-running this migration is safe.
begin;

drop policy if exists client_files_storage_insert on storage.objects;
create policy client_files_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-files'
    and array_length(storage.foldername(storage.objects.name), 1) = 3
    and (storage.foldername(storage.objects.name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (select 1 from public.client_modules m
      where m.client_id::text = (storage.foldername(storage.objects.name))[1]
        and m.id::text = (storage.foldername(storage.objects.name))[2])
  );

-- The same name-shadowing bug also affects orphan cleanup and trash purge.
drop policy if exists client_files_storage_delete_admin on storage.objects;
create policy client_files_storage_delete_admin on storage.objects for delete to authenticated
  using (bucket_id = 'client-files' and (
    (public.is_abapfy_admin() and exists (
      select 1 from public.client_files f
      where f.storage_path = storage.objects.name and f.deleted_at is not null
    )) or
    (owner_id = auth.uid()::text and not exists (
      select 1 from public.client_files f where f.storage_path = storage.objects.name
    ))
  ));

commit;
