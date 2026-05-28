-- Prioritized goals (in addition to the single cornerstone).
alter table public.goals
  add column if not exists is_priority boolean not null default false;
