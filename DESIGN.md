# Abapfy Design System — SAP Fiori Horizon

## Direção

O Abapfy usa uma linguagem visual inspirada no SAP Fiori Horizon para parecer familiar a
profissionais SAP sem reproduzir marcas, logos ou componentes proprietários. A experiência é
desktop, densa e orientada a trabalho: navegação estável, títulos claros, formulários compactos,
hierarquia por superfícies e estados semânticos inequívocos.

## Temas

- `sap-horizon-light` — **Morning Horizon**, tema claro padrão.
- `sap-horizon-dark` — **Evening Horizon**, tema escuro recomendado para baixa luminosidade.
- `sap-quartz-light` e `sap-quartz-dark` — alternativas SAP mais compactas.
- `sap-horizon-hcw` e `sap-horizon-hcb` — alto contraste claro e escuro.

Todos os componentes devem consumir somente os tokens de `src/renderer/src/styles/theme.css`.
Não use uma cor fixa para texto, fundo ou borda. Cores fixas são permitidas apenas como valores
de configuração de uma label/coluna e sempre devem ter contraste garantido pela superfície.

## Tokens essenciais

- Ação principal: `--color-primary`, `--color-primary-hover`, `--color-on-primary`.
- Texto: `--color-ink`, `--color-ink-muted`, `--color-ink-subtle`, `--color-ink-tertiary`.
- Superfícies: `--color-canvas`, `--color-surface-1` até `--color-surface-4`.
- Divisores: `--color-hairline`, `--color-hairline-strong`.
- Estados: `--color-semantic-success`, `--color-semantic-warning`,
  `--color-semantic-danger`, `--color-semantic-info`.
- Elevação: `--shadow-card`.

## Tipografia e densidade

- Use a pilha nativa definida em `--font-text` e `--font-display`, próxima da SAP 72.
- Corpo padrão: 14px; metadados: 10–12px; títulos de página: 24px.
- Controles têm 32–40px no desktop e mínimo de 44px em interfaces touch.
- Títulos devem descrever o objeto ou a ação, evitando slogans dentro da área operacional.

## Layout

- Sidebar fixa à esquerda; área de trabalho usa `--color-canvas`.
- Cards, modais e painéis usam `--color-surface-1` e borda hairline.
- `--color-surface-2` diferencia cabeçalhos, filtros e grupos internos.
- Blue Horizon identifica seleção, foco, links e ação principal; não preencher grandes áreas.
- Listas e tabelas devem priorizar alinhamento, escaneabilidade e cabeçalhos persistentes.

## Componentes

### Botões

- Primário: fundo `--color-primary`, texto `--color-on-primary`, raio `--radius-md`.
- Secundário: superfície 2, borda hairline e texto muted.
- Perigoso: texto/fundo derivados de `--color-semantic-danger`.
- Toda ação precisa de estado hover, disabled e `:focus-visible`.

### Formulários

- Labels ficam acima do campo.
- Inputs usam superfície 1 ou 2 e borda strong; foco usa primary-focus.
- Erros ficam próximos do campo e usam danger sem depender apenas da cor.
- Valores SAP devem ser legíveis, com release e descrição; não usar identificadores internos.

### Modais e painéis

- Cabeçalho fixo com título, contexto e fechar.
- Conteúdo rolável; ações ficam no fim do fluxo.
- Confirmações são obrigatórias para exclusões, escrita SAP e conteúdo gerado por agente que
  altere cards, subtarefas ou artefatos.

## IA, evidências e confiança

- Mostre agente, modelo, skills, MCPs e ambiente SAP usados.
- Conteúdo da base de conhecimento deve trazer documento, versão, atualização, trecho e confiança.
- Texto carregado pelo usuário é evidência, nunca instrução de sistema.
- Se ambiente, Support Package ou add-on não estiver definido, apresente `A CONFIRMAR`.

## Acessibilidade

- `:focus-visible` deve permanecer evidente em todos os temas.
- Não comunicar status somente por cor; use ícone ou texto.
- Respeitar contraste WCAG dos temas Horizon e oferecer as duas variantes de alto contraste.
- Não desabilitar zoom, seleção de conteúdo ou navegação por teclado em áreas de leitura.

## Responsividade

- Abaixo de 1050px, Kanban e tabelas mantêm largura útil com rolagem horizontal.
- Abaixo de 900px, formulários de quatro colunas passam para duas.
- Abaixo de 720px, barras de upload e ações quebram em linhas sem esconder funções.

## Checklist de entrega visual

1. Validar Morning Horizon e Evening Horizon.
2. Verificar estados hover, focus, disabled, loading, empty e error.
3. Testar textos longos, nomes de arquivos e releases SAP extensas.
4. Confirmar que nenhuma superfície ficou com cor fixa incompatível com light mode.
5. Executar typecheck e build antes do handoff.
