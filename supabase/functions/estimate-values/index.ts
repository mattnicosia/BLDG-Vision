import { createClient } from 'npm:@supabase/supabase-js'
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No auth header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    const { data: memberData } = await supabase.from('org_members').select('org_id').single()
    if (!memberData?.org_id) throw new Error('No org found')
    const orgId = memberData.org_id

    // Get board items without estimated values
    const { data: items } = await supabase
      .from('board_items')
      .select('*')
      .eq('org_id', orgId)
      .is('estimated_value', null)
      .not('project_description', 'is', null)
      .limit(10)

    // Get permits without estimated values (where value is 0 or null)
    const { data: permits } = await supabase
      .from('permits')
      .select('*')
      .eq('org_id', orgId)
      .or('estimated_value.is.null,estimated_value.eq.0')
      .not('scope_description', 'is', null)
      .limit(10)

    const allItems = [
      ...(items || []).map((i: any) => ({
        id: i.id,
        table: 'board_items',
        address: i.project_address || '',
        description: i.project_description || '',
        type: i.project_type || '',
        scope: i.estimated_scope || '',
        town: i.town_name || '',
      })),
      ...(permits || []).map((p: any) => ({
        id: p.id,
        table: 'permits',
        address: p.project_address || '',
        description: p.scope_description || '',
        type: p.permit_type || '',
        scope: '',
        town: p.town || '',
      })),
    ]

    if (allItems.length === 0) {
      return new Response(
        JSON.stringify({ estimated: 0, message: 'No items need value estimation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Batch items into a single AI call for efficiency
    const itemDescriptions = allItems.map((item, i) =>
      `${i + 1}. ${item.address} | ${item.type} | ${item.description} | ${item.scope} | ${item.town}`
    ).join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are a construction cost estimator in the Hudson Valley, NY area. Estimate the construction/renovation value for each project based on the description, type, and location. Consider that this is a premium residential market where custom homes cost $300-$600 per SF, renovations cost $150-$400 per SF, and land development costs vary by scope. Return ONLY a JSON array with one object per project: [{"index": 1, "estimated_value": 2500000, "reasoning": "4,200 SF custom home at ~$500/SF"}]. No markdown.`,
      messages: [{
        role: 'user',
        content: `Estimate construction values for these projects in Rockland County / Hudson Valley, NY:\n\n${itemDescriptions}\n\nReturn a JSON array. If you cannot estimate a project, use 0 for estimated_value and explain why in reasoning.`,
      }],
    })

    const text = message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    let estimates: Array<{ index: number; estimated_value: number; reasoning: string }> = []
    try {
      const cleaned = text.trim().replace(/^```json?\n?/i, '').replace(/\n?```$/i, '')
      estimates = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse AI estimates:', text.slice(0, 500))
    }

    // Apply estimates to database
    let estimated = 0
    for (const est of estimates) {
      const item = allItems[est.index - 1]
      if (!item || est.estimated_value <= 0) continue

      if (item.table === 'board_items') {
        await supabase
          .from('board_items')
          .update({ estimated_value: est.estimated_value, ai_value_analysis: est.reasoning })
          .eq('id', item.id)
      } else {
        await supabase
          .from('permits')
          .update({ estimated_value: est.estimated_value })
          .eq('id', item.id)
      }
      estimated++
    }

    return new Response(
      JSON.stringify({
        processed: allItems.length,
        estimated,
        estimates: estimates.map((e, i) => ({
          address: allItems[i]?.address,
          value: e.estimated_value,
          reasoning: e.reasoning,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Value estimation error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
