# Rapport — Sprint 1 Kickoff
*Claude Code context document — paste this at the start of your session*

---

## What we're building

**Rapport** is a standalone SaaS product for premium residential GCs. It is an architect relationship platform: CRM, knowledge base, intelligence feed, regional radar, and AI-powered outreach — all purpose-built for GCs whose pipeline comes from architects.

**Stack:** Vite + React + TypeScript + Supabase + Vercel + Anthropic API  
**Repo:** `rapport` (new, separate from NOVATerra)  
**Supabase:** New project (not the NOVATerra project pgmefhgbygkqfzcvwxqv)

---

## Sprint 1 scope — ship in 2 weeks

These are the only things we build in Sprint 1. Nothing else.

1. **Project setup** — Vite + React + TS, Supabase client, Vercel config, env vars
2. **Auth** — Supabase Auth, sign up with org creation, sign in, protected routes
3. **Onboarding wizard** — 4-step setup: company name + region → company story → first 3 projects → first 3 architects
4. **Architect CRM** — CRUD for architects, pulse scoring, stage management, relationship notes
5. **Knowledge base** — Company profile + project cards + VE cases + materials (read/write)
6. **AI outreach + brief** — Anthropic API via Supabase Edge Function, uses KB context
7. **Regional Radar** — Google Places API, configurable search by region, add to CRM
8. **Map view** — Google Maps JS API, architect offices + project locations

**Not in Sprint 1:** Signal feed, permit integration, competitor profiles, email scheduler, Procore sync, team seats.

---

## Repository structure

```
rapport/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── layout/          # AppShell, Sidebar, Header
│   │   ├── crm/             # ArchitectCard, PulseBar, TouchpointLog
│   │   ├── kb/              # ProjectCard, VECaseCard, MaterialCard
│   │   ├── radar/           # RadarCard, RadarSearch
│   │   └── map/             # ArchitectMap
│   ├── pages/
│   │   ├── auth/            # SignIn, SignUp, Onboarding
│   │   ├── crm/             # CRM index, ArchitectDetail
│   │   ├── kb/              # KnowledgeBase index
│   │   ├── radar/           # Radar index
│   │   ├── map/             # Map view
│   │   └── settings/        # Org settings, profile
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   ├── ai.ts            # Anthropic API calls (via edge function)
│   │   └── pulse.ts         # Pulse score calculation (client-side preview)
│   ├── hooks/
│   │   ├── useOrg.ts        # Current org context
│   │   ├── useArchitects.ts # Architect CRUD + realtime
│   │   └── useKB.ts         # Knowledge base CRUD
│   └── types/
│       └── index.ts         # All TypeScript interfaces
├── supabase/
│   ├── functions/
│   │   └── ai-generate/     # Edge function for Anthropic API calls
│   └── migrations/
│       └── 001_initial.sql  # The full schema (rapport-schema.sql)
├── .env.local
└── vercel.json
```

---

## Environment variables

```env
# .env.local
VITE_SUPABASE_URL=https://[new-project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_GOOGLE_MAPS_API_KEY=[key]
VITE_GOOGLE_PLACES_API_KEY=[key]

# Supabase Edge Function secrets (set via supabase secrets set)
ANTHROPIC_API_KEY=[key]
```

---

## Data types (TypeScript interfaces)

```typescript
// src/types/index.ts

export interface Organization {
  id: string;
  name: string;
  slug: string;
  region: string;
  territory_label: string;
  territory_lat: number;
  territory_lng: number;
  territory_radius_miles: number;
  budget_min: number;
  budget_max: number;
  plan: 'trial' | 'solo' | 'studio' | 'firm';
  trial_ends_at: string;
}

export interface Architect {
  id: string;
  org_id: string;
  name: string;
  firm: string;
  email?: string;
  phone?: string;
  location: string;
  lat?: number;
  lng?: number;
  website?: string;
  instagram_handle?: string;
  tier: 'Anchor' | 'Growth' | 'Prospect';
  stage: 'Active' | 'Warm' | 'Cooling' | 'Cold';
  style?: string;
  project_types?: string;
  awards?: string;
  notes?: string;
  pulse_score: number;
  last_contact_date?: string;
  projects_together: number;
  referral_value: number;
  active_lead?: string;
  next_action?: string;
  is_in_radar: boolean;
}

export interface KBProject {
  id: string;
  org_id: string;
  name: string;
  location: string;
  year: number;
  architect_id?: string;
  architect_name?: string;
  project_type: string;
  budget_value: number;
  sf?: number;
  description?: string;
  highlights: string[];
  tags: string[];
  photos: Array<{ url: string; caption?: string }>;
  is_showcase: boolean;
}

export interface VECase {
  id: string;
  org_id: string;
  title: string;
  project_name?: string;
  architect_name?: string;
  original_spec: string;
  ve_spec: string;
  savings_amount: number;
  savings_label: string;
  time_impact?: string;
  how_it_worked: string;
  architect_response?: string;
}

export interface Signal {
  id: string;
  org_id: string;
  architect_id?: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  headline: string;
  detail?: string;
  source?: string;
  actioned_at?: string;
  created_at: string;
}
```

---

## Supabase Edge Function: AI generation

```typescript
// supabase/functions/ai-generate/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk';

const client = new Anthropic();

interface GenerateRequest {
  mode: 'outreach' | 'brief' | 'email_series' | 've_email' | 'showcase';
  architect: Record<string, unknown>;
  org_context: {
    company_name: string;
    story: string;
    differentiators: string[];
    region: string;
    budget_range: string;
    showcase_projects?: Array<{ name: string; description: string; highlights: string[] }>;
  };
  extra?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const { mode, architect, org_context, extra } = await req.json() as GenerateRequest;

  const systemPrompt = `You are the business development lead for ${org_context.company_name}, a premium custom residential general contractor in ${org_context.region}. You build ${org_context.budget_range} homes.

Company story: ${org_context.story}

Key differentiators: ${org_context.differentiators.join('; ')}

${org_context.showcase_projects ? `Recent notable projects: ${org_context.showcase_projects.map(p => `${p.name} — ${p.description}`).join('; ')}` : ''}

Rules for all output: No em dashes. Direct and confident tone. Sound like a real person, not a marketing department. Reference specific capabilities and projects where relevant.`;

  const prompts: Record<string, string> = {
    outreach: `Write personalized outreach to architect ${architect.name} of ${architect.firm}.
Architect design style: ${architect.style}
Their project types: ${architect.project_types}
Awards/recognition: ${architect.awards}
Projects completed together: ${architect.projects_together}
Stage: ${architect.stage}
Notes: ${architect.notes}

3-5 sentences. Reference their specific work. Not salesy. No sign-off needed.`,

    brief: `Generate a pre-call intelligence brief for architect ${architect.name} of ${architect.firm}.
Design style: ${architect.style}
Project types: ${architect.project_types}
Awards: ${architect.awards}
History together: ${architect.projects_together} projects

Format:
1. WHO THEY ARE (2 sentences)
2. WHAT THEY VALUE IN A GC (3 bullets)
3. WHERE WE FIT (2 sentences)
4. RISK FLAGS (1-2 bullets)
5. OPENING MOVE (1 specific action)`,
  };

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompts[mode] || prompts.outreach }],
  });

  return new Response(
    JSON.stringify({ text: message.content[0].type === 'text' ? message.content[0].text : '' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

## Route structure

```
/                     → redirect to /crm if authed, else landing page
/sign-in              → auth
/sign-up              → auth + org creation
/onboarding           → 4-step wizard (company → story → projects → architects)
/crm                  → architect list + filters
/crm/:id              → architect detail + touchpoint log + AI panel
/kb                   → knowledge base (tabs: company / projects / VE / materials)
/kb/projects/new      → add project
/kb/ve/new            → add VE case
/radar                → regional radar (search + results + add to CRM)
/map                  → architect + project map
/settings             → org settings, plan, team
```

---

## Onboarding wizard — 4 steps

**Step 1 — Your firm**
- Company name (required)
- Region / service territory (text field + map pin)
- Project budget range (slider: $500K–$10M)

**Step 2 — Your story**
- Company story (textarea, 2-4 sentences)
- 3 differentiators (guided prompts: "What do you do that most GCs don't?")
- Core values (optional — can skip)

**Step 3 — Add your first projects**
- Minimum 1, maximum 5 at onboarding
- Name, location, year, architect name (free text), type, budget, 2-sentence description
- "Import from Procore CSV" option (parses exported CSV, maps columns)

**Step 4 — Add your first architects**
- "Search for architects in your region" → Google Places query
- Select from results or add manually
- Minimum 1, suggested 3–5
- Set stage (Active / Warm / Cold) for each

**On complete:** redirect to /crm with confetti. First AI outreach draft auto-generated for the first Active architect.

---

## Pulse score calculation (client-side preview, recalculated nightly in DB)

```typescript
// src/lib/pulse.ts
export function calculatePulse(architect: Architect): number {
  let score = 50;
  const daysSinceContact = architect.last_contact_date
    ? Math.floor((Date.now() - new Date(architect.last_contact_date).getTime()) / 86400000)
    : 365;

  score += Math.min(architect.projects_together * 8, 40);
  score -= Math.min(Math.floor(daysSinceContact / 2), 45);
  score += { Active: 15, Warm: 5, Cooling: -10, Cold: -20 }[architect.stage] ?? 0;
  score += architect.active_lead ? 10 : 0;
  return Math.max(0, Math.min(100, score));
}
```

---

## Regional Radar — Google Places query

```typescript
// src/hooks/useRadar.ts
export async function searchArchitectsInRegion(
  lat: number,
  lng: number,
  radiusMiles: number,
  apiKey: string
): Promise<PlaceResult[]> {
  const radiusMeters = radiusMiles * 1609;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
    `location=${lat},${lng}&radius=${radiusMeters}` +
    `&keyword=architect+residential&type=establishment&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results;
}
```

---

## Design system

Use **shadcn/ui** as the base component library. Override with Rapport-specific styles:

- Background: `hsl(var(--background))` — clean white / near-black in dark
- Primary accent: `#0F6E56` (deep teal) — pulse high, active states, CTA buttons
- Warning: `#BA7517` (amber) — medium pulse, warm stage
- Danger: `#A32D2D` (deep red) — low pulse, overdue contacts
- Card: white background, `0.5px solid` border, `border-radius: 12px`
- Typography: Geist Sans (same as Vercel) — clean, modern, readable

---

## Sprint 1 acceptance criteria

**Auth**
- [ ] User can sign up with email + password, creating a new organization
- [ ] User can sign in and see their org's data only
- [ ] Unauthenticated routes redirect to /sign-in
- [ ] Org slug is auto-generated from company name

**Onboarding**
- [ ] 4-step wizard completes without errors
- [ ] At least 1 project and 1 architect required to proceed
- [ ] Procore CSV import parses at least: project name, location, architect, value
- [ ] Redirect to CRM on completion

**CRM**
- [ ] Architect list shows all architects with pulse bar, stage badge, last contact
- [ ] Can add, edit, delete architects
- [ ] Pulse score updates client-side immediately on edit
- [ ] Can log a touchpoint (type + notes) on each architect
- [ ] Can filter by stage, sort by pulse or last contact

**Knowledge Base**
- [ ] Company profile is editable (story + differentiators + values)
- [ ] Projects list with expand/collapse for detail
- [ ] VE cases list with before/after + savings
- [ ] Materials list with lead times and pricing
- [ ] All CRUD operations work and persist

**AI**
- [ ] "Draft Outreach" button calls edge function, streams response into modal
- [ ] "Gen Brief" button calls edge function, streams response into modal
- [ ] Both use org's KB context (company story + projects) in system prompt
- [ ] Copy to clipboard works

**Radar**
- [ ] Search by region (Google Places nearby search)
- [ ] Results show firm name, rating, address, website
- [ ] "Add to CRM" button creates architect record
- [ ] Results can be filtered by rating

**Map**
- [ ] Shows all CRM architects as pins (color-coded by stage)
- [ ] Shows completed projects as separate pins
- [ ] Clicking a pin shows name + stage + active lead
- [ ] Map auto-centers on org's territory lat/lng

---

## First commands to run

```bash
# 1. Create new repo
mkdir rapport && cd rapport
git init

# 2. Scaffold Vite + React + TS
npm create vite@latest . -- --template react-ts
npm install

# 3. Install dependencies
npm install @supabase/supabase-js @anthropic-ai/sdk
npm install @radix-ui/react-dialog @radix-ui/react-select lucide-react
npm install class-variance-authority clsx tailwind-merge
npm install tailwindcss @tailwindcss/vite autoprefixer
npx shadcn@latest init

# 4. Install Supabase CLI and link to new project
npm install -g supabase
supabase init
supabase login
supabase link --project-ref [new-project-ref]

# 5. Run schema migration
supabase db push  # (after adding rapport-schema.sql to supabase/migrations/)

# 6. Deploy edge function
supabase functions deploy ai-generate
supabase secrets set ANTHROPIC_API_KEY=[your-key]

# 7. Start dev server
npm run dev
```

---

## Sprint 2 preview (don't build yet)

- Signal feed (manual entry + basic web scraping)
- Permit CSV import (from BuildZoom export or county PDF parser)
- Competitor profiles (manual entry, linked to architect permit history)
- Email series drafts (from KB content)
- Team invites (Studio + Firm plan feature)

---

*End of Sprint 1 kickoff doc. Paste this into a new Claude Code session as initial context.*
