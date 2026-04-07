import { createClient } from 'npm:@supabase/supabase-js'

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

    const { data: memberData } = await supabase.from('org_members').select('org_id').single()
    if (!memberData?.org_id) throw new Error('No org found')
    const orgId = memberData.org_id

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) throw new Error('Google Places API key not configured')

    const body = await req.json()
    const tables = body.tables || ['architects', 'discovered_places', 'discovered_contractors']
    let enriched = 0

    for (const table of tables) {
      // Get records with google_place_id but no website
      const { data: records } = await supabase
        .from(table)
        .select('id, google_place_id, name')
        .eq('org_id', orgId)
        .not('google_place_id', 'is', null)
        .is('website', null)
        .limit(50)

      if (!records || records.length === 0) continue

      for (const record of records) {
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${record.google_place_id}&fields=website,formatted_phone_number&key=${apiKey}`
          const res = await fetch(detailUrl)
          const data = await res.json()

          if (data.result) {
            const updates: Record<string, string> = {}
            if (data.result.website) updates.website = data.result.website
            if (data.result.formatted_phone_number) {
              if (table === 'architects') updates.phone = data.result.formatted_phone_number
              else updates.phone = data.result.formatted_phone_number
            }

            if (Object.keys(updates).length > 0) {
              await supabase.from(table).update(updates).eq('id', record.id)
              enriched++
            }
          }
        } catch (e) {
          console.error(`Error enriching ${record.name}:`, e)
        }
      }
    }

    return new Response(
      JSON.stringify({ enriched, tables }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
