import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// Common false positive patterns to filter out
const JUNK_PATTERNS = [
  /domain\.com/i, /example\.com/i, /email\.com$/i, /yourname@/i,
  /\.png$/i, /\.jpg$/i, /\.gif$/i, /\.svg$/i, /sentry/i,
  /webpack/i, /wixpress/i, /googleapis/i, /@2x\./i, /@[0-9]+x\./i,
]

function isValidEmail(email: string): boolean {
  if (email.length > 60) return false
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(email)) return false
  }
  return true
}

async function scrapeEmailsFromUrl(url: string): Promise<string[]> {
  const emails = new Set<string>()

  // Try main page
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BLDGVision/1.0)' },
      redirect: 'follow',
    })
    if (res.ok) {
      const html = await res.text()
      const matches = html.match(EMAIL_REGEX) || []
      for (const m of matches) {
        const clean = m.toLowerCase().replace(/^%20/, '')
        if (isValidEmail(clean)) emails.add(clean)
      }
    }
  } catch {}

  // If no emails found, try common contact page URLs
  if (emails.size === 0) {
    const baseUrl = url.replace(/\/$/, '')
    const contactPaths = ['/contact', '/contact-us', '/about', '/about-us', '/connect']

    for (const path of contactPaths) {
      try {
        const res = await fetch(baseUrl + path, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BLDGVision/1.0)' },
          redirect: 'follow',
        })
        if (res.ok) {
          const html = await res.text()
          const matches = html.match(EMAIL_REGEX) || []
          for (const m of matches) {
            const clean = m.toLowerCase().replace(/^%20/, '')
            if (isValidEmail(clean)) emails.add(clean)
          }
        }
        if (emails.size > 0) break
      } catch {}
    }
  }

  return Array.from(emails)
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

    // Get architects with website but no email
    const { data: architects } = await supabase
      .from('architects')
      .select('id, name, website, email')
      .eq('org_id', orgId)
      .not('website', 'is', null)
      .is('email', null)
      .limit(20)

    if (!architects || architects.length === 0) {
      return new Response(
        JSON.stringify({ enriched: 0, message: 'No architects with websites missing emails' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let enriched = 0
    const results: Array<{ name: string; email: string }> = []

    for (const architect of architects) {
      const url = architect.website.startsWith('http')
        ? architect.website
        : `https://${architect.website}`

      const emails = await scrapeEmailsFromUrl(url)

      if (emails.length > 0) {
        // Pick the best email (prefer info@ or named emails over generic)
        const bestEmail = emails.find(e => !e.startsWith('info@') && !e.startsWith('contact@'))
          || emails.find(e => e.startsWith('info@'))
          || emails[0]

        await supabase
          .from('architects')
          .update({ email: bestEmail })
          .eq('id', architect.id)

        enriched++
        results.push({ name: architect.name, email: bestEmail })
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
