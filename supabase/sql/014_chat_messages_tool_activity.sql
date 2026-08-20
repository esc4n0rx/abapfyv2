-- Abapfy — Persistência do badge de uso de ferramentas (skills + MCP)
--
-- Até aqui a badge de "ferramenta em uso" (ver ChatMessageItem.tsx) vivia só
-- no chatRuntimeStore em memória: reabrir um chat salvo não mostrava mais
-- quais skills/ferramentas MCP rodaram naquela resposta específica. Persistir
-- o snapshot final (array [{id, label, kind, status}]) junto da mensagem do
-- assistente resolve isso sem precisar de tabela nova.

alter table public.chat_messages
  add column if not exists tool_activity jsonb;

comment on column public.chat_messages.tool_activity is
  'Snapshot final das badges de skill/ferramenta MCP exibidas durante a resposta do assistente (array de {id, label, kind, status}), null quando nenhuma foi usada.';
