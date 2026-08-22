-- Abapfy — Kanban avançado, preservando os cards da versão 0.2

alter table public.tasks drop constraint if exists tasks_status_check;

alter table public.tasks
  add column if not exists labels text[] not null default '{}',
  add column if not exists sap_module text,
  add column if not exists assignee text,
  add column if not exists project_id uuid references public.projects (id) on delete set null,
  add column if not exists chat_id uuid references public.chats (id) on delete set null,
  add column if not exists estimated_hours numeric(10,2),
  add column if not exists actual_hours numeric(10,2),
  add column if not exists dependency_ids uuid[] not null default '{}',
  add column if not exists recurrence text not null default 'none',
  add column if not exists reminder_at timestamptz;

alter table public.tasks drop constraint if exists tasks_recurrence_check;
alter table public.tasks add constraint tasks_recurrence_check
  check (recurrence in ('none', 'daily', 'weekly', 'monthly'));

create table if not exists public.task_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (char_length(trim(key)) between 1 and 50),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  color text not null default '#0070f2',
  position bigint not null default 1000,
  is_done boolean not null default false,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

drop trigger if exists task_columns_set_updated_at on public.task_columns;
create trigger task_columns_set_updated_at
  before update on public.task_columns
  for each row execute function public.set_updated_at();

create index if not exists task_columns_user_position_idx on public.task_columns (user_id, position);
create index if not exists tasks_project_idx on public.tasks (project_id, status, position);
create index if not exists tasks_due_reminder_idx on public.tasks (user_id, due_date, reminder_at);

insert into public.task_columns (user_id, key, name, description, color, position, is_done, is_blocked)
select users.user_id, defaults.key, defaults.name, defaults.description, defaults.color,
       defaults.position, defaults.is_done, defaults.is_blocked
from (select distinct user_id from public.tasks) users
cross join (values
  ('todo', 'A fazer', 'Trabalhos planejados', '#5b738b', 1000, false, false),
  ('in_progress', 'Em andamento', 'Execução atual', '#0070f2', 2000, false, false),
  ('blocked', 'Bloqueado', 'Aguardando resolução', '#e76500', 3000, false, true),
  ('done', 'Concluído', 'Trabalhos finalizados', '#188918', 4000, true, false)
) as defaults(key, name, description, color, position, is_done, is_blocked)
on conflict (user_id, key) do nothing;
