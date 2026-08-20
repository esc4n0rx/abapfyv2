# Abapfy

Cliente desktop (Electron + React + TypeScript) de chat com ferramentas voltadas para o
ecossistema SAP/ABAP. Windows e macOS, dark mode padrão, autenticação e persistência via
Supabase.

A identidade visual do produto está definida em [`DESIGN.md`](./DESIGN.md) — todo componente
novo deve referenciar os tokens de lá (`colors`, `typography`, `rounded`, `spacing`,
`components`).

## Stack

- **Electron** + **electron-vite** (build/dev do main, preload e renderer)
- **React 18** + **TypeScript** + **React Router**
- **Zustand** para estado de autenticação e stores do renderer
- **Supabase** (`@supabase/supabase-js`) para auth e persistência
- **Model Context Protocol SDK** para servidores HTTP e `stdio`
- **electron-builder** para empacotar `.exe` (nsis) e `.dmg`

## Estrutura

```
src/
  main/           processo principal do Electron (janela, IPC dos controles de janela)
  preload/        bridge segura (contextBridge) entre main e renderer
  renderer/
    src/
      components/ TitleBar, Sidebar, SettingsModal, ImportSkillModal, ImportAgentModal,
                  NewProjectModal, ChatMessageItem, Markdown, CodeBlock
      screens/    SplashScreen, AuthScreen, HomeScreen, SkillsScreen, AgentsScreen,
                  ProjectsScreen
      store/      estado global em Zustand (authStore, settingsStore, skillsStore,
                  agentsStore, chatStore)
      lib/        cliente Supabase, temas (themes.ts), provedores de IA (aiProviders.ts),
                  cliente de streaming + roteador (aiClient.ts), catálogo de skills
                  (skillsCatalog.ts)
      styles/     tokens de tema (theme.css) e reset global (global.css)
supabase/
  sql/            DDL (tabelas, triggers, funções)
  rls/            políticas de Row Level Security
resources/        ícones e assets embutidos no app
build/             recursos usados pelo electron-builder ao empacotar
external/         Abapfy Admin — dashboard web (Next.js + Material UI) separado, ver
                  external/README.md. Mesmo projeto Supabase, tabelas novas próprias
                  (admin_users, model_pricing...), instala/roda independente do app desktop.
```

## Janela

A janela é `frame: false` com `roundedCorners: true` e cantos também recortados via CSS
(`#root { border-radius }`), sem a moldura nativa do SO. O `TitleBar` (`src/renderer/src/components/TitleBar.tsx`)
implementa os botões de minimizar/maximizar/fechar customizados, comunicando com o processo
main via IPC (`window:minimize`, `window:maximizeToggle`, `window:close`) exposto pelo preload
em `window.api.windowControls`.

## Telas (etapa atual)

1. **Splash** (`/`) — animação de auto-escrita do nome "Abapfy", depois navega para `/auth`
   (ou `/dashboard` se já houver sessão Supabase ativa).
2. **Auth** (`/auth`) — login (email/senha) e cadastro (nome, email, senha, cargo, empresa)
   na mesma tela, alternando por abas.
3. **Home** (`/dashboard`) — tela principal exibida após o login: sidebar à esquerda (marca,
   atalhos, chats recentes e projetos reais) e, ao centro, o chat. Funcional nesta etapa: o
   menu do usuário (avatar, nome/cargo, "Sair" real), o modal de **Configurações**, o **chat
   com streaming + harness de agentes** e as telas de **Skills**, **Agentes** e **Projetos**
   (ver abaixo).

### Chat + harness de agentes (funcional)

Envia a conversa direto do renderer para o provedor/modelo escolhido em Configurações →
Inteligência Artificial, via streaming (SSE), usando a chave de API do usuário buscada do
Supabase no momento do envio (nunca fica em estado persistente na tela). Implementado em
`lib/aiClient.ts` (parser SSE genérico + um adaptador por provedor: OpenAI
`chat/completions`, Gemini `streamGenerateContent`, Claude `messages`). O CSP do
`index.html` libera `connect-src` para os três hosts de API.

**Roteador (Claude Haiku)** — na primeira mensagem de um chat sem projeto (ou sem agente
padrão definido), o Abapfy chama `routeConversation()` (Claude Haiku
`claude-haiku-4-5-20251001`, não-streaming) com o catálogo de agentes (`default_agents` +
`user_agents`) **e** o catálogo das skills habilitadas pelo usuário (tela Skills); o modelo
responde em JSON com o `id` do agente mais adequado e os `id`s das skills relevantes ao
pedido (ex.: pedir uma CDS view ativa o Abaper + aponta a skill "SAP ABAP CDS"). O `content`
do agente vira o **system prompt** da conversa, com um bloco extra "Skills disponíveis para
esta sessão" (nome + descrição de cada skill escolhida) anexado ao final — tudo isso é
snapshot em `chats.system_prompt`/`chats.skill_ids`, não muda mais mesmo que agente/skill
original seja editado depois. O header do chat mostra o agente ativo e um badge com a
quantidade de skills injetadas (hover mostra os nomes). Sem chave Claude configurada, o
roteamento é pulado e o chat segue sem agente/skills. Se o chat pertence a um projeto com
agente padrão definido, o roteador inteiro é pulado e esse agente é ativado direto (sem
skills automáticas nesse caso).

**Perguntas de esclarecimento** — todo agente padrão tem o contrato "não assuma pedido vago,
pergunte" (ver `supabase/sql/007_agent_router_context.sql`): quando o contexto é insuficiente,
o agente responde com um bloco ` ```clarify ` contendo `{"question", "options"}` em vez de
markdown normal. O client (`components/ClarifyQuestion.tsx`, roteado a partir de
`components/Markdown.tsx`) renderiza isso como um cartão com botões de opção + um campo de
texto livre — clicar numa opção ou digitar algo diferente manda automaticamente essa resposta
como a próxima mensagem do usuário, sem precisar copiar/colar.

**Anexos** — o clipe no composer abre um seletor de arquivos (`.txt`, `.md`, `.pdf`, `.docx`,
`.json`, `.csv` e uma lista ampla de extensões de código: `.abap`, `.cds`, `.sql`, `.ts`,
`.py`, `.java`, etc.). Cada arquivo vira um chip com spinner enquanto é lido; a extração roda
100% no client (`lib/attachments.ts`): PDF via `pdfjs-dist` (texto por página), DOCX via
`mammoth` (`extractRawText`), o resto via `File.text()` — texto por arquivo é truncado em 60k
caracteres para não estourar o contexto. No envio, o conteúdo extraído é embutido na mensagem
do usuário dentro de um bloco `<attached-files>` (é isso que vai pro modelo, pro histórico da
conversa e pro `chat_messages.content`), mas a bolha do chat mostra só o texto digitado + os
chips com nome do arquivo — `parseMessageAttachments()` separa as duas coisas tanto ao vivo
quanto ao reabrir um chat salvo, então o anexo nunca aparece como uma parede de texto na tela,
mas o agente sempre recebe o conteúdo completo. Dá pra mandar só anexo sem digitar nada.

**EF Consultant gera o .docx oficial** — o agente `ef_consultant` (ver
`supabase/sql/008_ef_consultant_docx.sql`) responde num bloco ` ```ef-docx ` com os campos da
Especificação Funcional (`project_name`, `author`, `client_name`, `module`,
`brief_description`, `summary_description`, `macro_overview`, `functional_spec`). A detecção
no client (`lib/efDocx.ts::parseEfDocxData()`) é feita pelo **formato dos dados**, não pela
linguagem declarada no bloco — o modelo às vezes ignora a instrução e devolve ```json, ou até
o JSON solto sem nenhum bloco de código; `Markdown.tsx` tenta qualquer bloco não-`clarify`, e
`ChatMessageItem.tsx` tenta a mensagem inteira como fallback antes de cair no Markdown normal.
Ambos exigem `project_name` + `functional_spec` presentes para confirmar que é mesmo uma EF
(evita confundir com o JSON de outro agente). Uma vez detectado, `components/EfDocxGenerator.tsx`
dispara `lib/efDocx.ts::generateEfDocx()` automaticamente: carrega `src/renderer/src/docs/MODELO BASE
EF.docx` (o modelo real do cliente, embutido no bundle via import `?url` do Vite) com
`pizzip`, e substitui só o **texto** de cada placeholder conhecido (`INSIRA AQUI O NOME DO
PROJETO`, `DIGITE O MODULO DO SAP`, `AQUI DETALHADAMENTE MONTE A ESPECIFICAÇÃO FUNCIONAL...`
etc.) dentro do `word/document.xml` — nunca reconstrói o documento do zero, então 100% da
formatação original (fontes, tabelas, capa) é preservada; texto multi-parágrafo vira `<w:br/>`
dentro do mesmo run para não quebrar o XML, e tudo é escapado (`&`/`<`/`>`) antes de entrar no
XML. Enquanto gera, o card mostra uma animação (ícone pulsando + barra de progresso
indeterminada); quando pronto, vira um botão "Baixar .docx" com o nome do projeto no arquivo.
Validado com um teste de ponta a ponta (gerar → reabrir com `mammoth`) confirmando que nenhum
placeholder sobra e que caracteres especiais não corrompem o XML.

**Renderizador universal para resposta estruturada** — cada agente do harness tem seu próprio
formato de saída (ver `supabase/sql/006_default_agents_seed.sql`): Abaper/Editor devolvem
markdown livre com blocos ` ```abap `, mas Code Review, Consultor SAP, DTec, Effort Estimator,
Enhancement Finder e Performance Analyzer devolvem um **objeto JSON inteiro** como resposta —
às vezes num bloco ` ```json `, às vezes solto sem fence nenhum. Em vez de um componente por
agente, `lib/structuredResponse.ts::parseStructuredJson()` detecta pelo **formato dos dados**
(objeto JSON com 2+ chaves, com ou sem fence) e `components/StructuredJson.tsx` renderiza
qualquer JSON de forma legível, adaptando-se à forma dos dados em vez de a um schema fixo:
strings viram texto ou, se a chave sugerir código (`code_skeleton`, `fix_code`...), um
`CodeBlock` com highlight; booleanos e campos como `severity`/`risk_level`/`verdict`/`priority`
viram badges coloridos (verde/âmbar/vermelho conforme o valor); arrays de objetos (ex.:
`recommendations`, `findings`) viram uma lista de cards, usando `rank`/`id`/`title`/`name` do
próprio item como cabeçalho; arrays de strings viram chips; objetos aninhados recuam com uma
borda lateral. A checagem roda tanto em `ChatMessageItem.tsx` (mensagem inteira, sem fence) — o
que resolveu o caso do Enhancement Finder aparecendo como bloco de código bruto — quanto em
`Markdown.tsx` (bloco embutido numa resposta maior), sempre depois de checar EF-docx e antes de
cair no Markdown normal.

**Auto-continuação** — cada agente tem, no próprio prompt, um contrato de "Continuidade
Automática", mas quem decide de fato é o harness: depois de cada resposta, `streamChat()`
reporta o `finish_reason`/`stop_reason` normalizado (`stop | length | other`) via
`onFinish()`. Se vier `length` (resposta cortada pelo limite de tokens), o Abapfy reenvia
automaticamente o histórico + uma instrução de continuação (sem mostrar isso como mensagem
nova) e concatena o resultado na **mesma** bolha de resposta, até `stop` ou um teto de 6
iterações. A UI mostra "Continuando automaticamente… (n)" enquanto isso acontece.

**Stats estilo Claude Code** — cada resposta do assistente mostra, no rodapé da bolha, o
agente ativo, o modelo, o effort (Claude) e, depois de completa: tempo total (soma de todas
as iterações do auto-loop) e tokens enviados → recebidos, capturados de `usage`/`usageMetadata`
de cada provedor.

### Uso (funcional)

Aberto pelo item "Uso" no menu do usuário na sidebar (`components/UsageModal.tsx`). Nada é
persistido numa tabela separada — todas as métricas pessoais (sessões, mensagens, tokens,
dias ativos, sequência atual/maior sequência, horário de pico, modelo favorito, heatmap estilo
GitHub das últimas 15 semanas) são **calculadas no client** (`lib/usage.ts::computeUsageStats`)
a partir de `chats`/`chat_messages`, que já persistem tudo isso — sem duplicar dado. Duas abas
("Visão Geral"/"Modelos") e filtro de período (Todos/30d/7d) recalculam tudo na hora via
`useMemo`, sem nova consulta ao banco.

**Ranking entre usuários** — comparar com outros usuários da plataforma exige enxergar dado
agregado de todo mundo, que a RLS de `chats`/`chat_messages` normalmente bloqueia (cada
usuário só vê o próprio). Resolvido com uma função Postgres `security definer`
(`supabase/sql/009_usage_rank.sql::get_usage_rank()`): ela calcula o ranking de tokens de
**todos** os usuários internamente (bypassando RLS só dentro da função), mas devolve **só a
linha de quem chamou** — posição, total de usuários e percentil. Nunca expõe tokens,
identidade ou qualquer dado individual de outro usuário. O card de ranking no modal mostra
"Top X% da plataforma" e a posição exata.

A resposta do modelo é renderizada como **Markdown completo** (`components/Markdown.tsx`,
`react-markdown` + `remark-gfm`): títulos, negrito, listas, tabelas GFM e blocos de código.
Blocos de código ganham realce de sintaxe via `react-syntax-highlighter` (Prism, com suporte
a `abap`) em `components/CodeBlock.tsx`, com cabeçalho mostrando a linguagem e botão de
copiar. Mensagens do usuário continuam em texto puro.

**Effort do Claude** — quando o provedor padrão é Claude, um slider aparece ao lado do
seletor de modelo no composer (`low`/`medium`/`high`/`xhigh`), controlando
`output_config.effort` + `thinking: { type: 'adaptive' }` na chamada à Messages API (efeito
local de sessão, não persistido). Só o texto final é exibido — deltas de `thinking` são
ignorados de propósito.

### Configurações (funcional)

Aberto pelo menu do usuário na sidebar (ou clicando em "Nenhuma chave de IA configurada" no
seletor de modelo). As preferências são persistidas no Supabase:

- **Geral** — 4 temas (Linear, Emerald, Amber, Crimson), todos derivados da mesma escala de
  superfícies escuras do `DESIGN.md`, trocando apenas o acento cromático. Aplicado
  imediatamente via `data-theme` + CSS custom properties (`lib/themes.ts`).
- **Inteligência Artificial** — chave de API por provedor (OpenAI, Gemini, Claude), com link
  para onde gerá-la, e seleção do modelo padrão entre os provedores configurados
  (`lib/aiProviders.ts` traz o catálogo de modelos atual de cada um).
- **MCP** — cadastra servidores por presets SAP Docs (Streamable HTTP) e SAP ABAP (`stdio`),
  permite editar/testar a conexão, ativar/desativar e vincular cada servidor a N agentes. Os
  vínculos ficam em `mcp_agent_bindings`; credenciais SAP não são salvas no banco. O processo
  principal do Electron hospeda os clientes MCP (`main/mcp.ts`), confirma individualmente
  ferramentas que possam escrever/ativar/transportar dados e expõe, além de `tools/*`, os
  protocolos `resources/*` e `prompts/list` do MCP — recursos viram uma ferramenta sintética
  `read_resource` por servidor (URI + catálogo na descrição), pro modelo ler mesmo servidores
  que só publicam recursos, não tools. No chat, o modelo seleciona e executa ferramentas MCP
  antes da resposta final; os retornos entram como evidência junto do system prompt do agente
  e das skills roteadas.

  **Confirmação in-app, não dialog nativo** — em vez de `dialog.showMessageBox` (modal do SO,
  trava a IPC e pode abrir fora do foco da janela), a autorização vira um card não-bloqueante
  em `components/McpConfirmationBanner.tsx` (fila em `store/mcpConfirmStore.ts`), visível em
  cima de qualquer tela. O main manda o pedido via `mcp:confirmation-pending` e fica com uma
  promise pendente até o clique voltar por `mcp:confirmationResponse`.

  **Timeout, cancelamento e retry** — `connect`/`tools/list`/`tools/call`/`resources/read` têm
  timeout (20s conexão, 45s chamada); ao estourar, o cliente do servidor é descartado do cache
  em vez de repetir o mesmo travamento na próxima chamada. Clicar "parar" no chat aborta de
  verdade uma ferramenta em andamento (`AbortSignal` propagado até o `client.request` no main
  via `mcp:cancelTool`), não só o streaming de texto. Falha de rede/timeout tenta de novo uma
  vez com um backoff curto antes de cair no fallback textual — recusa explícita do usuário
  nunca é retentada.

  **Badge de atividade ao vivo** — cada skill/ferramenta usada na resposta vira uma badge
  animada (`ChatMessageItem.tsx`, estilo Claude Code): `running` (spinner) → `confirm`
  (piscando, esperando o card acima) → `done`/`error`. O snapshot final fica em
  `chat_messages.tool_activity` (jsonb, `sql/014_chat_messages_tool_activity.sql`), então
  reabrir um chat salvo mostra quais ferramentas rodaram naquela resposta específica.

### Skills (funcional e conectada ao modelo)

Acessada pelo atalho "Skills" na sidebar (`screens/SkillsScreen.tsx`), troca o conteúdo
principal para uma grade com todas as skills que acompanham o repo em
`src/renderer/src/skills/*` (catálogo estático gerado em `lib/skillsCatalog.ts` a partir dos
`plugin.json` de cada uma — 32 skills SAP/ABAP/BTP/HANA/UI5/etc, agrupadas por categoria).
Cada card tem um switch para ativar/desativar, com busca e filtro por categoria. O estado
(ligado/desligado) é persistido por usuário em `user_skills` — as built-in só geram uma linha
no banco quando o usuário mexe no switch pela primeira vez (antes disso o padrão é "ativa").

O botão "Importar skill" abre um modal (`components/ImportSkillModal.tsx`) para cadastrar uma
skill própria: nome, descrição e upload de um arquivo `.md` (o conteúdo é lido no cliente e
salvo em `user_skills.content_md`). Skills importadas aparecem na mesma grade, com um badge
"Importada" e opção de remover. Na primeira mensagem do chat, o roteador escolhe até cinco
skills habilitadas e injeta no system prompt o **conteúdo completo** de cada uma — não só
nome/descrição — carregado sob demanda em `lib/skillContent.ts`: built-in lê o `SKILL.md`
correspondente do bundle (`import.meta.glob` lazy, um chunk JS por skill — as 32 não entram no
bundle de startup, só as até cinco roteadas naquela mensagem), importada usa `content_md`
direto; cada skill é truncada em 8.000 caracteres pra não estourar contexto com várias skills
de uma vez. Servidores MCP vinculados ao agente selecionado podem ser usados no mesmo ciclo.

### Agentes (funcional)

Atalho "Agentes" na sidebar (`screens/AgentsScreen.tsx`) — grade com o catálogo combinado de
`default_agents` (globais, somente leitura — nunca podem ser excluídos pelo cliente, badge
"Padrão" com cadeado) e `user_agents` (importados pelo usuário, badge "Importado" com botão
Remover). Cada card tem "Baixar .md" (exporta o `content` do agente via `Blob` + download,
pra copiar/editar fora) e o botão "Importar agente" abre um modal igual ao de Skills — nome,
descrição, upload de `.md` — que salva em `user_agents.content` e passa a entrar na lista que
o roteador considera. O seed inicial (`supabase/sql/006_default_agents_seed.sql`) traz 9
agentes "hardened" (Abaper, Code Review, Consultor SAP, DTec Consultant, Editor SAP, EF
Consultant, Estimador de Esforço, Enhancement Finder, Performance Analyzer) reescritos a
partir do `default_agents_rows.sql` de referência, com regras de segurança reforçadas (nunca
inventar objeto/tabela/BAdI, nunca sugerir operação destrutiva sem confirmação) e o contrato
de continuidade automática embutido.

### Projetos (funcional)

Atalho "Projetos" na sidebar (`screens/ProjectsScreen.tsx`) — grade com os projetos do
usuário e botão "Novo projeto" (`components/NewProjectModal.tsx`: nome, descrição, agente
padrão opcional — dropdown do catálogo combinado — e contexto livre). Definir um agente
padrão faz os chats desse projeto pularem o roteador. Clicar em "Novo chat no projeto" abre o
chat com o badge do projeto no composer (acima do textarea, estilo do `image.png` de
referência); um chat solto (fora de projeto) não mostra badge. Na sidebar, "Projetos" lista
os projetos recentes e, ao clicar em um, expande os sub-chats daquele projeto
(`chatStore.loadProjectChats`).

### Persistência de chats

Todo chat vira uma linha em `chats` (com snapshot do agente/system prompt ativado) e cada
mensagem em `chat_messages` (com `tokens_input`/`tokens_output`/`response_ms` do turno do
assistente). A sidebar (`Chats recentes` + sub-chats de projeto) busca isso via
`store/chatStore.ts`; clicar em um chat carrega `chats` + `chat_messages` e retoma a
conversa **reenviando o histórico completo** a cada nova mensagem — o modelo sempre recebe o
contexto inteiro, não só a última pergunta. "Nova Sessão" na sidebar limpa o chat atual (e o
projeto associado) e começa do zero.

## Configuração

1. Copie `.env.example` para `.env` e preencha com as credenciais do projeto Supabase:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
2. No projeto Supabase, rode os scripts em [`supabase/`](./supabase/README.md) **na ordem**
   indicada lá — perfis → configurações/IA → skills → agentes → projetos/chats → seed dos
   agentes padrão.

## Scripts

```bash
pnpm install       # instala as dependências
pnpm dev           # sobe o app em desenvolvimento (hot reload)
pnpm typecheck     # checa tipos (main/preload + renderer)
pnpm lint          # lint do projeto
pnpm build         # build de produção (sem empacotar)
pnpm build:win     # gera instalador Windows (nsis)
pnpm build:mac     # gera .dmg (macOS)
```

## Ícone e marca

`resources/icon.png` é a arte final do app: usado como ícone da janela (`BrowserWindow`, via
`?asset` em `src/main/index.ts`) e copiado para `build/icon.png`, fonte do ícone de
empacotamento do electron-builder (Windows/macOS/Linux). Se a arte mudar, rode
`cp resources/icon.png build/icon.png` de novo antes de gerar um build de distribuição — para
Windows/macOS oficiais, vale gerar `build/icon.ico`/`build/icon.icns` dedicados (ex.:
`electron-icon-builder`) em vez de depender só da conversão automática do PNG.

`resources/logo.png` é a marca "A" usada na tela inicial, acima da saudação
(`screens/HomeScreen.tsx`, copiada para `src/renderer/src/assets/logo.png` para entrar no
bundle do renderer). O arquivo tem traço escuro sobre fundo transparente — pensado pra fundo
claro — por isso a classe `.home-welcome-logo` aplica `filter: invert(1)` para ficar legível
sobre o canvas escuro do app.
