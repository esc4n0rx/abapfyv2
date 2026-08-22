-- Abapfy — isolamento da base de conhecimento por usuário e projeto

alter table public.project_documents enable row level security;
alter table public.project_document_chunks enable row level security;

drop policy if exists "project_documents_select_own" on public.project_documents;
create policy "project_documents_select_own" on public.project_documents
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "project_documents_insert_own" on public.project_documents;
create policy "project_documents_insert_own" on public.project_documents
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
    )
  );
drop policy if exists "project_documents_update_own" on public.project_documents;
create policy "project_documents_update_own" on public.project_documents
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "project_documents_delete_own" on public.project_documents;
create policy "project_documents_delete_own" on public.project_documents
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "project_document_chunks_select_own" on public.project_document_chunks;
create policy "project_document_chunks_select_own" on public.project_document_chunks
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "project_document_chunks_insert_own" on public.project_document_chunks;
create policy "project_document_chunks_insert_own" on public.project_document_chunks
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.project_documents d
      where d.id = document_id and d.project_id = project_id and d.user_id = auth.uid()
    )
  );
drop policy if exists "project_document_chunks_update_own" on public.project_document_chunks;
create policy "project_document_chunks_update_own" on public.project_document_chunks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "project_document_chunks_delete_own" on public.project_document_chunks;
create policy "project_document_chunks_delete_own" on public.project_document_chunks
  for delete to authenticated using (auth.uid() = user_id);
