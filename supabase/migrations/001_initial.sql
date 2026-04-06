-- ============================================================
-- RAPPORT — SUPABASE SCHEMA v1
-- Multi-tenant architect relationship platform for premium GCs
-- Run in Supabase SQL editor on a fresh project
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pg_cron";

-- ============================================================
-- CORE: ORGANIZATIONS (tenants) + USERS
-- ============================================================

create table organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  region          text,
  territory_label text,                        -- "Hudson Valley + Catskills"
  territory_lat   numeric,                     -- center lat of service area
  territory_lng   numeric,                     -- center lng
  territory_radius_miles int default 60,
  budget_min      int default 1000000,         -- min project budget ICP
  budget_max      int default 10000000,
  project_types   text[] default array['new construction','renovation','adaptive reuse'],
  procore_company_id text,                     -- for future Procore sync
  stripe_customer_id text,
  plan            text default 'trial' check (plan in ('trial','solo','studio','firm')),
  trial_ends_at   timestamptz default (now() + interval '21 days'),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table org_members (
  id       uuid primary key default gen_random_uuid(),
  org_id   uuid not null references organizations on delete cascade,
  user_id  uuid not null references auth.users on delete cascade,
  role     text not null default 'principal' check (role in ('principal','pm','estimator','viewer')),
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================

create table company_profiles (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations on delete cascade unique,
  story            text,
  tagline          text,
  founded_year     int,
  completed_projects int default 0,
  avg_project_value numeric,
  focus_budget_min  numeric,
  focus_budget_max  numeric,
  differentiators  jsonb default '[]',         -- array of strings
  core_values      jsonb default '[]',         -- array of {label, desc}
  updated_at       timestamptz default now()
);

create table kb_projects (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations on delete cascade,
  name            text not null,
  location        text,
  lat             numeric,
  lng             numeric,
  year            int,
  architect_id    uuid,                        -- fk to architects (nullable, architect may not be in CRM yet)
  architect_name  text,                        -- denormalized for display
  project_type    text,                        -- 'new construction' | 'renovation' | 'adaptive reuse' | etc.
  budget_value    numeric,
  sf              numeric,
  description     text,
  highlights      text[] default array[]::text[],
  tags            text[] default array[]::text[],
  photos          jsonb default '[]',          -- array of {url, caption, procore_id}
  procore_project_id text,
  is_showcase     boolean default false,
  embedding       vector(1536),               -- for semantic search
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table kb_materials (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations on delete cascade,
  name         text not null,
  category     text,
  lead_time_min_weeks int,
  lead_time_max_weeks int,
  price_range_low  numeric,
  price_range_high numeric,
  price_unit   text,                           -- 'SF' | 'LF' | 'EA' | etc.
  source       text,
  expertise    text,
  status       text default 'active',          -- 'active' | 'emerging' | 'discontinued'
  tags         text[] default array[]::text[],
  last_updated date,
  created_at   timestamptz default now()
);

create table kb_ve_cases (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations on delete cascade,
  title             text not null,
  project_id        uuid references kb_projects,
  project_name      text,
  architect_name    text,
  original_spec     text,
  ve_spec           text,
  savings_amount    numeric,
  savings_label     text,                      -- "$87,000"
  time_impact       text,
  how_it_worked     text,
  architect_response text,
  tags              text[] default array[]::text[],
  created_at        timestamptz default now()
);

-- ============================================================
-- ARCHITECT CRM
-- ============================================================

create table architects (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations on delete cascade,
  name            text not null,
  firm            text,
  email           text,
  phone           text,
  location        text,
  lat             numeric,
  lng             numeric,
  google_place_id text,
  website         text,
  instagram_handle text,
  linkedin_url    text,
  houzz_url       text,
  tier            text default 'Prospect' check (tier in ('Anchor','Growth','Prospect')),
  stage           text default 'Cold' check (stage in ('Active','Warm','Cooling','Cold')),
  style           text,
  project_types   text,
  awards          text,
  notes           text,
  pulse_score     int default 0 check (pulse_score between 0 and 100),
  last_contact_date date,
  projects_together int default 0,
  referral_value  numeric default 0,
  active_lead     text,
  next_action     text,
  source          text default 'manual' check (source in ('manual','google_places','radar','procore','referral')),
  is_in_radar     boolean default false,       -- discovered but not yet contacted
  embedding       vector(1536),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table architect_touchpoints (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations on delete cascade,
  architect_id uuid not null references architects on delete cascade,
  type         text check (type in ('email','call','meeting','site_visit','social','other')),
  notes        text,
  outcome      text,
  contacted_by uuid references auth.users,
  contacted_at timestamptz default now()
);

-- Pulse score is recalculated nightly via pg_cron
-- Formula: base 50 + projects_together*8 - days_since_contact*0.5 + stage_bonus - no_contact_penalty
create or replace function calculate_pulse(
  p_projects_together int,
  p_last_contact_date date,
  p_stage text,
  p_active_lead text
) returns int language plpgsql as $$
declare
  score int := 50;
  days_since int;
begin
  days_since := coalesce(current_date - p_last_contact_date, 365);
  score := score + least(p_projects_together * 8, 40);
  score := score - least(days_since / 2, 45);
  score := score + case p_stage
    when 'Active' then 15
    when 'Warm' then 5
    when 'Cooling' then -10
    when 'Cold' then -20
    else 0
  end;
  score := score + case when p_active_lead is not null then 10 else 0 end;
  return greatest(0, least(100, score));
end;
$$;

-- ============================================================
-- INTELLIGENCE: PERMITS + SIGNALS + COMPETITORS
-- ============================================================

create table permits (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations on delete cascade,
  architect_id     uuid references architects,
  architect_name   text,
  project_address  text not null,
  lat              numeric,
  lng              numeric,
  county           text,
  town             text,
  permit_number    text,
  filed_date       date,
  contractor_name  text,
  contractor_id    uuid,                       -- fk to competitors if matched
  estimated_value  numeric,
  permit_type      text,                       -- 'new_construction' | 'renovation' | 'demo' | 'addition' | 'septic' | 'variance'
  status           text,                       -- 'filed' | 'approved' | 'active' | 'complete' | 'stop_work' | 'expired'
  scope_description text,
  source_system    text,                       -- 'accela' | 'tyler' | 'manual' | 'csv' | 'buildzoom'
  source_url       text,
  raw_data         jsonb,
  our_project      boolean default false,
  opportunity      boolean default false,      -- unawarded / no contractor yet
  created_at       timestamptz default now(),
  unique (org_id, permit_number, county)
);

create table competitors (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations on delete cascade,
  name             text not null,
  location         text,
  website          text,
  instagram_handle text,
  google_place_id  text,
  google_rating    numeric,
  google_review_count int,
  founded_year     int,
  strengths        text[] default array[]::text[],
  weaknesses       text[] default array[]::text[],
  displacement_score int default 50,
  intel            text,
  opening          text,
  license_number   text,
  license_violations jsonb default '[]',
  active_liens     boolean default false,
  stop_work_orders jsonb default '[]',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Links architects to competitors (who builds their projects)
create table architect_competitor_links (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations on delete cascade,
  architect_id    uuid not null references architects on delete cascade,
  competitor_id   uuid not null references competitors on delete cascade,
  projects_count  int default 1,
  total_value     numeric default 0,
  first_year      int,
  latest_year     int,
  notes           text,
  created_at      timestamptz default now(),
  unique (architect_id, competitor_id)
);

create table signals (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations on delete cascade,
  architect_id uuid references architects,
  competitor_id uuid references competitors,
  type         text check (type in (
    'new_permit','new_post','new_review','award','publication',
    'website_update','job_posting','lien_filed','stop_work',
    'project_anniversary','opportunity','planning_board'
  )),
  priority     text default 'medium' check (priority in ('high','medium','low')),
  headline     text not null,
  detail       text,
  source       text,
  source_url   text,
  actioned_at  timestamptz,
  dismissed_at timestamptz,
  created_at   timestamptz default now()
);

-- ============================================================
-- CONTENT: EMAIL DRAFTS + OUTREACH LOG
-- ============================================================

create table ai_drafts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations on delete cascade,
  architect_id uuid references architects,
  type         text check (type in ('outreach','brief','email_series','ve_case','showcase','signal_response')),
  subject      text,
  body         text not null,
  prompt_used  text,
  model        text default 'claude-sonnet-4-20250514',
  sent_at      timestamptz,
  created_at   timestamptz default now()
);

-- ============================================================
-- MONITORING: WATCH CONFIGURATION
-- ============================================================

create table monitoring_targets (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations on delete cascade,
  architect_id uuid references architects,
  target_type  text check (target_type in ('architect','competitor','area')),
  source       text check (source in ('instagram','website','google_reviews','permits','planning_board','linkedin','press')),
  target_url   text,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_hash    text,                           -- content hash for change detection
  active       boolean default true,
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table company_profiles enable row level security;
alter table kb_projects enable row level security;
alter table kb_materials enable row level security;
alter table kb_ve_cases enable row level security;
alter table architects enable row level security;
alter table architect_touchpoints enable row level security;
alter table permits enable row level security;
alter table competitors enable row level security;
alter table architect_competitor_links enable row level security;
alter table signals enable row level security;
alter table ai_drafts enable row level security;
alter table monitoring_targets enable row level security;

-- Helper function: get current user's org_id
create or replace function current_org_id()
returns uuid language sql security definer stable as $$
  select org_id from org_members where user_id = auth.uid() limit 1;
$$;

-- RLS policies: users can only see their own org's data
do $$ declare
  t text;
begin
  foreach t in array array[
    'company_profiles','kb_projects','kb_materials','kb_ve_cases',
    'architects','architect_touchpoints','permits','competitors',
    'architect_competitor_links','signals','ai_drafts','monitoring_targets'
  ]
  loop
    execute format(
      'create policy "org_isolation" on %I for all using (org_id = current_org_id())', t
    );
  end loop;
end $$;

create policy "members_see_own_org" on org_members
  for select using (user_id = auth.uid() or org_id = current_org_id());

create policy "users_see_own_org" on organizations
  for select using (id = current_org_id());

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_architects_org on architects(org_id);
create index idx_architects_stage on architects(org_id, stage);
create index idx_architects_pulse on architects(org_id, pulse_score desc);
create index idx_permits_org on permits(org_id);
create index idx_permits_architect on permits(architect_id);
create index idx_permits_filed on permits(org_id, filed_date desc);
create index idx_signals_org_priority on signals(org_id, priority, created_at desc);
create index idx_signals_actioned on signals(org_id, actioned_at) where actioned_at is null;
create index idx_kb_projects_org on kb_projects(org_id);
create index idx_competitors_org on competitors(org_id);

-- Vector similarity search indexes (for AI-powered search)
create index idx_architects_embedding on architects using ivfflat (embedding vector_cosine_ops);
create index idx_kb_projects_embedding on kb_projects using ivfflat (embedding vector_cosine_ops);

-- ============================================================
-- NIGHTLY PULSE RECALCULATION (pg_cron)
-- ============================================================

select cron.schedule(
  'recalculate-pulse-scores',
  '0 6 * * *',  -- 6am UTC daily
  $$
    update architects set
      pulse_score = calculate_pulse(projects_together, last_contact_date, stage, active_lead),
      updated_at = now();
  $$
);

-- ============================================================
-- SEED: DEFAULT MONITORING SOURCES (inserted per org at signup)
-- ============================================================

create or replace function seed_org_defaults(p_org_id uuid)
returns void language plpgsql as $$
begin
  insert into company_profiles (org_id) values (p_org_id)
  on conflict (org_id) do nothing;
end;
$$;

-- Trigger: seed defaults when org is created
create or replace function on_org_created()
returns trigger language plpgsql security definer as $$
begin
  perform seed_org_defaults(new.id);
  return new;
end;
$$;

create trigger org_created_trigger
  after insert on organizations
  for each row execute function on_org_created();
