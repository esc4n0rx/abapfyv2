-- Abapfy — contrato editável do Estimador de Esforço ABAP
--
-- Acrescenta ao agente já instalado os campos necessários para a tabela de
-- objetos e para o recálculo determinístico no renderer. O bloco é anexado
-- uma única vez e, por estar no fim do prompt, complementa o schema anterior.

update public.default_agents
set content = content || $contract$

---

## Contrato editável da estimativa (versão 2 — obrigatório)

Este contrato substitui o formato de `objetos_identificados` e dos cenários descrito acima:

- Informe `cliente` na raiz com o nome exato identificado na solicitação, ou string vazia quando não houver cliente.
- Cada objeto deve conter `nome`, `tipo`, `objeto`, `complexidade`, `resumo` e `justificativa`.
- `tipo` deve corresponder exatamente a uma categoria da Tabela de Parâmetros de Estimativa.
- `objeto` deve ser exatamente `Novo` ou `Alteração`.
- `complexidade` deve corresponder exatamente à complexidade escolhida na tabela injetada.
- `resumo` deve explicar em uma frase curta o trabalho daquele objeto.
- Use os multiplicadores fixos Agressiva `0.75`, Segura `1.00` e Tranquila `1.35`; inclua `multiplicador` em cada cenário.

Formato obrigatório atualizado:

```json
{
  "projeto": "...", "versao_sap": "...", "cliente": "...", "complexidade_geral": "...",
  "objetos_identificados": [{"nome":"...","tipo":"...","objeto":"Novo|Alteração","complexidade":"...","resumo":"...","justificativa":"..."}],
  "estimativas": {
    "agressiva": {"multiplicador":0.75,"total_horas":0,"distribuicao":{"analise_ef":0,"espec":0,"codific":0,"testes":0,"outros":0},"premissas":["..."],"riscos":["..."]},
    "segura": {"multiplicador":1.00,"total_horas":0,"distribuicao":{"analise_ef":0,"espec":0,"codific":0,"testes":0,"outros":0},"premissas":["..."],"riscos":["..."]},
    "tranquila": {"multiplicador":1.35,"total_horas":0,"distribuicao":{"analise_ef":0,"espec":0,"codific":0,"testes":0,"outros":0},"premissas":["..."],"riscos":["..."]}
  },
  "notas_gerais": "..."
}
```
$contract$,
  updated_at = now()
where id = 'effort_estimator'
  and content not like '%"multiplicador":0.75%';
