# BLDG Vision — Claude Code Context

> Read this entire file before touching any code. This is the project bible.

---

## What this is

**BLDG Vision** (working name — may launch as Corvo at corvo.build) is an AI-powered architect relationship and market intelligence platform for premium residential general contractors. It gives GCs complete visibility over their architect pipeline, competitor activity, permit filings, and planning board activity — before anyone else in the market knows what's happening.

**This is NOT NOVATerra.** Completely separate product. Separate Supabase project. Separate Vercel deployment. Separate codebase. Do not reference NOVATerra patterns, copy code from NOVATerra, or confuse the two. If you find yourself thinking about NOVATerra, stop.

**Builder:** Matt Nicosia, Pearl River NY. VP + owner of Montana Home Builders (MHB). MHB is customer #1 and the beta user this product is built for first.

**The core problem it solves:** Premium residential GCs depend on architect relationships for 80%+ of their revenue, but they have no systematic way to track, grow, or protect those relationships — and zero visibility into competitor activity, permit filings, or early-stage project signals.

---

## Stack — final, do not change

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Vite + React + TypeScript | Same as NOVATerra. Do NOT switch to Next.js. |
| Database | Supabase (NEW project) | NOT the NOVATerra project. Separate credentials. |
| Auth | Supabase Auth | Email + password. Magic link optional later. |
| AI | Anthropic API via Edge Functions | claude-sonnet-4-20250514. Never call from client. |
| Hosting | Vercel | Same org as NOVATerra, new project: bldg-vision. |
| Payments | Stripe | 3 tiers: $149 / $299 / $499 per month. 21-day trial. |
| Maps | Google Maps JS + Places API | Territory map + Regional Radar search. |
| Email | Resend | Signal notifications + value-add email scheduling. |
| Components | shadcn/ui | Base component library. |
| Styling | Tailwind CSS | Via @tailwindcss/vite plugin. |
| Permit data | BuildZoom API (Sprint 5) | CSV import only for Sprint 1-4. |

---

## The product — what it does

Five core modules:

**1. Architect CRM**
Relationship tracking with AI-powered Pulse scoring (0–100). Every architect gets a stage (Active/Warm/Cooling/Cold), last contact date, projects together count, lifetime referral value, and a "next action" field. Pulse recalculates nightly via pg_cron.

**2. Knowledge Base**
The context layer that makes AI output sound like MHB, not a template. Contains: company story + differentiators + values, completed project portfolio (with photos, highlights, architect credits), VE case studies (before/after + dollar savings), and materials library (lead times, pricing, expertise notes). All KB content feeds into the AI system prompt.

**3. AI Outreach + Intelligence Briefs**
Two AI actions available on every architect: Draft Outreach (3–5 sentence personalized outreach using KB context) and Generate Brief (pre-call intelligence dossier). Both call the ai-generate Supabase Edge Function which pulls from the org's KB tables before building the prompt.

**4. Regional Radar**
Discovers every architect doing the target work in the org's service territory using Google Places Nearby Search. Results show rating, address, website. One-click adds to CRM.

**5. Signal Feed + Competitive Intelligence**
Monitors permits, social media, planning board minutes, competitor reviews, and lien filings. Surfaces actionable signals (new permit filed, competitor review drops, planning board application). Competitor profiles show which GCs are building for target architects, with displacement scores.

---

## Database — critical rules

**Supabase project URL:** `[SET IN .env.local — see .env.local.example]`

**Multi-tenancy:** Every table has `org_id`. Row Level Security (RLS) is enabled on all tables. The `current_org_id()` function returns the authenticated user's org. Never query without going through the authenticated Supabase client — RLS enforces data isolation automatically.

**Never bypass RLS.** Never use the service role key in client-side code. The anon key + RLS is the only access pattern for client-side queries.

**Schema file:** `supabase/migrations/001_initial.sql` — this is the source of truth. If you need to modify the schema, add a new migration file, don't edit the original.

**Key tables:**
- `organizations` — tenants (one per GC firm)
- `org_members` — user-to-org membership + role
- `company_profiles` — KB company story (one per org)
- `kb_projects` — completed project portfolio
- `kb_materials` — material library with lead times
- `kb_ve_cases` — value engineering case studies
- `architects` — CRM contacts with pulse scores
- `architect_touchpoints` — contact log per architect
- `permits` — permit records from county databases
- `competitors` — competitor GC profiles
- `architect_competitor_links` — which GCs build for which architects
- `signals` — intelligence feed items
- `ai_drafts` — saved AI-generated content
- `monitoring_targets` — watch configuration per architect

---

## File structure

```
bldg-vision/
├── CLAUDE.md                          ← YOU ARE HERE
├── src/
│   ├── components/
│   │   ├── ui/                        ← shadcn/ui base components
│   │   ├── layout/                    ← AppShell, Sidebar, Header, ProtectedRoute
│   │   ├── crm/                       ← ArchitectCard, PulseBar, StageBadge, TouchpointLog
│   │   ├── kb/                        ← ProjectCard, VECaseCard, MaterialCard, CompanyEditor
│   │   ├── radar/                     ← RadarSearch, RadarCard
│   │   ├── map/                       ← ArchitectMap
│   │   ├── signals/                   ← SignalCard, SignalFeed
│   │   └── ai/                        ← AIModal, OutreachDraft, BriefPanel
│   ├── pages/
│   │   ├── auth/                      ← SignIn, SignUp
│   │   ├── onboarding/                ← OnboardingWizard (4 steps)
│   │   ├── crm/                       ← CRMIndex, ArchitectDetail
│   │   ├── kb/                        ← KBIndex (tabs: company/projects/ve/materials)
│   │   ├── radar/                     ← RadarIndex
│   │   ├── map/                       ← MapIndex
│   │   ├── signals/                   ← SignalsIndex
│   │   └── settings/                  ← OrgSettings, BillingSettings, TeamSettings
│   ├── lib/
│   │   ├── supabase.ts                ← Supabase client (anon key only)
│   │   ├── ai.ts                      ← Functions to call ai-generate edge function
│   │   └── pulse.ts                   ← Client-side pulse score calculation
│   ├── hooks/
│   │   ├── useOrg.ts                  ← Current org context + user role
│   │   ├── useArchitects.ts           ← Architect CRUD + realtime subscription
│   │   ├── useKB.ts                   ← Knowledge base CRUD
│   │   └── useSignals.ts              ← Signal feed + unread count
│   └── types/
│       └── index.ts                   ← All TypeScript interfaces
├── supabase/
│   ├── functions/
│   │   └── ai-generate/
│   │       └── index.ts               ← Anthropic API proxy edge function
│   └── migrations/
│       └── 001_initial.sql            ← Full schema (rapport-schema.sql)
├── .env.local                         ← Never commit. See .env.local.example.
├── .env.local.example                 ← Commit this. Shows required vars.
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Routes

```
/                     → redirect → /crm (if authed) or /sign-in
/sign-in              → auth
/sign-up              → auth + org creation
/onboarding           → 4-step wizard
/crm                  → architect list
/crm/:id              → architect detail + AI panel
/kb                   → knowledge base (tabs)
/kb/projects/new      → add project
/kb/ve/new            → add VE case
/radar                → regional radar
/map                  → territory map
/signals              → intelligence feed
/settings             → org + billing + team
```

---

## Design conventions

**Colors (hardcoded for semantic use, not Tailwind vars):**
- Active/positive: `#0F6E56` (deep teal)
- Warning/overdue: `#BA7517` (amber)  
- Danger/cold: `#A32D2D` (dark red)
- Pulse high (≥80): `#0F6E56`
- Pulse mid (≥50): `#BA7517`
- Pulse low (<50): `#A32D2D`

**Stage colors:**
- Active: bg `#E1F5EE` / text `#085041` / border `#9FE1CB`
- Warm: bg `#FAEEDA` / text `#854F0B` / border `#FAC775`
- Cooling: bg `#EEEDFE` / text `#3C3489` / border `#AFA9EC`
- Cold: bg `#F1EFE8` / text `#5F5E5A` / border `#D3D1C7`

**Component patterns:**
- Cards: white bg, `0.5px solid var(--border)`, `border-radius: 12px`, `padding: 16px 18px`
- Metric cards: secondary bg (gray), no border, `border-radius: 8px`, `padding: 10px 12px`
- Badges/chips: 10px font, 2px vertical / 7px horizontal padding, 20px border-radius
- Avatars: colored circle with initials, 36–44px, no image upload in v1

**Typography:**
- Font: Geist Sans (import from Vercel CDN or use Inter as fallback)
- Headings: 500 weight only (never 600 or 700)
- Body: 400 weight, 16px, line-height 1.7

**DO NOT:**
- Use em dashes in any user-facing copy or AI-generated output
- Use bold mid-sentence
- Put gradients, shadows, or glows on anything
- Use rounded corners on single-sided borders

---

## AI edge function — how it works

All AI calls go through `supabase/functions/ai-generate/index.ts`. The client calls it like:

```typescript
const { data } = await supabase.functions.invoke('ai-generate', {
  body: { mode: 'outreach', architectId: '...', orgId: '...' }
})
```

The edge function:
1. Receives the request with mode + context IDs
2. Fetches the org's KB data from Supabase (company_profiles, kb_projects, kb_ve_cases)
3. Builds a system prompt using the KB context
4. Calls Anthropic claude-sonnet-4-20250514
5. Returns the generated text

**Modes:** `outreach` | `brief` | `email_series` | `ve_email` | `showcase` | `signal_response`

The Anthropic API key lives ONLY in the edge function environment. Never in client code. Never in .env.local on the client side.

---

## Pulse score formula

```typescript
function calculatePulse(architect: Architect): number {
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

Update this client-side immediately on any edit. Nightly pg_cron recalculates in the database.

---

## Key commands

```bash
# Development
npm run dev                              # Start Vite dev server (port 5173)
npm run build                            # Production build
npm run preview                          # Preview production build

# Supabase
supabase start                           # Start local Supabase (optional, use remote)
supabase db push                         # Push schema migrations to remote
supabase db pull                         # Pull remote schema changes
supabase functions deploy ai-generate    # Deploy AI edge function
supabase functions serve                 # Test edge functions locally
supabase secrets set ANTHROPIC_API_KEY=  # Set edge function secrets

# Git
git add -A && git commit -m "..."       # Commit everything
git push origin main                     # Push to GitHub (triggers Vercel deploy)
```

---

## Current sprint

**Sprint 1 — Foundation + Auth + Architect CRM**  
Weeks 1–2. Goal: Working app deployed to Vercel. New user can sign up, complete onboarding, and use the Architect CRM with AI-powered outreach.

**Status:** Starting now.

**What's been built:** Nothing yet. Schema is designed. This is day one.

**Sprint 1 acceptance criteria:**
- New org can be created end-to-end in under 10 minutes
- Architect pulse score updates client-side immediately on edit
- AI outreach draft references org's actual company story and projects
- Two test orgs cannot see each other's data (RLS verified)
- Deployed to Vercel production URL

---

## What gets updated here

After each sprint, update:
1. **Current sprint** section above — change the sprint number, title, status
2. **What's been built** — brief bullet list of completed features
3. **File structure** — add any new directories or notable files
4. Any **conventions** that emerged during the build

Do this at the end of each session where significant progress was made. It takes 3 minutes and saves 30 minutes of re-orientation next session.

---

## Montana Home Builders (MHB) — beta customer context

MHB is the first customer. Every design decision should be validated against this use case:
- Premium residential GC, Hudson Valley + Catskills NY
- Builds $1.5M–$8M+ custom homes
- ~47 completed projects, $2.4M average project value
- Pipeline is 80%+ architect-dependent
- Key architects: Sarah Chen, James Okafor, Marcus Webb, Petra Novak, Diana Flores
- Service territory: Columbia, Greene, Ulster, Dutchess counties NY
- Territory center: approximately 42.0°N 74.0°W
- Uses Procore for project management

When building any feature, ask: would this actually work for MHB? Would Matt use this in a real outreach situation?

---

## Integration timeline

| Sprint | Integration | Notes |
|--------|------------|-------|
| 1 | Supabase + Anthropic | Core infrastructure |
| 2 | Google Maps + Places | Map + Radar |
| 3 | Stripe | Billing |
| 4 | Resend | Email |
| 5 | BuildZoom + Procore OAuth | Live data |
| 5 | NOVATerra SSO | Shared auth for dual users |
| 6 | Puppeteer/Playwright | Planning board scraping |

**NOVATerra integration:** Do not build anything that connects to NOVATerra before Sprint 5. When it comes, the integration is: shared Supabase Auth so a user with both accounts can link them. No shared database tables. No shared API calls. Just SSO.

---

## Pricing

| Tier | Price | Seats | Key limits |
|------|-------|-------|-----------|
| Solo | $149/mo | 1 | 25 architects, 10 projects |
| Studio | $299/mo | 3 | Unlimited, no signal feed |
| Firm | $499/mo | 10 | Unlimited + signal feed |

21-day free trial on all plans. Annual billing at 20% discount (Sprint 6).

---

*Last updated: Sprint 1 start. Update this file after every session.*
