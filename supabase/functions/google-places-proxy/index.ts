import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    if (!memberData?.org_id) throw new Error('No org found for user')

    const { lat, lng, radius, keyword } = await req.json()
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) throw new Error('Google Places API key not configured')

    const radiusMeters = Math.round((radius ?? 50) * 1609.34)
    const query = encodeURIComponent(keyword || 'residential architect')

    // Step 1: Text Search to get list of places
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${lat},${lng}&radius=${radiusMeters}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API: ${data.status} - ${data.error_message || ''}`)
    }

    const searchResults = data.results || []

    // Step 2: Fetch Place Details for each result to get website + phone
    const places = await Promise.all(
      searchResults.map(async (r: any) => {
        let website = undefined
        let phone = undefined

        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r.place_id}&fields=website,formatted_phone_number&key=${apiKey}`
          const detailRes = await fetch(detailUrl)
          const detailData = await detailRes.json()
          if (detailData.result) {
            website = detailData.result.website || undefined
            phone = detailData.result.formatted_phone_number || undefined
          }
        } catch {
          // Skip detail errors, still return the basic data
        }

        return {
          id: r.place_id,
          displayName: { text: r.name, languageCode: 'en' },
          formattedAddress: r.formatted_address,
          rating: r.rating,
          userRatingCount: r.user_ratings_total,
          websiteUri: website,
          phone,
          location: {
            latitude: r.geometry?.location?.lat,
            longitude: r.geometry?.location?.lng,
          },
        }
      })
    )

    return new Response(
      JSON.stringify({ places }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', places: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
