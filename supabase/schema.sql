-- Run this in the Supabase SQL editor to create the schema and RLS policies.
-- Tables: entries, affirmations, bucket_items, goals, trophies, todos.

create extension if not exists "pgcrypto";

-- =============================================================================
-- entries (journal: wins + gratitudes)
-- =============================================================================
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('win', 'gratitude')),
  title text not null,
  body text,
  created_at timestamptz not null default now()
);
create index if not exists entries_user_created_idx on public.entries (user_id, created_at desc);

-- =============================================================================
-- affirmations (Reminders)
-- =============================================================================
create table if not exists public.affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);
create index if not exists affirmations_user_created_idx on public.affirmations (user_id, created_at desc);

-- =============================================================================
-- bucket_items
-- =============================================================================
create table if not exists public.bucket_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bucket_items_user_created_idx on public.bucket_items (user_id, created_at desc);

-- =============================================================================
-- goals
-- =============================================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  why text,
  target_date text,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_created_idx on public.goals (user_id, created_at desc);

-- =============================================================================
-- trophies
-- =============================================================================
create table if not exists public.trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  "when" text,
  created_at timestamptz not null default now()
);
create index if not exists trophies_user_created_idx on public.trophies (user_id, created_at desc);

-- =============================================================================
-- todos (with optional goal link)
-- =============================================================================
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  done boolean not null default false,
  completed_at timestamptz,
  goal_id uuid references public.goals(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists todos_user_created_idx on public.todos (user_id, created_at desc);
create index if not exists todos_goal_idx on public.todos (goal_id);

-- =============================================================================
-- Row-Level Security: every read/write is scoped to the authenticated user.
-- =============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array['entries','affirmations','bucket_items','goals','trophies','todos']) loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "select own" on public.%I', t);
    execute format('drop policy if exists "insert own" on public.%I', t);
    execute format('drop policy if exists "update own" on public.%I', t);
    execute format('drop policy if exists "delete own" on public.%I', t);

    execute format(
      'create policy "select own" on public.%I for select using (auth.uid() = user_id)',
      t
    );
    execute format(
      'create policy "insert own" on public.%I for insert with check (auth.uid() = user_id)',
      t
    );
    execute format(
      'create policy "update own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
    execute format(
      'create policy "delete own" on public.%I for delete using (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;
