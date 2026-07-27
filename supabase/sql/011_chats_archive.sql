-- Abapfy — Arquivamento de chats
--
-- Adiciona `archived` a `chats`: chats arquivados saem das listas "Chats
-- recentes"/dentro de projeto na sidebar, sem perder histórico (diferente de
-- excluir, que é definitivo via DELETE + RLS "dono" já existente em
-- 005_projects_and_chats.sql).

alter table public.chats add column if not exists archived boolean not null default false;

create index if not exists chats_user_archived_idx on public.chats (user_id, archived, updated_at desc);
