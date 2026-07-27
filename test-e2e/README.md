# Cenários de teste E2E — Abapfy

Fixtures para testar manualmente cada ferramenta do app de ponta a ponta.
Todos os cenários usam o mesmo domínio de negócio (pedidos de compra MM)
para poderem ser encadeados: gere o Report/CDS em `01-abap-generator`,
depois use o mesmo programa em `02-editor` para simular uma evolução real.

## 01-abap-generator — `/dashboard/abap`
Um arquivo por tipo suportado no wizard (Report, Classe, Function Module,
Enhancement, Programa simples, CDS View). Cole o conteúdo de "CONTEXTO" no
step de contexto livre e preencha os campos estruturados (nome do objeto,
tabelas, parâmetros etc.) conforme descrito em cada arquivo.

- `01_report_ZREL_PEDIDOS_ABERTOS.txt`
- `02_classe_ZCL_PEDIDO_COMPRA_SVC.txt`
- `03_function_module_ZFM_CALC_SALDO_PEDIDO.txt`
- `04_enhancement_ME21N_VALIDA_FORNECEDOR.txt`
- `05_programa_simples_ZPRG_ATUALIZA_STATUS_PEDIDO.txt`
- `06_cds_Z_I_PEDIDOS_COMPRA.txt`

## 02-editor — `/dashboard/editor`
Simula uma edição incremental de um programa já existente.
1. Crie uma sessão "Manual", faça upload de `programa_base_ZREL_PEDIDOS_ABERTOS.abap`.
2. Cole o conteúdo de `contexto_alteracao.txt` no campo de Contexto/Objetivo.
3. Verifique se o resultado migra o WRITE para ALV, corrige os SELECTs
   dentro de LOOP e adiciona o parâmetro de Centro, conforme pedido.

## 03-performance — `/dashboard/performance`
Cole o conteúdo de `codigo_ruim_ZREL_ANTIPATTERNS.abap` na textarea.
O código tem problemas propositais sem nenhuma dica no comentário (para não
"entregar" a resposta à IA): SELECT dentro de LOOP, SELECT SINGLE repetido
para o mesmo cliente, LOOP+IF em vez de READ TABLE/BINARY SEARCH, SELECT *
sem WHERE em tabela grande, SORT+DELETE ADJACENT DUPLICATES em vez de
SELECT DISTINCT, e concatenação de string dentro de loop grande — confira
se a análise identifica a maioria deles.

## 04-estimativas — `/dashboard/estimativas`
Modo "Manual": preencha Cliente/Tipo de Projeto/Versão SAP conforme o
cabeçalho do arquivo e cole o restante como Contexto. Também é possível
usar o EF gerado em `05-especificacao-funcional` para testar o modo
"Carregar EF".

## 05-especificacao-funcional — `/dashboard/specs`
Preencha Autor/Cliente/Nome do Projeto e cole o restante do arquivo no
campo "Contexto do Projeto". Gera um .docx que pode ser reaproveitado
como entrada em Estimativas ou no Editor (modo "Carregar EF").

## 06-enhancement-finder — `/dashboard/enhancement`
Três cenários independentes (módulos MM, SD, FI) em `cenarios_busca.txt`.
Selecione o módulo correspondente e cole a descrição de cada cenário.

## 07-snippets
Não requer fixture — é uma biblioteca de referência estática, sem fluxo
de IA para testar.

## Roteiro sugerido de ponta a ponta
1. Gerar Report + CDS + Enhancement (01) → salvar no Histórico.
2. Editor: carregar o Report gerado (ou o `.abap` fornecido) e aplicar a
   evolução (02).
3. Performance: colar o código ruim e validar detecção (03).
4. Especificação Funcional: gerar o EF do mesmo projeto (05).
5. Estimativas: gerar a estimativa em modo manual e depois via EF (04).
6. Enhancement Finder: buscar os 3 cenários de BAdI/user-exit (06).
