-- Run this in the Supabase SQL editor to create the schema and RLS policies.
-- Tables: entries, affirmations, bucket_items, goals, milestones, trophies, todos.
--
-- Idempotent: safe to re-run after schema changes. Existing tables get the
-- new columns / drops via the alter statements at the bottom.

create extension if not exists "pgcrypto";

-- =============================================================================
-- entries (journal: wins + gratitudes + confirmations)
-- =============================================================================
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('win', 'gratitude', 'confirmation')),
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
  reward text,
  target_date text,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_created_idx on public.goals (user_id, created_at desc);

-- =============================================================================
-- milestones (sub-steps belonging to a goal; not visible in the Todos list)
-- =============================================================================
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists milestones_user_idx on public.milestones (user_id);
create index if not exists milestones_goal_idx on public.milestones (goal_id);

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
-- routines (named groups of habits — "morning routine", etc.)
-- =============================================================================
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists routines_user_idx on public.routines (user_id, created_at desc);

-- =============================================================================
-- habits
--   frequency_kind: 'daily' | 'weekly'
--   times_per_period: int  -- e.g. 3 (times per day) or 5 (times per week)
--   days_of_week: int[]    -- 0=Sun..6=Sat. Only meaningful for 'daily'.
--                           -- Length 7 = every day; subset = those days only.
-- =============================================================================
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  frequency_kind text not null check (frequency_kind in ('daily', 'weekly')) default 'daily',
  times_per_period int not null default 1,
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',
  routine_id uuid references public.routines(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id, created_at desc);
create index if not exists habits_routine_idx on public.habits (routine_id);

-- =============================================================================
-- habit_completions (one row per "I did it" tap)
-- =============================================================================
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  completed_at timestamptz not null default now()
);
create index if not exists habit_completions_user_habit_idx on public.habit_completions (user_id, habit_id, completed_at desc);
create index if not exists habit_completions_habit_idx on public.habit_completions (habit_id, completed_at desc);

-- =============================================================================
-- todos (master list — milestones live in their own table now)
-- =============================================================================
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  done boolean not null default false,
  completed_at timestamptz,
  due_at date,
  created_at timestamptz not null default now()
);
create index if not exists todos_user_created_idx on public.todos (user_id, created_at desc);

-- =============================================================================
-- Row-Level Security: every read/write is scoped to the authenticated user.
-- =============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array['entries','affirmations','bucket_items','goals','milestones','routines','habits','habit_completions','trophies','todos']) loop
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

-- =============================================================================
-- Idempotent migration for existing databases
-- =============================================================================
alter table public.todos drop column if exists goal_id;
drop index if exists todos_goal_idx;
alter table public.goals add column if not exists reward text;
alter table public.todos add column if not exists due_at date;
create index if not exists todos_user_due_idx on public.todos (user_id, due_at);

-- entries.type: widen the allowed set to include 'confirmation'.
alter table public.entries drop constraint if exists entries_type_check;
alter table public.entries add constraint entries_type_check
  check (type in ('win', 'gratitude', 'confirmation'));
