-- Apply after 029. Keep the Storage policy simple and evaluate the shared
-- client/module lookup in a narrowly scoped SECURITY DEFINER function.
-- This avoids nested RLS on client_modules during a Storage insert.
begin;

create or replace function public.can_upload_client_file_path(p_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and array_length(storage.foldername(p_path), 1) = 3
    and (storage.foldername(p_path))[3] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1 from public.client_modules m
      where m.client_id::text = (storage.foldername(p_path))[1]
        and m.id::text = (storage.foldername(p_path))[2]
    );
$$;
revoke all on function public.can_upload_client_file_path(text) from public, anon;
grant execute on function public.can_upload_client_file_path(text) to authenticated;

drop policy if exists client_files_storage_insert on storage.objects;
create policy client_files_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-files'
    and public.can_upload_client_file_path(storage.objects.name)
  );

commit;
