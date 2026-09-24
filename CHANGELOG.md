# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.3.11] - 2026-09-24

### Adicionado

- Master e administradores podem selecionar usuários na aba Inteligência Artificial para
  provisionar chaves de API, ativar integrações MCP e vincular agentes. Usuários comuns
  consultam as integrações disponíveis e escolhem o modelo padrão.
- Nova marca Abapfy alinhada ao Horizon nas telas do aplicativo e nos ícones dos pacotes
  Windows, macOS e Linux.

### Segurança

- A migração `supabase/sql/025_admin_ai_integrations.sql` restringe a gravação de chaves e
  integrações a MASTER/ADMIN no banco. Administradores consultam apenas o estado das chaves
  de outras contas, sem receber os segredos.

### Configuração necessária

- Aplicar a migração 025 no Supabase após as migrações 021–024 para ativar a nova hierarquia
  de acesso. A publicação do aplicativo não aplica migrações automaticamente.

## [0.3.10] - 2026-09-24

### Corrigido

- Reúne os instaladores Windows, Linux e macOS em uma única release pública, criada após as
  três builds concluírem. O pacote macOS é universal para Intel e Apple Silicon.
- Inclui as melhorias de login, persistência, saída, marca GeoSystem e recuperação de senha
  introduzidas na versão 0.3.8. O envio do código requer o SMTP e o template documentados em
  `supabase/email-templates/README.md`.

## [0.3.9] - 2026-09-24

### Corrigido

- Publica os quatro pacotes da versão em sequência para evitar releases duplicadas e artefatos
  divididos entre elas. Inclui as melhorias de autenticação, recuperação de senha e marca da
  versão 0.3.8.

## [0.3.8] - 2026-09-24

### Adicionado

- Recuperação de senha por código enviado ao e-mail, com verificação e definição da nova senha
  dentro do aplicativo.
- Template de recuperação GeoSystem - Abapfy com nome e empresa quando disponíveis nos
  metadados da conta.

### Corrigido

- Login com erro permanece na tela de entrada e exibe a mensagem; a tela principal exige
  sessão autenticada e o botão Sair retorna ao login.
- Header e tela de abertura exibem a marca GeoSystem em duas cores.

### Configuração necessária

- O envio do código depende da ativação do SMTP personalizado e da instalação do template
  `supabase/email-templates/recovery.html` no projeto Supabase.

## [0.3.6] - 2026-08-31

### Corrigido

- Injeta a configuração pública do Supabase no renderer durante as builds de release,
  evitando que o aplicativo instalado abra em uma janela branca.
- Interrompe a compilação quando a URL ou a chave anônima do Supabase não estiverem
  configuradas, impedindo a publicação de instaladores inválidos.

## [0.3.5] - 2026-08-31

### Corrigido

- Substitui os usos de `__dirname` no processo principal por caminhos derivados de
  `import.meta.url`, permitindo iniciar corretamente o bundle ES module instalado.

## [0.3.4] - 2026-08-31

### Corrigido

- Atualiza o gerador NSIS para eliminar a violação de acesso em `System.dll` que encerrava
  instalações por usuário logo após a escolha de "somente para mim" no Windows.
- Restringe o pacote desktop aos artefatos compilados e recursos necessários, evitando a
  inclusão de caches, arquivos de ambiente, fontes auxiliares e dependências já incorporadas
  ao bundle do processo principal.

## [0.3.3] - 2026-08-28

### Corrigido

- Incorpora todas as dependências JavaScript do processo principal ao bundle, eliminando
  falhas sequenciais de módulos transitivos ausentes em instalações geradas com pnpm,
  incluindo `cross-spawn` e `fs-extra`.

## [0.3.2] - 2026-08-28

### Corrigido

- Impede que o instalador atualize apenas o registro do Windows enquanto processos de uma
  versão anterior ainda mantêm `abapfy.exe` e `app.asar` bloqueados.
- Adota o instalador assistido da versão legacy, permitindo confirmar o diretório e exibindo
  uma orientação clara para fechar o Abapfy antes de substituir os arquivos.

## [0.3.1] - 2026-08-28

### Corrigido

- Incorpora o runtime do cliente MCP ao processo principal para impedir a falha
  `ERR_MODULE_NOT_FOUND` de `cross-spawn` ao abrir o aplicativo instalado.
- O Agente de Especificação Funcional volta a gerar o Word a partir do modelo base,
  inclusive quando a resposta do provedor vier em Markdown em vez do JSON esperado.
- Preenche o campo de consultor e preserva o espaçamento do texto justificado no documento EF.

## [0.3.0] - 2026-08-22

### Adicionado

- Base de conhecimento por projeto com documentos versionados, recuperação semântica via
  `pgvector`, fallback textual, RLS e fontes com confiança no contexto do agente.
- Seletor de ambiente SAP no composer, persistido por chat e enviado ao roteador e ao agente.
- Kanban avançado com colunas configuráveis, calendário, labels, módulo, responsável,
  projeto/chat, dependências, esforço, lembretes, recorrência e criação assistida por IA.

### Alterado

- Interface adota SAP Morning Horizon claro como padrão e oferece Evening Horizon, Quartz e
  variantes de alto contraste nas configurações.

## [0.2.1] - 2026-08-22

### Corrigido

- Inclui `cross-spawn` como dependência direta do aplicativo para impedir a falha `ERR_MODULE_NOT_FOUND` ao iniciar o processo principal após a instalação.
- Publica releases geradas por tag diretamente como release final do GitHub, em vez de deixá-las como rascunho invisível ao atualizador.

## [0.2.0] - 2026-08-22

### Adicionado

- Quadro pessoal de tarefas Kanban com prioridades, prazos, ordenação por arrastar e soltar e checklist de subtarefas.
- Painel de contexto da sessão com arquivos anexados, agente ativo, skills carregadas e servidores MCP vinculados.
- Seletor de agente no composer, mantendo o modo Automático e permitindo fixar um agente antes da primeira mensagem.
- Gerenciamento persistido de servidores MCP e vínculos N:N com agentes, com confirmação para operações sensíveis.
- Estrutura administrativa Supabase e componentes do dashboard externo.

### Alterado

- Estimador de Esforço ABAP agora recarrega parâmetros por solicitação, apresenta os objetos identificados em tabela e recalcula os três cenários ao editar a complexidade.
- Premissas e riscos das estimativas passaram a ser recolhíveis para manter os cards compactos e alinhados.
- Seleção manual de agente usa um classificador separado apenas para skills, sem permitir substituição do agente escolhido.

### Corrigido

- Compatibilidade de respostas MCP que retornam conteúdo estruturado divergente do schema declarado.
- Empacotamento e atualização automática para builds macOS e Windows.

## [0.1.0] - 2026-07-27

### Adicionado

- Primeira versão pública do Abapfy: cliente desktop de chat com ferramentas para o ecossistema SAP/ABAP.
- Configurações com temas, seleção de provedor/modelo de IA e chaves de API.
- Nova aba de Atualizações nas Configurações, com verificação e instalação de novas versões diretamente pelo app.
