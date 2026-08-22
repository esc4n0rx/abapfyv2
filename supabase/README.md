# Supabase — Abapfy

Scripts SQL do projeto, aplicados via SQL Editor do Supabase ou pela CLI (`supabase db push`).

## Ordem de execução

1. `sql/001_profiles.sql` — tabela `profiles` (nome, cargo, empresa) + trigger que cria o
   perfil automaticamente a partir dos metadados enviados em `supabase.auth.signUp()`.
2. `rls/001_profiles_rls.sql` — políticas de Row Level Security: cada usuário só acessa o
   próprio perfil (`auth.uid() = id`).
3. `sql/002_settings.sql` — tabela `user_settings` (tema escolhido, provedor/modelo de IA
   padrão) e `ai_api_keys` (chaves de API por provedor: OpenAI, Gemini, Claude).
4. `rls/002_settings_rls.sql` — políticas de Row Level Security para as duas tabelas acima.
5. `sql/003_skills.sql` — tabela `user_skills`: estado ativo/inativo das skills built-in por
   usuário + skills `.md` importadas manualmente (nome, descrição, conteúdo).
6. `rls/003_skills_rls.sql` — políticas de Row Level Security para `user_skills`.
7. `sql/004_agents.sql` — tabela `default_agents` (catálogo global, só leitura para
   usuários) e `user_agents` (agentes customizados por usuário).
8. `rls/004_agents_rls.sql` — RLS: `default_agents` é somente-leitura para todo usuário
   autenticado (sem insert/update/delete via cliente); `user_agents` é CRUD do dono.
9. `sql/005_projects_and_chats.sql` — tabelas `projects`, `chats` e `chat_messages` (harness
   de conversas: histórico persistido, agente/system prompt ativado por chat, projeto
   opcional com agente padrão e contexto).
10. `rls/005_projects_and_chats_rls.sql` — políticas de Row Level Security (dono) para as
    três tabelas acima.
11. `sql/006_default_agents_seed.sql` — **seed dos agentes padrão** ("hardened": mais
    fortes/seguros/inteligentes que os do `default_agents_rows.sql` de referência).
    Idempotente (`upsert` por `id`) — pode rodar de novo com segurança.
12. `sql/007_agent_router_context.sql` — adiciona `chats.skill_ids` (snapshot das skills que
    o roteador considerou relevantes) e acrescenta a todo agente padrão o contrato de
    "Perguntas de Esclarecimento" (bloco ` ```clarify ` para pedir contexto ao usuário em vez
    de assumir). Idempotente — seguro rodar de novo mesmo com `006` já aplicado.
13. `sql/008_ef_consultant_docx.sql` — substitui o `content` do agente `ef_consultant`: agora
    responde num bloco ` ```ef-docx ` (em vez de `json`) com um campo `module` a mais — é o
    que aciona a geração automática do `.docx` oficial da EF a partir do modelo do cliente
    (`src/renderer/src/docs/MODELO BASE EF.docx`). Idempotente (`update` por `id`).
14. `sql/009_usage_rank.sql` — índice em `chat_messages(user_id, created_at)` + função
    `get_usage_rank()` (`security definer`): calcula o ranking de tokens de todos os
    usuários internamente mas só devolve a posição/percentil de quem chama — nunca dados
    individuais de outros usuários. Sem RLS extra (as estatísticas pessoais já são cobertas
    pela RLS de `chats`/`chat_messages` de `005`).
15. `sql/010_estimativa_parametros.sql` — tabelas `estimativa_parametros` (horas-base por
    tipo/objeto/complexidade) e `cliente_parametros` (fator multiplicador de produtividade
    por cliente/fase), ambas por usuário. Cria `seed_default_parametros(p_user_id)` e semeia
    os valores de referência para todo usuário existente e para cada novo cadastro (trigger
    `on_auth_user_created_parametros`). Editável em Configurações → Parâmetros; consultada em
    tempo real pelo agente `effort_estimator` a cada novo chat (ver `HomeScreen.tsx` e
    `estimativaParametrosStore.ts`).
16. `rls/010_estimativa_parametros_rls.sql` — RLS: CRUD restrito ao dono (`auth.uid() =
user_id`) nas duas tabelas acima.
17. `sql/011_chats_archive.sql` — adiciona arquivamento de conversas por usuário.
18. `sql/012_customizing_consultant_agent.sql` — cadastra, por upsert idempotente, o agente
    padrão “Consultor de Customizing SAP”, especializado em SPRO/IMG e configuração standard.
19. `sql/013_mcp_servers.sql` — cria `mcp_servers` e `mcp_agent_bindings`: configurações MCP
    por usuário e associação N:N entre servidores e agentes. Credenciais SAP não são
    persistidas nessas tabelas.
20. `rls/013_mcp_servers_rls.sql` — restringe servidores e vínculos MCP ao usuário dono e
    impede vincular um servidor pertencente a outra conta.
21. `sql/014_chat_messages_tool_activity.sql` — adiciona `chat_messages.tool_activity`
    (jsonb): snapshot final das badges de skill/ferramenta MCP usadas naquela resposta, pra
    sobreviver ao reabrir o chat. Sem RLS extra (já coberta pela política de `005`).
22. `sql/015_tasks_kanban.sql` — cria `tasks` e `task_subtasks`, com as quatro etapas fixas
    do quadro pessoal, prioridade, prazo, ordenação e checklist de subtarefas.
23. `rls/015_tasks_kanban_rls.sql` — restringe cards e subtarefas ao usuário dono e impede
    associar uma subtarefa a um card pertencente a outra conta.
24. `sql/016_effort_estimator_editable_objects.sql` — atualiza o contrato do Estimador de
    Esforço com cliente, natureza do objeto, resumo e multiplicadores explícitos necessários
    para a tabela editável e o recálculo local dos três cenários.
25. `sql/017_project_knowledge.sql` — ativa `pgvector`, cria documentos/trechos por projeto e
    as RPCs de busca semântica e textual.
26. `rls/017_project_knowledge_rls.sql` — isola documentos e trechos pelo dono e valida o
    vínculo com um projeto pertencente ao usuário.
27. `sql/018_chat_sap_environment.sql` — persiste o produto/release SAP selecionado em cada
    conversa.
28. `sql/019_advanced_kanban.sql` — converte os status fixos em colunas configuráveis e
    acrescenta labels, módulo, responsável, vínculos, dependências, esforço, lembrete e
    recorrência, preservando os cards existentes.
29. `rls/019_advanced_kanban_rls.sql` — restringe as colunas configuráveis ao usuário dono.
30. `sql/020_sap_horizon_themes.sql` — troca o catálogo antigo pelo SAP Horizon/Quartz e
    migra preferências legadas para o novo tema claro padrão.

> **Nota de segurança:** `ai_api_keys.api_key` é armazenada em texto plano nesta primeira
> etapa, protegida apenas por RLS (linha visível somente ao próprio usuário autenticado).
> Antes de produção, avalie criptografar a coluna (ex.: `pgsodium`/Vault do Supabase) ou
> mover a chamada aos provedores de IA para uma edge function que nunca expõe a chave ao
> cliente.

## Estrutura

- `sql/` — DDL: tabelas, funções, triggers.
- `rls/` — políticas de Row Level Security, sempre em arquivos separados do DDL.

## Variáveis de ambiente

Preencha `.env` (a partir de `.env.example`) com a URL e a `anon key` do projeto Supabase.
