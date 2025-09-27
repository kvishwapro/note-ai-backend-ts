-- Tasks and Journal schema for intent-driven actions

-- 1) Tasks table
create table if not exists public.tasks (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_due_created
  on public.tasks (user_id, due_date, created_at desc);

-- 2) Journal entries table
create table if not exists public.journal_entries (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_user_created
  on public.journal_entries (user_id, created_at desc);