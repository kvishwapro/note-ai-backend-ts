-- 1) Enable pgvector extension (idempotent)
create extension if not exists vector;

-- 2) Table: public.memories
create table if not exists public.memories (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  role text not null check (role in ('user', 'ai')),
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

-- Optional performance index (helps with filtering and sort by recency)
create index if not exists idx_memories_user_created_at
  on public.memories (user_id, created_at desc);

-- 3) Similarity search function using pgvector cosine distance operator <=>
-- Returns similarity as (1 - distance) so higher is more similar in [0..1].
create or replace function public.match_memories(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  target_user_id uuid
)
returns table (
  id bigint,
  user_id uuid,
  role: text,
  content text,
  embedding vector(768),
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    m.id,
    m.user_id,
    m.role,
    m.content,
    m.embedding,
    m.created_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where m.user_id = target_user_id
    and (1 - (m.embedding <=> query_embedding)) >= match_threshold
  order by (m.embedding <=> query_embedding) asc
  limit match_count;
$$;

-- 4) (Optional) Row Level Security - enable and allow users to access only their rows
-- Uncomment if you use RLS on public schema
-- alter table public.memories enable row level security;
-- create policy "memories_select_own" on public.memories
--   for select using (auth.uid() = user_id);
-- create policy "memories_insert_own" on public.memories
--   for insert with check (auth.uid() = user_id);

-- Notes:
-- - Embedding dimension is 768 to match Groq "nomic-embed-text".
-- - If you later adopt an ANN index (IVFFlat) for scale, consider:
--   create index if not exists idx_memories_embedding
--   on public.memories using ivfflat (embedding vector_cosine_ops)
--   with (lists = 100);
--   And "analyze public.memories;" after index creation.