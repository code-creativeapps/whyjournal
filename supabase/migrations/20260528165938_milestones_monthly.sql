-- Monthly (recurring) milestones.
alter table public.milestones
  add column if not exists monthly boolean not null default false,
  add column if not exists period_month text,
  add column if not exists series_id text;

create index if not exists milestones_series_idx on public.milestones (series_id);
