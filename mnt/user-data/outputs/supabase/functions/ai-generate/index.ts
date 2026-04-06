// supabase/functions/ai-generate/index.ts
// The only place the Anthropic API key lives
// Receives a mode + context IDs, fetches KB from Supabase, calls Claude

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  mode: 'outreach' | 'brief' | 'email_series' | 've_email' | 'showcase' | 'signal_response'
  architectId?: string
  signalId?: string
  projectId?: string
  veId?: string
  emailSeriesType?: string
  emailSeriesTopic?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No auth header')

    // Create Supabase client with user's JWT to respect RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get current user's org
    const { data: memberData } = await supabase
      .from('org_members')
      .select('org_id')
      .single()

    const orgId = memberData?.org_id
    if (!orgId) throw new Error('No org found for user')

    const body: RequestBody = await req.json()

    // Fetch KB context for this org
    const [profileRes, projectsRes] = await Promise.all([
      supabase.from('company_profiles').select('*').eq('org_id', orgId).single(),
      supabase.from('kb_projects').select('*').eq('org_id', orgId).order('year', { ascending: false }).limit(5),
    ])

    const profile = profileRes.data
    const projects = projectsRes.data ?? []

    // Build the system prompt with KB context
    const systemPrompt = buildSystemPrompt(profile, projects)

    // Build the user prompt based on mode
    let userPrompt = ''
    let architect = null
    let signal = null
    let project = null

    if (body.architectId) {
      const { data } = await supabase
        .from('architects')
        .select('*')
        .eq('id', body.architectId)
        .single()
      architect = data
    }

    if (body.signalId) {
      const { data } = await supabase
        .from('signals')
        .select('*')
        .eq('id', body.signalId)
        .single()
      signal = data
    }

    if (body.projectId) {
      const { data } = await supabase
        .from('kb_projects')
        .select('*')
        .eq('id', body.projectId)
        .single()
      project = data
    }

    switch (body.mode) {
      case 'outreach':
        userPrompt = buildOutreachPrompt(architect)
        break
      case 'brief':
        userPrompt = buildBriefPrompt(architect)
        break
      case 'signal_response':
        userPrompt = buildSignalResponsePrompt(architect, signal)
        break
      case 'showcase':
        userPrompt = buildShowcasePrompt(project)
        break
      case 'email_series':
        userPrompt = buildEmailSeriesPrompt(body.emailSeriesType, body.emailSeriesTopic)
        break
      default:
        throw new Error(`Unknown mode: ${body.mode}`)
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('AI generation error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildSystemPrompt(profile: any, projects: any[]): string {
  const companyName = profile?.org?.name ?? 'our company'
  const story = profile?.story ?? ''
  const differentiators = (profile?.differentiators ?? []).join('; ')
  const projectSummary = projects
    .map(p => `${p.name} (${p.year}, ${p.architect_name ?? 'architect'}, ${p.project_type}, ${p.location})`)
    .join('; ')

  return `You are the business development lead for ${companyName}, a premium custom residential general contractor.

${story ? `About us: ${story}` : ''}
${differentiators ? `What makes us different: ${differentiators}` : ''}
${projectSummary ? `Recent notable projects: ${projectSummary}` : ''}

Rules for all output:
- No em dashes
- Direct and confident tone — not salesy or corporate
- Sound like a real person, not a marketing department
- Reference specific capabilities and projects where relevant
- Keep output concise and actionable`
}

function buildOutreachPrompt(architect: any): string {
  return `Write personalized outreach to architect ${architect?.name ?? 'this architect'} of ${architect?.firm ?? 'their firm'}.

Design style: ${architect?.style ?? 'not specified'}
Project types: ${architect?.project_types ?? 'not specified'}
Awards/recognition: ${architect?.awards ?? 'none noted'}
Projects together: ${architect?.projects_together ?? 0}
Relationship stage: ${architect?.stage ?? 'Cold'}
Notes: ${architect?.notes ?? 'none'}

Write 3-5 sentences. Reference their specific work. No sign-off needed.`
}

function buildBriefPrompt(architect: any): string {
  return `Generate a pre-call intelligence brief for architect ${architect?.name ?? 'this architect'} of ${architect?.firm ?? 'their firm'}.

Design style: ${architect?.style ?? 'not specified'}
Project types: ${architect?.project_types ?? 'not specified'}
Awards: ${architect?.awards ?? 'none noted'}
History: ${architect?.projects_together ?? 0} projects together
Stage: ${architect?.stage ?? 'Cold'}

Format exactly:
1. WHO THEY ARE (2 sentences)
2. WHAT THEY VALUE IN A GC (3 bullet points)
3. WHERE WE FIT (2 sentences)
4. RISK FLAGS (1-2 bullets)
5. OPENING MOVE (1 specific action)`
}

function buildSignalResponsePrompt(architect: any, signal: any): string {
  return `A new intelligence signal arrived about architect ${architect?.name ?? 'this architect'}:

Signal: "${signal?.headline ?? ''}"
Detail: "${signal?.detail ?? ''}"

Write a specific, tactical response script — what to say, which channel to use, and the exact first sentence to open with. 3-5 sentences max.`
}

function buildShowcasePrompt(project: any): string {
  return `Write a project showcase email about ${project?.name ?? 'this project'} for an architect audience.

Project: ${project?.name}, ${project?.location}, ${project?.year}
Architect: ${project?.architect_name ?? 'not specified'}
Type: ${project?.project_type}
Budget: ${project?.budget_value ? `$${(project.budget_value / 1000000).toFixed(1)}M` : 'not specified'}
Description: ${project?.description ?? ''}
Highlights: ${(project?.highlights ?? []).join('; ')}

Lead with the hardest problem solved. Builder's perspective, not a press release. 180-220 words. Include subject line.`
}

function buildEmailSeriesPrompt(type?: string, topic?: string): string {
  return `Write a value-add email for our architect network.

Series: ${type ?? 'general'}
Topic: ${topic ?? 'construction intelligence'}

Include:
- Subject line
- Opening that gets to the point in one sentence
- The actual content (real value, not a teaser)
- Closing that invites conversation without begging

200-240 words. Expert peer tone, not vendor.`
}
