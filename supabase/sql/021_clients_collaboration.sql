-- v0.3.7. Apply after 001-020 and their RLS scripts, in the Supabase SQL Editor.
-- Assign the first master after this migration with:
-- select public.set_abapfy_master('master@example.com');
-- This function is intentionally callable only by the SQL owner/service role.

create table public.app_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('MASTER', 'ADMIN')),
  granted_at timestamptz not null default now()
);
alter table public.app_roles enable row level security;

create or replace function public.is_abapfy_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.app_roles where user_id = auth.uid() and role in ('MASTER','ADMIN')) $$;
create or replace function public.is_abapfy_master()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.app_roles where user_id = auth.uid() and role = 'MASTER') $$;
grant execute on function public.is_abapfy_admin() to authenticated;
grant execute on function public.is_abapfy_master() to authenticated;
create policy app_roles_read on public.app_roles for select to authenticated
  using (user_id = auth.uid() or public.is_abapfy_master());

create or replace function public.set_abapfy_master(p_email text)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_user_id uuid;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception 'Run this function only in the Supabase SQL Editor as database owner';
  end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then raise exception 'User email not found'; end if;
  insert into public.app_roles(user_id, role) values (v_user_id, 'MASTER')
    on conflict (user_id) do update set role = 'MASTER', granted_at = now();
end $$;
revoke all on function public.set_abapfy_master(text) from public, anon, authenticated;

create table public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id)
);
alter table public.admin_invitations enable row level security;
create policy admin_invitations_master_read on public.admin_invitations for select to authenticated
  using (public.is_abapfy_master());

create or replace function public.create_admin_invitation(p_email text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_code uuid;
begin
  if not public.is_abapfy_master() then raise exception 'Master required'; end if;
  if length(trim(p_email)) < 3 or position('@' in p_email) = 0 then raise exception 'Invalid email'; end if;
  insert into public.admin_invitations(email, invited_by)
    values (lower(trim(p_email)), auth.uid()) returning code into v_code;
  return v_code;
end $$;
create or replace function public.accept_admin_invitation(p_code uuid)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_invitation public.admin_invitations%rowtype; v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then raise exception 'Login required'; end if;
  select * into v_invitation from public.admin_invitations
    where code = p_code and accepted_at is null and expires_at > now() for update;
  if not found or lower(v_invitation.email) <> lower(v_email) then return false; end if;
  insert into public.app_roles(user_id, role) values (auth.uid(), 'ADMIN')
    on conflict (user_id) do update set role = case when public.app_roles.role = 'MASTER' then 'MASTER' else 'ADMIN' end;
  update public.admin_invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_invitation.id;
  return true;
end $$;
revoke all on function public.create_admin_invitation(text) from public, anon;
revoke all on function public.accept_admin_invitation(uuid) from public, anon;
grant execute on function public.create_admin_invitation(text) to authenticated;
grant execute on function public.accept_admin_invitation(uuid) to authenticated;

create or replace function public.revoke_abapfy_admin(p_email text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid;
begin
  if not public.is_abapfy_master() then raise exception 'Master required'; end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then return false; end if;
  delete from public.app_roles where user_id = v_user_id and role = 'ADMIN';
  return found;
end $$;
revoke all on function public.revoke_abapfy_admin(text) from public, anon;
grant execute on function public.revoke_abapfy_admin(text) to authenticated;

create or replace function public.list_abapfy_admins()
returns table(email text, role text, granted_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_abapfy_master() then raise exception 'Master required'; end if;
  return query select u.email::text, r.role, r.granted_at
    from public.app_roles r join auth.users u on u.id = r.user_id
    order by r.role, u.email;
end $$;
revoke all on function public.list_abapfy_admins() from public, anon;
grant execute on function public.list_abapfy_admins() to authenticated;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  workbook_md text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated before update on public.clients
  for each row execute function public.set_updated_at();
create table public.client_modules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, name), unique(client_id, id)
);
create trigger client_modules_updated before update on public.client_modules
  for each row execute function public.set_updated_at();
create or replace function public.seed_client_modules()
returns trigger language plpgsql set search_path = public as $$
begin
  insert into public.client_modules(client_id, name, created_by)
  values (new.id, 'Programas', new.created_by),
         (new.id, 'EFs', new.created_by),
         (new.id, 'DTECs', new.created_by);
  return new;
end $$;
create trigger clients_seed_modules after insert on public.clients
  for each row execute function public.seed_client_modules();
alter table public.clients enable row level security;
alter table public.client_modules enable row level security;
create policy clients_read on public.clients for select to authenticated using (true);
create policy clients_insert on public.clients for insert to authenticated
  with check (public.is_abapfy_admin() and created_by = auth.uid());
create policy clients_update on public.clients for update to authenticated
  using (public.is_abapfy_admin()) with check (public.is_abapfy_admin() and updated_by = auth.uid());
create policy clients_delete on public.clients for delete to authenticated using (public.is_abapfy_admin());
create policy client_modules_read on public.client_modules for select to authenticated using (true);
create policy client_modules_insert on public.client_modules for insert to authenticated
  with check (public.is_abapfy_admin() and created_by = auth.uid());
create policy client_modules_update on public.client_modules for update to authenticated
  using (public.is_abapfy_admin()) with check (public.is_abapfy_admin());
create policy client_modules_delete on public.client_modules for delete to authenticated using (public.is_abapfy_admin());

create table public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  module_id uuid not null,
  name text not null,
  content text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, module_id) references public.client_modules(client_id, id) on delete cascade
);
create trigger client_files_updated before update on public.client_files
  for each row execute function public.set_updated_at();
alter table public.client_files enable row level security;
create policy client_files_read on public.client_files for select to authenticated using (true);
create policy client_files_insert on public.client_files for insert to authenticated with check (user_id = auth.uid());
create policy client_files_update on public.client_files for update to authenticated using (true) with check (true);
create policy client_files_delete on public.client_files for delete to authenticated using (true);

-- Preserve old content in a shared legacy client. New writes require explicit client/module.
insert into public.clients(name, description)
select 'Legado', 'Conteúdo criado antes da versão 0.3.7'
where exists (select 1 from public.projects) or exists (select 1 from public.chats)
on conflict (name) do nothing;
insert into public.client_modules(client_id, name)
select id, 'Geral' from public.clients where name = 'Legado'
on conflict (client_id, name) do nothing;
alter table public.projects add column client_id uuid references public.clients(id);
alter table public.chats add column client_id uuid references public.clients(id);
alter table public.chats add column module_id uuid;
update public.projects set client_id = (select id from public.clients where name = 'Legado') where client_id is null;
update public.chats set client_id = (select id from public.clients where name = 'Legado'),
  module_id = (select m.id from public.client_modules m join public.clients c on c.id = m.client_id where c.name = 'Legado' and m.name = 'Geral')
where client_id is null;
alter table public.projects alter column client_id set not null;
alter table public.chats alter column client_id set not null;
alter table public.chats alter column module_id set not null;
alter table public.chats add constraint chats_client_module_fk foreign key(client_id, module_id)
  references public.client_modules(client_id, id);
create index projects_client_idx on public.projects(client_id);
create index chats_client_module_idx on public.chats(client_id, module_id, updated_at desc);

create or replace function public.validate_chat_project_client()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.project_id is not null and not exists
    (select 1 from public.projects where id = new.project_id and client_id = new.client_id) then
    raise exception 'Project belongs to another client';
  end if;
  return new;
end $$;
create trigger chats_validate_client before insert or update on public.chats
  for each row execute function public.validate_chat_project_client();

create or replace function public.keep_content_scope()
returns trigger language plpgsql as $$
begin
  if new.client_id is distinct from old.client_id then raise exception 'Client cannot be changed'; end if;
  if tg_table_name = 'chats' and new.module_id is distinct from old.module_id then
    raise exception 'Chat module cannot be changed';
  end if;
  return new;
end $$;
create trigger projects_keep_client before update on public.projects
  for each row execute function public.keep_content_scope();
create trigger chats_keep_scope before update on public.chats
  for each row execute function public.keep_content_scope();
create trigger client_modules_keep_client before update on public.client_modules
  for each row execute function public.keep_content_scope();
create trigger client_files_keep_scope before update on public.client_files
  for each row execute function public.keep_content_scope();

-- Authorship is immutable, even when all authenticated collaborators can edit content.
create or replace function public.keep_content_author()
returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id then raise exception 'Author cannot be changed'; end if;
  return new;
end $$;
create trigger projects_keep_author before update on public.projects for each row execute function public.keep_content_author();
create trigger chats_keep_author before update on public.chats for each row execute function public.keep_content_author();
create trigger project_documents_keep_author before update on public.project_documents for each row execute function public.keep_content_author();
create trigger project_document_chunks_keep_author before update on public.project_document_chunks for each row execute function public.keep_content_author();
create trigger client_files_keep_author before update on public.client_files for each row execute function public.keep_content_author();

drop policy if exists projects_select_own on public.projects;
drop policy if exists projects_insert_own on public.projects;
drop policy if exists projects_update_own on public.projects;
drop policy if exists projects_delete_own on public.projects;
create policy projects_read_shared on public.projects for select to authenticated using (true);
create policy projects_insert_shared on public.projects for insert to authenticated with check (user_id = auth.uid());
create policy projects_update_shared on public.projects for update to authenticated using (true) with check (true);
create policy projects_delete_shared on public.projects for delete to authenticated using (true);
drop policy if exists chats_select_own on public.chats;
drop policy if exists chats_insert_own on public.chats;
drop policy if exists chats_update_own on public.chats;
drop policy if exists chats_delete_own on public.chats;
create policy chats_read_shared on public.chats for select to authenticated using (true);
create policy chats_insert_shared on public.chats for insert to authenticated with check (user_id = auth.uid());
create policy chats_update_shared on public.chats for update to authenticated using (true) with check (true);
create policy chats_delete_shared on public.chats for delete to authenticated using (true);
drop policy if exists chat_messages_select_own on public.chat_messages;
drop policy if exists chat_messages_insert_own on public.chat_messages;
drop policy if exists chat_messages_delete_own on public.chat_messages;
create policy chat_messages_read_shared on public.chat_messages for select to authenticated using (true);
create policy chat_messages_insert_shared on public.chat_messages for insert to authenticated
  with check (user_id = auth.uid());
create policy chat_messages_delete_shared on public.chat_messages for delete to authenticated using (true);

drop policy if exists project_documents_select_own on public.project_documents;
drop policy if exists project_documents_insert_own on public.project_documents;
drop policy if exists project_documents_update_own on public.project_documents;
drop policy if exists project_documents_delete_own on public.project_documents;
create policy project_documents_read_shared on public.project_documents for select to authenticated using (true);
create policy project_documents_insert_shared on public.project_documents for insert to authenticated
  with check (user_id = auth.uid());
create policy project_documents_update_shared on public.project_documents for update to authenticated using (true) with check (true);
create policy project_documents_delete_shared on public.project_documents for delete to authenticated using (true);
drop policy if exists project_document_chunks_select_own on public.project_document_chunks;
drop policy if exists project_document_chunks_insert_own on public.project_document_chunks;
drop policy if exists project_document_chunks_update_own on public.project_document_chunks;
drop policy if exists project_document_chunks_delete_own on public.project_document_chunks;
create policy project_document_chunks_read_shared on public.project_document_chunks for select to authenticated using (true);
create policy project_document_chunks_insert_shared on public.project_document_chunks for insert to authenticated
  with check (user_id = auth.uid() and exists
    (select 1 from public.project_documents d where d.id = document_id and d.project_id = project_id));
create policy project_document_chunks_update_shared on public.project_document_chunks for update to authenticated using (true) with check (true);
create policy project_document_chunks_delete_shared on public.project_document_chunks for delete to authenticated using (true);

-- Search functions from 017 must no longer filter by the uploading author.
create or replace function public.match_project_knowledge(
  p_project_id uuid, p_query_embedding extensions.vector(1536), p_match_count integer default 6)
returns table(document_id uuid, document_name text, category text, version text,
  updated_at timestamptz, excerpt text, confidence double precision)
language sql stable security invoker set search_path = public, extensions as $$
  select d.id, d.name, d.category, d.version, d.updated_at, c.content,
    greatest(0::double precision, 1 - (c.embedding <=> p_query_embedding))
  from public.project_document_chunks c join public.project_documents d on d.id = c.document_id
  where c.project_id = p_project_id and c.embedding is not null
  order by c.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 12)
$$;
create or replace function public.search_project_knowledge_text(
  p_project_id uuid, p_query text, p_match_count integer default 6)
returns table(document_id uuid, document_name text, category text, version text,
  updated_at timestamptz, excerpt text, confidence double precision)
language sql stable security invoker set search_path = public as $$
  with ranked as (
    select d.id, d.name, d.category, d.version, d.updated_at, c.content,
      token_match.matches as rank
    from public.project_document_chunks c join public.project_documents d on d.id = c.document_id
    cross join lateral (select count(*)::double precision as matches
      from regexp_split_to_table(lower(p_query), '\s+') token
      where char_length(token) >= 3 and lower(c.content) like '%' || token || '%') token_match
    where c.project_id = p_project_id and token_match.matches > 0
  )
  select id, name, category, version, updated_at, content,
    least(0.79::double precision, 0.34::double precision + rank * 0.07)
  from ranked order by rank desc, updated_at desc
  limit least(greatest(p_match_count, 1), 12)
$$;

-- Author names are visible to signed-in collaborators, while profile edits stay private.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_read_collaborators on public.profiles for select to authenticated using (true);
