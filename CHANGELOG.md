# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
