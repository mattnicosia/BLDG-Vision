-- Migration: 003_pipeline_stages_table.sql
-- Move pipeline stages from hardcoded constants to a per-org database table
-- Protected stages (awarded, lost) cannot be deleted

-- ─── CREATE TABLE ───────────────────────────────────────────────────────────

create table if not exists pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  key         text not null,
  label       text not null,
  color       text not null default '#7C7C7C',
  probability integer not null default 10 check (probability >= 0 and probability <= 100),
  stage_type  text not null default 'pipeline' check (stage_type in ('pipeline', 'end_state')),
  sort_order  integer not null default 0,
  is_protected boolean not null default false,
  created_at  timestamptz default now()
);

-- Unique key per org
create unique index if not exists idx_pipeline_stages_org_key on pipeline_stages(org_id, key);
create index if not exists idx_pipeline_stages_org_order on pipeline_stages(org_id, sort_order);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table pipeline_stages enable row level security;

create policy "Users can view their org pipeline stages"
  on pipeline_stages for select
  using (org_id = current_org_id());

create policy "Users can insert pipeline stages for their org"
  on pipeline_stages for insert
  with check (org_id = current_org_id());

create policy "Users can update their org pipeline stages"
  on pipeline_stages for update
  using (org_id = current_org_id());

create policy "Users can delete their org pipeline stages"
  on pipeline_stages for delete
  using (org_id = current_org_id());

-- ─── SEED DEFAULT STAGES FOR ALL EXISTING ORGS ─────────────────────────────

insert into pipeline_stages (org_id, key, label, color, probability, stage_type, sort_order, is_protected)
select o.id, s.key, s.label, s.color, s.probability, s.stage_type, s.sort_order, s.is_protected
from organizations o
cross join (values
  ('cold_lead',          'Cold Lead',       '#7C7C7C',  5,  'pipeline',  0, false),
  ('warm_lead',          'Warm Lead',       '#F59E0B', 15,  'pipeline',  1, false),
  ('preliminary_budget', 'Prelim Budget',   '#818CF8', 30,  'pipeline',  2, false),
  ('pre_construction',   'Pre-Con',         '#06B6D4', 50,  'pipeline',  3, false),
  ('formal_pricing',     'Formal Pricing',  '#A855F7', 60,  'pipeline',  4, false),
  ('pending',            'Pending',         '#FBBF24', 75,  'pipeline',  5, false),
  ('awarded',            'Awarded',         '#22C55E', 100, 'end_state', 0, true),
  ('lost',               'Lost',            '#EF4444',  0,  'end_state', 1, true),
  ('on_hold',            'On Hold',         '#A3A3A3', 10,  'end_state', 2, false),
  ('redesign',           'Redesign',        '#D97706', 20,  'end_state', 3, false),
  ('cancelled',          'Cancelled',       '#6B7280',  0,  'end_state', 4, false)
) as s(key, label, color, probability, stage_type, sort_order, is_protected)
on conflict (org_id, key) do nothing;

-- ─── DROP HARDCODED CHECK CONSTRAINT ────────────────────────────────────────

alter table opportunities drop constraint if exists opportunities_stage_check;
