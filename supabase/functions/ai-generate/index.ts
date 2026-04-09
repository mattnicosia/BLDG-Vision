import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TONE_GUIDES: Record<string, string> = {
  casual: 'Write like texting a friend you grab beers with. First names, contractions, short sentences. Maybe a joke or reference to something personal. No corporate language whatsoever.',
  friendly: 'Warm and personable but still professional. Use their first name. Be genuine. Reference shared experiences. Like writing to a colleague you respect and like.',
  professional: 'Polished but not stiff. Respectful tone, clear value proposition. Reference specific work and capabilities. Like a trusted advisor who knows their stuff.',
  formal: 'Highly professional. Full titles if appropriate. Structured, precise language. Lead with credentials and track record. Like a proposal cover letter.',
}

const CONTACT_TYPE_ANGLES: Record<string, string> = {
  architect: 'Focus on: collaboration quality, craftsmanship, VE capability, schedule reliability, shared project experience. You are a builder they want on their team.',
  attorney: 'Focus on: reliability for their clients, track record of smooth permitting, experience with local boards. Position as "the builder I recommend to my clients."',
  developer: 'Focus on: budget discipline, schedule performance, portfolio of similar projects, cost per SF data. Position as "the builder who protects your investment."',
  engineer: 'Focus on: technical competence, coordination ability, constructability feedback. Position as "the builder who makes your designs buildable."',
  owner: 'Focus on: trust, transparency, communication quality, references from similar projects. Position as "the builder who treats your home like their own."',
  realtor: 'Focus on: quality of finished product, resale value impact, client satisfaction. Position as "the builder I send my buyers to."',
}

const CADENCE_CONTEXT: Record<string, string> = {
  weekly: 'This is a very active relationship. Keep emails brief and specific to current work.',
  monthly: 'Regular touchpoint. Mix project updates with industry insights.',
  quarterly: 'Strategic touchpoint. Each email should have a clear reason - share a project, an insight, or an invitation.',
  biannual: 'Twice a year. Make each one count - portfolio highlights, significant news, or personal milestone.',
  annual: 'Once a year. This should feel like a thoughtful annual check-in, not a mass email. Reference something specific from the past year.',
  event_driven: 'Only reach out when there is a specific reason - a signal, a project, a referral opportunity. Never just to "stay in touch."',
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

    const { data: memberData } = await supabase.from('org_members').select('org_id').single()
    const orgId = memberData?.org_id
    if (!orgId) throw new Error('No org found for user')

    const body = await req.json()

    // Fetch company context
    const [profileRes, projectsRes] = await Promise.all([
      supabase.from('company_profiles').select('*').eq('org_id', orgId).single(),
      supabase.from('kb_projects').select('name, category, architect_name, project_type, location, budget_value, client_name').eq('org_id', orgId).order('year', { ascending: false }).limit(10),
    ])

    const profile = profileRes.data
    const allProjects = projectsRes.data ?? []

    // Fetch architect with relationship intelligence
    let architect: any = null
    let pastEmails: any[] = []
    let touchpoints: any[] = []
    let sharedProjects: any[] = []

    if (body.architectId) {
      const [archRes, emailRes, touchRes] = await Promise.all([
        supabase.from('architects').select('*').eq('id', body.architectId).single(),
        supabase.from('ai_drafts').select('subject, body, outcome, tone_used, reply_sentiment, reply_snippet, created_at').eq('architect_id', body.architectId).eq('outcome', 'sent').order('created_at', { ascending: false }).limit(5),
        supabase.from('architect_touchpoints').select('type, notes, contacted_at').eq('architect_id', body.architectId).order('contacted_at', { ascending: false }).limit(5),
      ])
      architect = archRes.data
      pastEmails = emailRes.data || []
      touchpoints = touchRes.data || []
      sharedProjects = allProjects.filter((p: any) =>
        p.architect_name && architect?.name && p.architect_name.toLowerCase().includes(architect.name.split(' ')[0].toLowerCase())
      )
    }

    // Build relationship-aware context
    const tone = architect?.tone || 'professional'
    const cadence = architect?.cadence || 'quarterly'
    const contactType = architect?.contact_type || 'architect'
    const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES.professional
    const angleGuide = CONTACT_TYPE_ANGLES[contactType] || CONTACT_TYPE_ANGLES.architect
    const cadenceGuide = CADENCE_CONTEXT[cadence] || CADENCE_CONTEXT.quarterly

    // Build project summary preferring relevant projects
    const residentialProjects = allProjects.filter((p: any) => p.category === 'residential' || p.category === 'hospitality')
    const relevantProjects = residentialProjects.length > 0 ? residentialProjects.slice(0, 5) : allProjects.slice(0, 5)
    const projectSummary = relevantProjects.map((p: any) => `${p.name} (${p.category}${p.location ? ', ' + p.location : ''}${p.budget_value ? ', $' + (p.budget_value/1000000).toFixed(1) + 'M' : ''})`).join('; ')

    // Past email context for voice learning
    const emailHistory = pastEmails.length > 0
      ? `\n\nPREVIOUS EMAILS SENT TO THIS PERSON (match this voice and style):\n${pastEmails.map(e => `Subject: ${e.subject || 'N/A'}\nBody: ${e.body?.slice(0, 200) || 'N/A'}\nTheir response: ${e.reply_sentiment || 'unknown'}${e.reply_snippet ? ' - "' + e.reply_snippet.slice(0, 100) + '"' : ''}`).join('\n---\n')}`
      : ''

    const touchpointHistory = touchpoints.length > 0
      ? `\n\nRECENT INTERACTIONS:\n${touchpoints.map(t => `${t.type} on ${new Date(t.contacted_at).toLocaleDateString()}: ${t.notes || 'no notes'}`).join('\n')}`
      : ''

    const sharedProjectContext = sharedProjects.length > 0
      ? `\n\nPROJECTS TOGETHER:\n${sharedProjects.map(p => `- ${p.name} (${p.location || 'location unknown'}${p.budget_value ? ', $' + (p.budget_value/1000000).toFixed(1) + 'M' : ''})`).join('\n')}`
      : ''

    const systemPrompt = `You are writing outreach for a premium general contractor.

COMPANY CONTEXT:
${profile?.story ? `About us: ${profile.story}` : 'Premium residential/commercial general contractor.'}
${profile?.differentiators?.length ? `Differentiators: ${profile.differentiators.join('; ')}` : ''}
${projectSummary ? `Notable projects: ${projectSummary}` : ''}

RELATIONSHIP INTELLIGENCE:
Tone setting: ${tone.toUpperCase()} - ${toneGuide}
Contact type: ${contactType.toUpperCase()} - ${angleGuide}
Cadence: ${cadence} - ${cadenceGuide}
${architect?.communication_notes ? `Communication notes: ${architect.communication_notes}` : ''}
${architect?.outreach_context ? `Context to reference: ${architect.outreach_context}` : ''}
${emailHistory}
${touchpointHistory}
${sharedProjectContext}

CRITICAL RULES:
- No em dashes ever
- Match the tone setting EXACTLY. If casual, write casual. If formal, write formal.
- If there are past emails, match that voice and style closely
- If they replied positively to a past email, double down on what worked
- If they never replied, try a different angle
- Reference specific shared history when it exists
- Never sound like a template or AI-generated content
- Keep it concise: 3-5 sentences for outreach, more for briefs`

    let userPrompt = ''

    switch (body.mode) {
      case 'outreach':
        userPrompt = `Write personalized outreach to ${architect?.name ?? 'this person'} of ${architect?.firm ?? 'their firm'}.
They are a ${contactType}. Relationship stage: ${architect?.stage ?? 'Cold'}. Pulse: ${architect?.pulse_score ?? 0}.
Projects together: ${architect?.projects_together ?? 0}.
${architect?.style ? `Their design style: ${architect.style}` : ''}
${architect?.awards ? `Awards: ${architect.awards}` : ''}
${architect?.notes ? `Notes: ${architect.notes}` : ''}
Write 3-5 sentences. No sign-off needed. Subject line first on its own line.`
        break
      case 'brief':
        userPrompt = `Generate a pre-call intelligence brief for ${architect?.name ?? 'this person'} (${contactType}) of ${architect?.firm ?? 'their firm'}.
Style: ${architect?.style ?? 'unknown'}. Types: ${architect?.project_types ?? 'unknown'}. Awards: ${architect?.awards ?? 'none'}.
History: ${architect?.projects_together ?? 0} projects. Notes: ${architect?.notes ?? 'none'}.
Format: 1. WHO THEY ARE (2 sentences) 2. RELATIONSHIP STATUS (tone: ${tone}, ${architect?.projects_together || 0} projects, last contact: ${architect?.last_contact_date || 'never'}) 3. WHAT THEY VALUE (3 bullets based on their type) 4. WHERE WE FIT (2 sentences) 5. RISK FLAGS (1-2 bullets) 6. OPENING MOVE (1 specific action matching our tone with them)`
        break
      case 'email_series':
        userPrompt = `Write a ${body.emailCount || 3}-email sequence for ${architect?.name ?? 'this person'} (${contactType}).
Tone: ${tone}. Cadence: ${cadence}. Type: ${body.emailSeriesType ?? 'nurture'}.
Topic: ${body.emailSeriesTopic ?? 'relationship building'}.
Each email: subject line + body. Space them appropriately for ${cadence} cadence.
Progressive depth - each email builds on the last.
If we have shared project history, reference it naturally.`
        break
      case 've_email':
        userPrompt = `Write an email to ${architect?.name ?? 'this person'} sharing a value engineering case study.
Tone: ${tone}. Position as collaborative problem-solving. 3-5 sentences. Subject line first.`
        break
      case 'showcase':
        userPrompt = `Write a project showcase email suitable for sharing with ${contactType}s.
Tone: ${tone}. Highlight craftsmanship, collaboration, and outcomes. 4-6 sentences. Subject line first.`
        break
      case 'signal_response':
        userPrompt = `Write a brief, timely response to a signal/event related to ${architect?.name ?? 'this person'}.
Tone: ${tone}. This should be conversational and reference the specific event. 2-3 sentences.
${body.signalContext ? `Signal: ${body.signalContext}` : ''}`
        break
      case 'analyze_response': {
        // Response analyzer mode
        const replyText = body.replyText || ''
        userPrompt = `Analyze this email reply from ${architect?.name ?? 'a contact'} (${contactType}):

"${replyText}"

Provide analysis as JSON:
{
  "sentiment": "positive" | "neutral" | "negative" | "interested" | "polite_decline",
  "interest_level": 0-100,
  "key_signals": ["what they're telling us between the lines"],
  "recommended_action": "specific next step",
  "reply_draft": "a suggested follow-up (matching ${tone} tone)",
  "relationship_notes": "anything we should remember about this person's communication style"
}
Return ONLY JSON.`
        break
      }
      default:
        userPrompt = body.prompt ?? 'Generate helpful content.'
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('')

    // For analyze_response mode, also update the draft record
    if (body.mode === 'analyze_response' && body.draftId) {
      try {
        const parsed = JSON.parse(text.trim().replace(/^```json?\n?/i, '').replace(/\n?```$/i, ''))
        await supabase.from('ai_drafts').update({
          reply_sentiment: parsed.sentiment,
          reply_snippet: body.replyText?.slice(0, 200),
          effectiveness_score: parsed.interest_level,
        }).eq('id', body.draftId)
      } catch {}
    }

    // Save tone used for future reference
    if (body.mode === 'outreach' && body.architectId) {
      // The draft will be saved by the client, but we note the tone
    }

    return new Response(
      JSON.stringify({ text, tone_used: tone, contact_type: contactType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
