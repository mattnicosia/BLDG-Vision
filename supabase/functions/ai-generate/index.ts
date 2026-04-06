import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No auth header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: memberData } = await supabase
      .from('org_members')
      .select('org_id')
      .single()

    const orgId = memberData?.org_id
    if (!orgId) throw new Error('No org found for user')

    const body = await req.json()

    const [profileRes, projectsRes] = await Promise.all([
      supabase.from('company_profiles').select('*').eq('org_id', orgId).single(),
      supabase.from('kb_projects').select('*').eq('org_id', orgId).order('year', { ascending: false }).limit(5),
    ])

    const profile = profileRes.data
    const projects = projectsRes.data ?? []

    const projectSummary = projects
      .map((p: any) => `${p.name} (${p.year}, ${p.architect_name ?? 'architect'}, ${p.project_type}, ${p.location})`)
      .join('; ')

    const systemPrompt = `You are the business development lead for a premium custom residential general contractor.
${profile?.story ? `About us: ${profile.story}` : ''}
${profile?.differentiators?.length ? `What makes us different: ${profile.differentiators.join('; ')}` : ''}
${projectSummary ? `Recent notable projects: ${projectSummary}` : ''}
Rules: No em dashes. Direct and confident tone. Sound like a real person. Reference specific capabilities and projects where relevant. Keep output concise and actionable.`

    let userPrompt = ''
    let architect: any = null

    if (body.architectId) {
      const { data } = await supabase.from('architects').select('*').eq('id', body.architectId).single()
      architect = data
    }

    switch (body.mode) {
      case 'outreach':
        userPrompt = `Write personalized outreach to architect ${architect?.name ?? 'this architect'} of ${architect?.firm ?? 'their firm'}.
Style: ${architect?.style ?? 'not specified'}. Projects together: ${architect?.projects_together ?? 0}. Stage: ${architect?.stage ?? 'Cold'}.
Notes: ${architect?.notes ?? 'none'}. Awards: ${architect?.awards ?? 'none'}.
Write 3-5 sentences. Reference their specific work. No sign-off needed.`
        break
      case 'brief':
        userPrompt = `Generate a pre-call intelligence brief for architect ${architect?.name ?? 'this architect'} of ${architect?.firm ?? 'their firm'}.
Style: ${architect?.style ?? 'not specified'}. Project types: ${architect?.project_types ?? 'not specified'}. Awards: ${architect?.awards ?? 'none'}.
History together: ${architect?.projects_together ?? 0} projects. Notes: ${architect?.notes ?? 'none'}.
Format: 1. WHO THEY ARE (2 sentences) 2. WHAT THEY VALUE IN A GC (3 bullets) 3. WHERE WE FIT (2 sentences) 4. RISK FLAGS (1-2 bullets) 5. OPENING MOVE (1 specific action)`
        break
      case 'email_series':
        userPrompt = `Write a 3-email nurture series for architect ${architect?.name ?? 'this architect'} of ${architect?.firm ?? 'their firm'}.
Type: ${body.emailSeriesType ?? 'general'}. Topic: ${body.emailSeriesTopic ?? 'relationship building'}.
Each email: subject line + 3-5 sentence body. Space them 5-7 days apart. Progressive depth.`
        break
      case 've_email':
        userPrompt = `Write an email to architect ${architect?.name ?? 'this architect'} sharing a value engineering case study.
Position this as collaborative problem-solving, not cost-cutting. 3-5 sentences.`
        break
      case 'showcase':
        userPrompt = `Write a project showcase summary suitable for sharing with prospective architect partners.
Highlight craftsmanship, collaboration, and outcomes. 4-6 sentences.`
        break
      case 'signal_response':
        userPrompt = `Write a brief, timely response to a signal/event related to architect ${architect?.name ?? 'this architect'}.
This should be conversational and reference the specific event. 2-3 sentences.`
        break
      default:
        userPrompt = body.prompt ?? 'Generate helpful content.'
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('')

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
