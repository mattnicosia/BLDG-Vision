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

// Scrape a single meeting page for PDF document links
async function findDocumentUrls(meetingUrl: string): Promise<Array<{ title: string; url: string }>> {
  const res = await fetch(meetingUrl, { headers: BROWSER_HEADERS })
  if (!res.ok) return []
  const html = await res.text()

  const docs: Array<{ title: string; url: string }> = []

  // Find PDF links in wp-content/uploads (filter out logos, potholes, etc.)
  const pdfRegex = /href="(https?:\/\/www\.orangetown\.com\/wp-content\/uploads\/[^"]+\.pdf)"/gi
  let match
  while ((match = pdfRegex.exec(html)) !== null) {
    const url = match[1]
    const filename = url.split('/').pop()?.replace('.pdf', '').replace(/-/g, ' ') ?? ''
    // Only include minutes, agendas, and project plans
    const lower = filename.toLowerCase()
    if (lower.includes('minute') || lower.includes('agenda') || lower.includes('plan') || lower.includes('site') || lower.includes('subd')) {
      docs.push({ title: filename, url })
    }
  }

  // Also look for document page links that contain PDFs
  const docPageRegex = /href="(https?:\/\/www\.orangetown\.com\/document\/[^"]+)"/gi
  while ((match = docPageRegex.exec(html)) !== null) {
    const pageUrl = match[1]
    // Fetch the document page to find the actual PDF
    try {
      const pageRes = await fetch(pageUrl)
      if (pageRes.ok) {
        const pageHtml = await pageRes.text()
        const innerPdfMatch = pageHtml.match(/href="(https?:\/\/www\.orangetown\.com\/wp-content\/uploads\/[^"]+\.pdf)"/i)
        if (innerPdfMatch) {
          const pdfUrl = innerPdfMatch[1]
          const title = pageUrl.split('/document/')[1]?.replace(/\/$/, '').replace(/-/g, ' ') ?? ''
          docs.push({ title, url: pdfUrl })
        }
      }
    } catch {}
  }

  return docs
}

// Extract text from a PDF URL (fetch first ~100KB for AI analysis)
async function fetchDocumentText(pdfUrl: string): Promise<string> {
  // For PDFs, we'll send the URL to Claude which can fetch and read it
  // For now, try to get HTML version or use the URL directly
  return `[PDF Document at: ${pdfUrl}]`
}

// Use Claude to extract structured data from board minutes text
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
  engineer_name: string
  project_type: string
  project_description: string
  decision: string
  conditions: string
  estimated_scope: string
}>> {
  try {
    // Use Claude to analyze the document URL
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `You are a construction intelligence analyst. You extract structured project data from municipal board meeting minutes and agendas. Always output valid JSON arrays. If you cannot access the document or find no projects, return an empty array [].`,
      messages: [{
        role: 'user',
        content: `Analyze this ${BOARD_TYPE_LABELS[boardType] || boardType} document from ${townName}, NY.

Document URL: ${pdfUrl}
Meeting date: ${meetingDate}

Extract EVERY project/application discussed. For each, provide:
- project_address: street address of the project
- applicant_name: who is applying
- architect_name: the architect (if mentioned)
- engineer_name: the engineer (if mentioned)
- project_type: one of "site_plan", "subdivision", "variance", "special_permit", "design_review", "amendment", "other"
- project_description: brief description of what's being built/changed
- decision: one of "approved", "denied", "tabled", "adjourned", "pending", "discussed"
- conditions: any conditions of approval
- estimated_scope: brief scope estimate (e.g., "4-lot subdivision", "2,400 SF addition", "new single family home")

Return ONLY a JSON array. No markdown, no explanation. Example:
[{"project_address":"123 Main St","applicant_name":"John Doe","architect_name":"Jane Smith Architects","engineer_name":"ABC Engineering","project_type":"site_plan","project_description":"New single family residence with attached garage","decision":"approved","conditions":"Subject to county health department approval","estimated_scope":"3,200 SF new construction"}]

If you cannot access the PDF or find no projects, return: []`
      }],
    })

    const text = message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    // Parse the JSON response
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

    const body = await req.json()
    const action = body.action as string

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
