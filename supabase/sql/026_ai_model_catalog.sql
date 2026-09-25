-- Apply after 025. The provider transport remains code-defined; model IDs are data.
create table if not exists public.ai_models (
  provider text not null check (provider in ('openai', 'gemini', 'claude')),
  model_id text not null check (length(trim(model_id)) between 2 and 160),
  label text not null check (length(trim(label)) between 1 and 120),
  description text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (provider, model_id)
);
alter table public.ai_models enable row level security;
drop policy if exists ai_models_read on public.ai_models;
drop policy if exists ai_models_admin_insert on public.ai_models;
drop policy if exists ai_models_admin_update on public.ai_models;
drop policy if exists ai_models_admin_delete on public.ai_models;
create policy ai_models_read on public.ai_models for select to authenticated using (true);
create policy ai_models_admin_insert on public.ai_models for insert to authenticated with check (public.is_abapfy_admin());
create policy ai_models_admin_update on public.ai_models for update to authenticated using (public.is_abapfy_admin()) with check (public.is_abapfy_admin());
create policy ai_models_admin_delete on public.ai_models for delete to authenticated using (public.is_abapfy_admin());

create table if not exists public.ai_model_blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model_id text not null,
  blocked_at timestamptz not null default now(),
  primary key (user_id, provider, model_id),
  foreign key (provider, model_id) references public.ai_models(provider, model_id) on delete cascade
);
alter table public.ai_model_blocks enable row level security;
drop policy if exists ai_model_blocks_read on public.ai_model_blocks;
drop policy if exists ai_model_blocks_admin_insert on public.ai_model_blocks;
drop policy if exists ai_model_blocks_admin_delete on public.ai_model_blocks;
create policy ai_model_blocks_read on public.ai_model_blocks for select to authenticated using (user_id = auth.uid() or public.is_abapfy_admin());
create policy ai_model_blocks_admin_insert on public.ai_model_blocks for insert to authenticated with check (public.is_abapfy_admin());
create policy ai_model_blocks_admin_delete on public.ai_model_blocks for delete to authenticated using (public.is_abapfy_admin());

insert into public.ai_models(provider, model_id, label, description) values
 ('openai','gpt-5.6-sol','GPT-5.6 Sol','Modelo principal'),
 ('openai','gpt-5.6-terra','GPT-5.6 Terra','Uso diário'),
 ('openai','gpt-5.6-luna','GPT-5.6 Luna','Alto volume'),
 ('openai','gpt-5-codex','GPT-5 Codex','Código'),
 ('gemini','gemini-3.6-flash','Gemini 3.6 Flash','Uso diário'),
 ('gemini','gemini-3.1-pro-preview','Gemini 3.1 Pro','Raciocínio'),
 ('gemini','gemini-3.5-flash-lite','Gemini 3.5 Flash-Lite','Alto volume'),
 ('claude','claude-sonnet-5','Claude Sonnet 5','Uso diário'),
 ('claude','claude-opus-4-8','Claude Opus 4.8','Raciocínio'),
 ('claude','claude-haiku-4-5-20251001','Claude Haiku 4.5','Alto volume')
on conflict (provider, model_id) do nothing;

create or replace function public.can_use_ai_model(p_provider text, p_model_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.ai_models m
    where m.provider = p_provider and m.model_id = p_model_id and m.enabled
      and not exists (select 1 from public.ai_model_blocks b
        where b.user_id = auth.uid() and b.provider = m.provider and b.model_id = m.model_id)
  )
$$;
revoke all on function public.can_use_ai_model(text, text) from public, anon;
grant execute on function public.can_use_ai_model(text, text) to authenticated;

create or replace function public.validate_default_ai_model()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.default_ai_provider is not null or new.default_ai_model is not null then
    if new.user_id <> auth.uid() or new.default_ai_provider is null or new.default_ai_model is null
      or not public.can_use_ai_model(new.default_ai_provider, new.default_ai_model) then
      raise exception 'Model unavailable for this user';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists user_settings_validate_ai_model on public.user_settings;
create trigger user_settings_validate_ai_model before insert or update of default_ai_provider, default_ai_model
  on public.user_settings for each row execute function public.validate_default_ai_model();
