-- Abapfy — contexto extra do roteador (skills relevantes) + contrato de
-- perguntas de esclarecimento nos agentes padrão.
--
-- 1) chats.skill_ids: snapshot dos slugs de skills que o roteador (Haiku)
--    considerou relevantes para a mensagem inicial daquele chat — exibido no
--    header do chat e usado para montar o bloco "Skills disponíveis para
--    esta sessão" anexado ao system prompt no momento da criação do chat.
--
-- 2) Acrescenta a todo agente padrão (idempotente — só aplica se ainda não
--    tiver) o contrato "Perguntas de Esclarecimento": quando o pedido do
--    usuário for vago demais, o agente deve parar e perguntar em vez de
--    assumir, respondendo com um bloco ```clarify contendo
--    {"question": "...", "options": ["..."]} — o client renderiza isso como
--    botões de opção + campo de texto livre (estilo Claude Code) em vez de
--    markdown comum.

alter table public.chats add column if not exists skill_ids text[];

update public.default_agents
set content = content || $clarify$

---

## Perguntas de Esclarecimento (Harness)

Se o pedido do usuário for vago demais para você prosseguir com segurança — contexto
insuficiente, múltiplos caminhos possíveis, informação técnica crítica faltando — **não
assuma**: pare e pergunte. Use exatamente este formato, um bloco de código com linguagem
`clarify` contendo um JSON válido, substituindo totalmente sua resposta normal:

```clarify
{"question": "Pergunta objetiva para o usuário", "options": ["Opção A", "Opção B", "Opção C"]}
```

Regras:
- No máximo uma pergunta por vez, no máximo 5 opções curtas e mutuamente exclusivas.
- Nunca escreva texto fora do bloco `clarify` quando for perguntar.
- Assim que a resposta do usuário chegar (próxima mensagem), prossiga normalmente já com o
  contexto ganho — não pergunte de novo a mesma coisa.
- Não pergunte por preciosismo — só quando a ambiguidade realmente impede uma resposta de
  qualidade. Prefira assumir o caminho mais comum e declarar a suposição nas notas quando o
  pedido for só levemente incompleto.
$clarify$,
  updated_at = now()
where content not like '%Perguntas de Esclarecimento%';
