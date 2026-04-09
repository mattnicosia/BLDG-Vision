import { createClient } from 'npm:@supabase/supabase-js'
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BOARD_TYPE_LABELS: Record<string, string> = {
  planning: 'Planning Board',
  zoning: 'Zoning Board of Appeals',
  architectural_review: 'Architectural Review Board',
  historic: 'Historic Areas Board',
  town_board: 'Town Board',
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
}

// Scrape a meeting list page for document links
async function scrapeMeetingPage(meetingPageUrl: string): Promise<Array<{ title: string; url: string; date: string }>> {
  const res = await fetch(meetingPageUrl, { headers: BROWSER_HEADERS })
  if (!res.ok) return []
  const html = await res.text()

  // Find links to individual meeting pages (full URLs or relative)
  const meetingLinks: Array<{ title: string; url: string; date: string }> = []
  const seen = new Set<string>()

  // Full URL pattern: href="https://www.orangetown.com/meeting/..."
  const fullUrlRegex = /href="(https?:\/\/www\.orangetown\.com\/meeting\/[^"]+)"/gi
  let match
  while ((match = fullUrlRegex.exec(html)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1])
      const title = match[1].split('/meeting/')[1]?.replace(/\/$/, '').replace(/-/g, ' ') ?? ''
      meetingLinks.push({ title, url: match[1], date: '' })
    }
  }

  // Relative URL pattern: href="/meeting/..."
  const relativeRegex = /href="(\/meeting\/[^"]+)"/gi
  while ((match = relativeRegex.exec(html)) !== null) {
    const fullUrl = `https://www.orangetown.com${match[1]}`
    if (!seen.has(fullUrl)) {
      seen.add(fullUrl)
      meetingLinks.push({ title: match[1], url: fullUrl, date: '' })
    }
  }

  return meetingLinks
}

// Junk PDF patterns to exclude
const JUNK_PDF_PATTERNS = [
  /pothole/i, /letterhead/i, /logo/i, /banner/i, /header/i,
  /newsletter/i, /flyer/i, /brochure/i, /form/i, /application-form/i,
  /recycling/i, /medication/i, /museum/i, /library/i, /email-update/i,
]

// Scrape a single meeting page for PDF document links
async function findDocumentUrls(meetingUrl: string): Promise<Array<{ title: string; url: string }>> {
  const res = await fetch(meetingUrl, { headers: BROWSER_HEADERS })
  if (!res.ok) return []
  const html = await res.text()

  const docs: Array<{ title: string; url: string }> = []
  const seen = new Set<string>()

  // Find PDF links in wp-content/uploads — only from recent years and board-related
  const pdfRegex = /href="(https?:\/\/www\.orangetown\.com\/wp-content\/uploads\/20(?:2[4-9]|[3-9]\d)\/[^"]+\.pdf)"/gi
  let match
  while ((match = pdfRegex.exec(html)) !== null) {
    const url = match[1]
    if (seen.has(url)) continue
    seen.add(url)

    const filename = url.split('/').pop()?.replace('.pdf', '').replace(/-/g, ' ') ?? ''
    const lower = filename.toLowerCase()

    // Skip known junk
    if (JUNK_PDF_PATTERNS.some(p => p.test(lower))) continue

    // Only include board-related documents
    if (lower.includes('minute') || lower.includes('agenda') ||
        lower.includes('site plan') || lower.includes('subd') ||
        lower.includes('zba') || lower.includes('acabor') ||
        lower.includes('planning') || lower.includes('zoning') ||
        lower.includes('arch plan')) {
      docs.push({ title: filename, url })
    }
  }

  return docs
}

// Fetch PDF and convert to base64 for Claude document input
async function fetchPdfAsBase64(pdfUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pdfUrl, { headers: BROWSER_HEADERS })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('pdf')) return null
    const buffer = await res.arrayBuffer()
    // Only process PDFs under 5MB
    if (buffer.byteLength > 5 * 1024 * 1024) return null
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  } catch (e) {
    console.error('PDF fetch error:', e)
    return null
  }
}

// Use Claude to extract structured data from board documents (PDF or text)
async function extractBoardItems(
  anthropic: Anthropic,
  documentText: string,
  pdfUrl: string,
  townName: string,
  boardType: string,
  meetingDate: string,
): Promise<Array<{
  project_address: string
  applicant_name: string
  architect_name: string
  attorney_name: string
  engineer_name: string
  project_type: string
  project_description: string
  decision: string
  conditions: string
  estimated_scope: string
}>> {
  try {
    const systemPrompt = `You are a construction intelligence analyst. You extract structured project data from municipal board meeting minutes, agendas, and architectural plans. Always output valid JSON arrays. If you find no projects, return an empty array [].`

    const userPrompt = `Analyze this ${BOARD_TYPE_LABELS[boardType] || boardType} document from ${townName}, NY.
Meeting date: ${meetingDate || 'unknown'}

Extract EVERY project/application discussed. For each, provide:
- project_address: street address of the project
- applicant_name: who is applying
- architect_name: the architect (if mentioned)
- attorney_name: the land use attorney representing the applicant (if mentioned)
- engineer_name: the engineer (if mentioned)
- project_type: one of "site_plan", "subdivision", "variance", "special_permit", "design_review", "amendment", "other"
- project_description: brief description of what's being built/changed
- decision: one of "approved", "denied", "tabled", "adjourned", "pending", "discussed"
- conditions: any conditions of approval
- estimated_scope: brief scope estimate (e.g., "4-lot subdivision", "2,400 SF addition", "new single family home")

For architectural plan PDFs, extract what you can see: the address from the title block, architect from the stamp, project type from the drawings.

Return ONLY a JSON array. No markdown. If you find no projects, return: []`

    // Try to fetch PDF and send as document to Claude
    const pdfBase64 = pdfUrl ? await fetchPdfAsBase64(pdfUrl) : null

    let messageContent: any[]
    if (pdfBase64) {
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64,
          },
        },
        { type: 'text', text: userPrompt },
      ]
    } else if (documentText && documentText.length > 50) {
      // Fall back to text content
      messageContent = [
        { type: 'text', text: `${userPrompt}\n\nDocument text:\n${documentText}` },
      ]
    } else {
      // No content available
      console.log(`Skipping ${pdfUrl}: no PDF or text content available`)
      return []
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    })

    const text = message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    const cleaned = text.trim().replace(/^```json?\n?/i, '').replace(/\n?```$/i, '')
    return JSON.parse(cleaned)
  } catch (e) {
    console.error('AI extraction error:', e)
    return []
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const action = body.action as string

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    // CRON mode: uses service role key, processes all orgs based on their schedule
    if (action === 'cron') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )

      // Check which orgs should run now based on their scan_schedule
      const currentHourUTC = new Date().getUTCHours()
      const scheduleHoursUTC: Record<string, number[]> = {
        '6am': [10],        // 6am ET = 10 UTC
        '7am': [11],
        '8am': [12],
        '9am': [13],
        '12pm': [16],
        '6pm': [22],
        'twice_daily': [10, 22],
        'hourly': Array.from({ length: 24 }, (_, i) => i),
      }

      // Get all orgs with their scan settings
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, scan_schedule, scan_enabled')
        .eq('scan_enabled', true)

      const eligibleOrgIds = new Set<string>()
      for (const org of orgs || []) {
        const allowedHours = scheduleHoursUTC[org.scan_schedule] || scheduleHoursUTC['6am']
        if (allowedHours.includes(currentHourUTC)) {
          eligibleOrgIds.add(org.id)
        }
      }

      if (eligibleOrgIds.size === 0) {
        return new Response(JSON.stringify({ message: 'No orgs scheduled for this hour' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Get enabled board sources for eligible orgs
      const { data: sources } = await supabase
        .from('board_sources')
        .select('id, org_id, town_name, board_type, meeting_page_url')
        .eq('enabled', true)
        .in('org_id', Array.from(eligibleOrgIds))

      if (!sources || sources.length === 0) {
        return new Response(JSON.stringify({ message: 'No enabled sources for scheduled orgs' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const year = new Date().getFullYear()
      const results: any[] = []

      for (const source of sources) {
        const orgId = source.org_id
        const meetingPageUrl = source.meeting_page_url.replace('{year}', String(year))
        const meetings = await scrapeMeetingPage(meetingPageUrl)
        const allDocs: Array<{ title: string; url: string }> = []
        for (const meeting of meetings.slice(0, 8)) {
          const docs = await findDocumentUrls(meeting.url)
          allDocs.push(...docs)
        }
        const { data: existing } = await supabase.from('board_documents').select('document_url').eq('org_id', orgId).eq('source_id', source.id)
        const existingUrls = new Set((existing || []).map((d: any) => d.document_url))
        const newDocs = allDocs.filter((d) => !existingUrls.has(d.url))
        let inserted = 0
        for (const doc of newDocs) {
          const dateMatch = doc.title.match(/(\w+ \d+,? \d{4})/i)
          const meetingDate = dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : null
          const { error } = await supabase.from('board_documents').insert({ org_id: orgId, source_id: source.id, town_name: source.town_name, board_type: source.board_type, title: doc.title, document_url: doc.url, meeting_date: meetingDate, parsed: false })
          if (!error) inserted++
        }
        await supabase.from('board_sources').update({ last_checked_at: new Date().toISOString() }).eq('id', source.id)
        results.push({ town: source.town_name, board: source.board_type, newDocs: inserted })
      }

      return new Response(JSON.stringify({ mode: 'cron', sources: results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // User-initiated actions require auth
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

    // SCAN: Check for new documents at a specific source
    if (action === 'scan') {
      const sourceId = body.sourceId
      const year = body.year || new Date().getFullYear()

      const { data: source } = await supabase
        .from('board_sources')
        .select('*')
        .eq('id', sourceId)
        .single()

      if (!source) throw new Error('Source not found')

      const meetingPageUrl = source.meeting_page_url.replace('{year}', String(year))
      const meetings = await scrapeMeetingPage(meetingPageUrl)

      // For each meeting page, find document links
      const allDocs: Array<{ title: string; url: string }> = []
      for (const meeting of meetings.slice(0, 10)) {
        const docs = await findDocumentUrls(meeting.url)
        allDocs.push(...docs)
      }

      // Check which docs we already have
      const { data: existing } = await supabase
        .from('board_documents')
        .select('document_url')
        .eq('org_id', orgId)
        .eq('source_id', sourceId)

      const existingUrls = new Set((existing || []).map((d: any) => d.document_url))
      const newDocs = allDocs.filter((d) => !existingUrls.has(d.url))

      // Insert new documents
      let inserted = 0
      for (const doc of newDocs) {
        // Try to extract date from title
        const dateMatch = doc.title.match(/(\w+ \d+,? \d{4})/i)
        const meetingDate = dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : null

        const { error } = await supabase.from('board_documents').insert({
          org_id: orgId,
          source_id: sourceId,
          town_name: source.town_name,
          board_type: source.board_type,
          title: doc.title,
          document_url: doc.url,
          meeting_date: meetingDate,
          parsed: false,
        })
        if (!error) inserted++
      }

      // Update source last_checked
      await supabase
        .from('board_sources')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', sourceId)

      return new Response(
        JSON.stringify({ scanned: meetings.length, documentsFound: allDocs.length, newDocuments: inserted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PARSE: AI-extract structured data from a document
    if (action === 'parse') {
      const documentId = body.documentId

      const { data: doc } = await supabase
        .from('board_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (!doc) throw new Error('Document not found')

      const items = await extractBoardItems(
        anthropic,
        doc.raw_text || '',
        doc.document_url || '',
        doc.town_name,
        doc.board_type,
        doc.meeting_date || '',
      )

      // Insert extracted items
      let itemsCreated = 0
      const architectsFound: string[] = []

      for (const item of items) {
        if (!item.project_address && !item.project_description) continue

        // Try to match architect to CRM
        let architectId = null
        if (item.architect_name) {
          architectsFound.push(item.architect_name)
          const { data: archMatch } = await supabase
            .from('architects')
            .select('id')
            .eq('org_id', orgId)
            .ilike('name', `%${item.architect_name}%`)
            .limit(1)
          if (archMatch?.[0]) architectId = archMatch[0].id
        }

        const { error } = await supabase.from('board_items').insert({
          org_id: orgId,
          document_id: documentId,
          town_name: doc.town_name,
          board_type: doc.board_type,
          meeting_date: doc.meeting_date,
          project_address: item.project_address || null,
          applicant_name: item.applicant_name || null,
          architect_name: item.architect_name || null,
          architect_id: architectId,
          attorney_name: item.attorney_name || null,
          engineer_name: item.engineer_name || null,
          project_type: item.project_type || null,
          project_description: item.project_description || null,
          decision: item.decision || null,
          conditions: item.conditions || null,
          estimated_scope: item.estimated_scope || null,
        })
        if (!error) itemsCreated++
      }

      // Mark document as parsed
      await supabase
        .from('board_documents')
        .update({ parsed: true })
        .eq('id', documentId)

      // Auto-generate signals for high-value items
      let signalsCreated = 0
      for (const item of items) {
        if (!item.project_address && !item.project_description) continue
        if (item.decision === 'approved' || item.project_type === 'site_plan' || item.project_type === 'subdivision') {
          const headline = `${BOARD_TYPE_LABELS[doc.board_type] || doc.board_type}: ${item.project_type === 'site_plan' ? 'Site plan' : item.project_type === 'subdivision' ? 'Subdivision' : item.project_type === 'variance' ? 'Variance' : item.project_type === 'design_review' ? 'Design review' : 'Application'} ${item.decision || 'discussed'} in ${doc.town_name}`

          await supabase.from('signals').insert({
            org_id: orgId,
            type: 'planning_board',
            priority: item.project_type === 'subdivision' || item.project_type === 'site_plan' ? 'high' : 'medium',
            headline,
            detail: `${item.project_address || 'Address pending'}. ${item.project_description || ''} ${item.architect_name ? `Architect: ${item.architect_name}` : ''} ${item.estimated_scope || ''}`.trim(),
            source: `${doc.town_name} ${BOARD_TYPE_LABELS[doc.board_type] || doc.board_type}`,
            source_url: doc.document_url,
          })
          signalsCreated++
        }
      }

      return new Response(
        JSON.stringify({
          itemsExtracted: items.length,
          itemsCreated,
          signalsCreated,
          architectsFound,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SCAN_ALL: Scan all enabled sources for an org
    if (action === 'scan_all') {
      const { data: sources } = await supabase
        .from('board_sources')
        .select('*')
        .eq('org_id', orgId)
        .eq('enabled', true)

      if (!sources || sources.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No board sources configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const year = new Date().getFullYear()
      const results: Array<{ town: string; board: string; newDocs: number }> = []

      for (const source of sources) {
        const meetingPageUrl = source.meeting_page_url.replace('{year}', String(year))
        const meetings = await scrapeMeetingPage(meetingPageUrl)
        const allDocs: Array<{ title: string; url: string }> = []

        for (const meeting of meetings.slice(0, 5)) {
          const docs = await findDocumentUrls(meeting.url)
          allDocs.push(...docs)
        }

        const { data: existing } = await supabase
          .from('board_documents')
          .select('document_url')
          .eq('org_id', orgId)
          .eq('source_id', source.id)

        const existingUrls = new Set((existing || []).map((d: any) => d.document_url))
        const newDocs = allDocs.filter((d) => !existingUrls.has(d.url))

        let inserted = 0
        for (const doc of newDocs) {
          const dateMatch = doc.title.match(/(\w+ \d+,? \d{4})/i)
          const meetingDate = dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : null

          const { error } = await supabase.from('board_documents').insert({
            org_id: orgId,
            source_id: source.id,
            town_name: source.town_name,
            board_type: source.board_type,
            title: doc.title,
            document_url: doc.url,
            meeting_date: meetingDate,
            parsed: false,
          })
          if (!error) inserted++
        }

        await supabase.from('board_sources').update({ last_checked_at: new Date().toISOString() }).eq('id', source.id)
        results.push({ town: source.town_name, board: source.board_type, newDocs: inserted })
      }

      return new Response(
        JSON.stringify({ sources: results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PARSE_UNPARSED: Parse all unparsed documents
    if (action === 'parse_unparsed') {
      const { data: unparsed } = await supabase
        .from('board_documents')
        .select('*')
        .eq('org_id', orgId)
        .eq('parsed', false)
        .order('meeting_date', { ascending: false })
        .limit(5)

      if (!unparsed || unparsed.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No unparsed documents' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let totalItems = 0
      let totalSignals = 0

      for (const doc of unparsed) {
        const items = await extractBoardItems(
          anthropic,
          doc.raw_text || '',
          doc.document_url || '',
          doc.town_name,
          doc.board_type,
          doc.meeting_date || '',
        )

        for (const item of items) {
          if (!item.project_address && !item.project_description) continue

          let architectId = null
          if (item.architect_name) {
            const { data: archMatch } = await supabase
              .from('architects')
              .select('id')
              .eq('org_id', orgId)
              .ilike('name', `%${item.architect_name}%`)
              .limit(1)
            if (archMatch?.[0]) architectId = archMatch[0].id
          }

          await supabase.from('board_items').insert({
            org_id: orgId,
            document_id: doc.id,
            town_name: doc.town_name,
            board_type: doc.board_type,
            meeting_date: doc.meeting_date,
            project_address: item.project_address || null,
            applicant_name: item.applicant_name || null,
            architect_name: item.architect_name || null,
            architect_id: architectId,
            engineer_name: item.engineer_name || null,
            project_type: item.project_type || null,
            project_description: item.project_description || null,
            decision: item.decision || null,
            conditions: item.conditions || null,
            estimated_scope: item.estimated_scope || null,
          })
          totalItems++

          if (item.decision === 'approved' || item.project_type === 'site_plan' || item.project_type === 'subdivision') {
            const headline = `${item.project_type || 'Application'} ${item.decision || 'discussed'} in ${doc.town_name}`
            await supabase.from('signals').insert({
              org_id: orgId,
              type: 'planning_board',
              priority: item.project_type === 'subdivision' || item.project_type === 'site_plan' ? 'high' : 'medium',
              headline,
              detail: `${item.project_address || ''} ${item.project_description || ''} ${item.architect_name ? `Architect: ${item.architect_name}` : ''}`.trim(),
              source: `${doc.town_name} ${BOARD_TYPE_LABELS[doc.board_type] || doc.board_type}`,
              source_url: doc.document_url,
            })
            totalSignals++
          }
        }

        await supabase.from('board_documents').update({ parsed: true }).eq('id', doc.id)
      }

      return new Response(
        JSON.stringify({ documentsParsed: unparsed.length, itemsExtracted: totalItems, signalsGenerated: totalSignals }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error('Board monitor error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
