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
  body text,
  why text,
  reward text,
  target_date text,
  icon text,
  is_cornerstone boolean not null default false,
  position int not null default 0,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_created_idx on public.goals (user_id, created_at desc);
-- Partial unique index "goals_one_cornerstone_per_user" lives in the migration
-- block at the bottom: it depends on the is_cornerstone column, which existing
-- databases only get via the alter-table-add-column-if-not-exists below.

-- =============================================================================
-- milestones (sub-steps belonging to a goal; not visible in the Todos list)
-- =============================================================================
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  body text,
  target_date text,
  reward text,
  done boolean not null default false,
  completed_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists milestones_user_idx on public.milestones (user_id);
create index if not exists milestones_goal_idx on public.milestones (goal_id);

-- =============================================================================
-- goal_images (photo attachments per goal — uploads or stock-API URLs)
--   source: 'upload' | 'pexels'
--   url:    public URL fetched by <Image>. For uploads, points at the
--           goal-images Storage bucket; for Pexels, the original photo URL.
-- =============================================================================
create table if not exists public.goal_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  url text not null,
  source text not null check (source in ('upload', 'pexels')),
  attribution text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists goal_images_goal_idx on public.goal_images (goal_id, position);
create index if not exists goal_images_user_idx on public.goal_images (user_id);

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
-- projects (workstreams — concrete chunks of execution under a goal)
--   Goal → Projects → Tasks. A project may optionally link to a milestone
--   to declare "this work contributes to that progress marker".
-- =============================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  body text,
  done boolean not null default false,
  completed_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists projects_goal_idx on public.projects (goal_id, position);
create index if not exists projects_user_idx on public.projects (user_id);

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
  goal_id uuid references public.goals(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete cascade,
  constraint todos_one_parent check (goal_id is null or milestone_id is null),
  created_at timestamptz not null default now()
);
create index if not exists todos_user_created_idx on public.todos (user_id, created_at desc);
-- Note: todos_goal_idx / todos_milestone_idx are created in the migration block
-- below, AFTER the alter table statements that add those columns to existing
-- databases. Creating them here would fail when re-running on an old DB whose
-- todos table predates the goal_id / milestone_id columns.

-- =============================================================================
-- Row-Level Security: every read/write is scoped to the authenticated user.
-- =============================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array['entries','affirmations','bucket_items','goals','goal_images','milestones','projects','routines','habits','habit_completions','trophies','todos']) loop
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
alter table public.goals add column if not exists reward text;
alter table public.goals add column if not exists body text;
alter table public.goals add column if not exists icon text;
alter table public.goals add column if not exists is_cornerstone boolean not null default false;
alter table public.goals add column if not exists position int not null default 0;
create unique index if not exists goals_one_cornerstone_per_user
  on public.goals (user_id) where is_cornerstone;
alter table public.todos add column if not exists due_at date;
create index if not exists todos_user_due_idx on public.todos (user_id, due_at);

-- entries.type: widen the allowed set to include 'confirmation'.
alter table public.entries drop constraint if exists entries_type_check;
alter table public.entries add constraint entries_type_check
  check (type in ('win', 'gratitude', 'confirmation'));

-- milestones.position: explicit ordering per goal. Existing rows default to 0;
-- the goal form normalizes positions on the next save (each milestone gets its
-- array index), so this is just a one-time additive migration.
alter table public.milestones add column if not exists position int not null default 0;

-- milestones gain goal-like fields so they can be edited in their own sheet.
alter table public.milestones add column if not exists body text;
alter table public.milestones add column if not exists target_date text;
alter table public.milestones add column if not exists reward text;

-- todos can attach to a goal OR a milestone (at most one).
alter table public.todos add column if not exists goal_id uuid references public.goals(id) on delete cascade;
alter table public.todos add column if not exists milestone_id uuid references public.milestones(id) on delete cascade;
alter table public.todos drop constraint if exists todos_one_parent;
alter table public.todos add constraint todos_one_parent
  check (goal_id is null or milestone_id is null);
create index if not exists todos_goal_idx on public.todos (goal_id);
create index if not exists todos_milestone_idx on public.todos (milestone_id);

-- todos.project_id: tasks always belong to a project in the new model.
-- Existing rows with goal_id / milestone_id stay valid; the UI gradually
-- migrates them by re-tagging.
alter table public.todos add column if not exists project_id
  uuid references public.projects(id) on delete cascade;
create index if not exists todos_project_idx on public.todos (project_id);

-- =============================================================================
-- Storage: goal-images bucket
-- Public bucket — URLs are embedded as goal_images.url and rendered directly.
-- Folder convention: {user_id}/{goal_id}/{uuid}.{ext}; the user_id segment
-- is what the policies key off.
-- =============================================================================
insert into storage.buckets (id, name, public)
  values ('goal-images', 'goal-images', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "goal-images public read" on storage.objects;
drop policy if exists "goal-images user write" on storage.objects;
drop policy if exists "goal-images user update" on storage.objects;
drop policy if exists "goal-images user delete" on storage.objects;

create policy "goal-images public read" on storage.objects
  for select using (bucket_id = 'goal-images');

create policy "goal-images user write" on storage.objects
  for insert with check (
    bucket_id = 'goal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "goal-images user update" on storage.objects
  for update using (
    bucket_id = 'goal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "goal-images user delete" on storage.objects
  for delete using (
    bucket_id = 'goal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
