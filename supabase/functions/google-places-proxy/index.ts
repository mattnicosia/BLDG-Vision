import { createClient } from 'npm:@supabase/supabase-js'

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

    if (!memberData?.org_id) throw new Error('No org found for user')

    const { lat, lng, radius, keyword } = await req.json()
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) throw new Error('Google Places API key not configured')

    const radiusMeters = (radius ?? 50) * 1609.34

    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.websiteUri,places.location,places.userRatingCount',
      },
      body: JSON.stringify({
        includedTypes: ['establishment'],
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        textQuery: keyword || 'residential architect',
        maxResultCount: 20,
      }),
    })

    // If searchNearby with textQuery fails, try without it
    if (!response.ok) {
      const textResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.websiteUri,places.location,places.userRatingCount',
        },
        body: JSON.stringify({
          textQuery: `${keyword || 'residential architect'} near ${lat},${lng}`,
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
          maxResultCount: 20,
        }),
      })

      const textData = await textResponse.json()
      return new Response(
        JSON.stringify({ places: textData.places ?? [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    return new Response(
      JSON.stringify({ places: data.places ?? [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', places: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
