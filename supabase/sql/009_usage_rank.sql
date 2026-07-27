-- Abapfy — ranking de uso entre usuários da plataforma
--
-- As estatísticas pessoais (sessões, mensagens, tokens, sequência, modelo favorito,
-- heatmap) são calculadas no client a partir de "chats"/"chat_messages", que já
-- persistem tudo isso por usuário — RLS de 005 já protege esse acesso, nada novo
-- necessário ali.
--
-- Para comparar com outros usuários da plataforma (ranking), que exige enxergar o
-- total agregado de todo mundo, usamos uma função SECURITY DEFINER: ela calcula o
-- ranking de todos internamente (bypassando RLS só dentro da função) mas só
-- devolve a linha do usuário que chama — nunca tokens/contagens de outros
-- usuários individualmente, nem quem são.

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at);

create or replace function public.get_usage_rank()
returns table (
  my_total_tokens bigint,
  rank bigint,
  total_users bigint,
  percentile numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with totals as (
    select
      cm.user_id,
      coalesce(sum(cm.tokens_input), 0) + coalesce(sum(cm.tokens_output), 0) as total_tokens
    from public.chat_messages cm
    where cm.role = 'assistant'
    group by cm.user_id
  ),
  ranked as (
    select
      user_id,
      total_tokens,
      rank() over (order by total_tokens desc) as rnk,
      count(*) over () as total_users
    from totals
  )
  select total_tokens, rnk, total_users,
    round(100.0 * (total_users - rnk + 1) / nullif(total_users, 0), 1) as percentile
  from ranked
  where user_id = auth.uid();
$$;

comment on function public.get_usage_rank() is 'Retorna só a posição/percentil de tokens do usuário que chama entre todos os usuários da plataforma — nunca expõe dados individuais de outros usuários.';

grant execute on function public.get_usage_rank() to authenticated;
