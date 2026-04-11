-- Migration: 002_lead_pipeline.sql
-- Evolve opportunities table from generic sales stages to construction lead pipeline
-- Pipeline: cold_lead → warm_lead → preliminary_budget → pre_construction → formal_pricing → pending
-- End states: awarded, lost, on_hold, redesign, cancelled
-- Design phases: PD, SD, DD, CD, PER

-- ─── DROP OLD CONSTRAINT ────────────────────────────────────────────────────

alter table opportunities drop constraint if exists opportunities_stage_check;

-- ─── NEW COLUMNS ────────────────────────────────────────────────────────────

-- Design phase tracks where the project is in the architect's process
alter table opportunities
  add column if not exists design_phase text;

-- Outreach attempts: how many times we've tried to engage on a cold lead
alter table opportunities
  add column if not exists outreach_attempts integer not null default 0;

-- Budget revision counter for preliminary budget stage
alter table opportunities
  add column if not exists budget_revision integer not null default 0;

-- Client info (the homeowner/developer, not the architect)
alter table opportunities
  add column if not exists client_name text;
alter table opportunities
  add column if not exists client_email text;
alter table opportunities
  add column if not exists client_phone text;

-- End state metadata
alter table opportunities
  add column if not exists on_hold_reason text;
alter table opportunities
  add column if not exists redesign_notes text;
alter table opportunities
  add column if not exists cancelled_reason text;

-- Awarded date (replacing won_date semantically)
alter table opportunities
  add column if not exists awarded_date date;

-- Square footage and project type for the lead itself
alter table opportunities
  add column if not exists sf integer;
alter table opportunities
  add column if not exists project_type text;

-- Last outreach date for cold leads
alter table opportunities
  add column if not exists last_outreach_date date;

-- ─── MIGRATE EXISTING STAGE DATA ───────────────────────────────────────────

-- Map old stages to new pipeline stages
update opportunities set stage = 'cold_lead' where stage = 'lead';
update opportunities set stage = 'warm_lead' where stage = 'interview';
update opportunities set stage = 'formal_pricing' where stage = 'proposal';
update opportunities set stage = 'pending' where stage = 'negotiation';
update opportunities set stage = 'awarded', awarded_date = won_date where stage = 'won';
-- 'lost' stays as 'lost'

-- Set default stage for new rows
alter table opportunities alter column stage set default 'cold_lead';

-- ─── INDEXES ────────────────────────────────────────────────────────────────

-- ─── NEW CHECK CONSTRAINT ───────────────────────────────────────────────────

alter table opportunities add constraint opportunities_stage_check
  check (stage = any (array[
    'cold_lead', 'warm_lead', 'preliminary_budget', 'pre_construction', 'formal_pricing', 'pending',
    'awarded', 'lost', 'on_hold', 'redesign', 'cancelled'
  ]));

-- ─── INDEXES ────────────────────────────────────────────────────────────────

create index if not exists idx_opportunities_stage on opportunities(org_id, stage);
create index if not exists idx_opportunities_design_phase on opportunities(org_id, design_phase);
