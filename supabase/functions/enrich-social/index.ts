import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Extract social media links from HTML
function extractSocialLinks(html: string): {
  instagram?: string
  linkedin?: string
  twitter?: string
  facebook?: string
  houzz?: string
} {
  const result: Record<string, string> = {}

  // Instagram
  const igMatch = html.match(/https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i)
  if (igMatch) result.instagram = igMatch[2].replace(/\/$/, '')

  // LinkedIn
  const liMatch = html.match(/https?:\/\/(www\.)?linkedin\.com\/(company|in)\/([a-zA-Z0-9_-]+)/i)
  if (liMatch) result.linkedin = `https://linkedin.com/${liMatch[2]}/${liMatch[3]}`

  // Twitter/X
  const twMatch = html.match(/https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)/i)
  if (twMatch && twMatch[3].toLowerCase() !== 'share' && twMatch[3].toLowerCase() !== 'intent') {
    result.twitter = twMatch[3]
  }

  // Facebook
  const fbMatch = html.match(/https?:\/\/(www\.)?facebook\.com\/([a-zA-Z0-9._-]+)/i)
  if (fbMatch && fbMatch[2].toLowerCase() !== 'sharer' && fbMatch[2].toLowerCase() !== 'share.php') {
    result.facebook = `https://facebook.com/${fbMatch[2]}`
  }

  // Houzz
  const hzMatch = html.match(/https?:\/\/(www\.)?houzz\.com\/pro\/([a-zA-Z0-9._-]+)/i)
  if (hzMatch) result.houzz = `https://houzz.com/pro/${hzMatch[2]}`

  return result
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

    // Get architects with website but no social links
    const { data: architects } = await supabase
      .from('architects')
      .select('id, name, website, instagram_handle, linkedin_url, houzz_url')
      .eq('org_id', orgId)
      .not('website', 'is', null)
      .limit(30)

    if (!architects || architects.length === 0) {
      return new Response(
        JSON.stringify({ enriched: 0, message: 'No architects with websites to enrich' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let enriched = 0
    const results: Array<{ name: string; found: string[] }> = []

    for (const architect of architects) {
      // Skip if already has social data
      if (architect.instagram_handle && architect.linkedin_url) continue

      try {
        const url = architect.website.startsWith('http')
          ? architect.website
          : `https://${architect.website}`

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BLDGVision/1.0)',
          },
          redirect: 'follow',
        })

        if (!res.ok) continue

        const html = await res.text()
        const social = extractSocialLinks(html)

        const updates: Record<string, string> = {}
        if (social.instagram && !architect.instagram_handle) updates.instagram_handle = social.instagram
        if (social.linkedin && !architect.linkedin_url) updates.linkedin_url = social.linkedin
        if (social.houzz && !architect.houzz_url) updates.houzz_url = social.houzz

        if (Object.keys(updates).length > 0) {
          await supabase.from('architects').update(updates).eq('id', architect.id)
          enriched++
          results.push({ name: architect.name, found: Object.keys(updates) })
        }
      } catch (e) {
        // Skip errors for individual websites
        console.error(`Error scraping ${architect.name}:`, e)
      }
    }

    return new Response(
      JSON.stringify({ enriched, total: architects.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
