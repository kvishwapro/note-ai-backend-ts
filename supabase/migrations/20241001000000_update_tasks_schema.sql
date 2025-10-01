-- Add missing columns to tasks table
alter table public.tasks
  add column if not exists duration_minutes integer,
  add column if not exists priority text default 'P2',
  add column if not exists labels text[] default '{}',
  add column if not exists notes text,
  add column if not exists status text default 'open';

-- Create an index on status for faster filtering
create index if not exists idx_tasks_status 
  on public.tasks (status) 
  where status is not null;

-- Create an index on priority for faster sorting
create index if not exists idx_tasks_priority 
  on public.tasks (priority) 
  where priority is not null;
