import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ENERGOV_BASE = 'https://rocklandcountyny-energovpub.tylerhost.net/apps/selfservice/api'
const TENANT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'tenantid': '1',
  'tenantname': 'RocklandCountyNYProd',
}

async function getSearchCriteria(): Promise<any> {
  const res = await fetch(`${ENERGOV_BASE}/energov/search/criteria`, { headers: TENANT_HEADERS })
  const data = await res.json()
  return data.Result
}

async function searchPermits(criteria: any, keyword: string, pageNum: number, pageSize: number) {
  criteria.Keyword = keyword
  criteria.ExactMatch = false
  criteria.SearchModule = 1
  criteria.FilterModule = 1
  criteria.PageNumber = pageNum
  criteria.PageSize = pageSize
  for (const key of Object.keys(criteria)) {
    if (key.endsWith('Criteria') && criteria[key] && typeof criteria[key] === 'object' && 'PageSize' in criteria[key]) {
      criteria[key].PageNumber = key === 'PermitCriteria' ? pageNum : 1
      criteria[key].PageSize = key === 'PermitCriteria' ? pageSize : 1
    }
  }
  const res = await fetch(`${ENERGOV_BASE}/energov/search/search`, {
    method: 'POST', headers: TENANT_HEADERS, body: JSON.stringify(criteria),
  })
  const data = await res.json()
  if (!data.Result) return { results: [], total: 0 }
  return { results: data.Result.EntityResults || [], total: data.Result.PermitsFound || data.Result.TotalFound || 0 }
}

async function getPermitDetail(permitId: string) {
  const res = await fetch(`${ENERGOV_BASE}/energov/permits/permit/${permitId}`, { headers: TENANT_HEADERS })
  const data = await res.json()
  return data.Result || null
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

    const body = await req.json()
    const action = body.action as string

    // FETCH: Pull permits from EnerGov and return for preview. Nothing saved.
    if (action === 'fetch') {
      const criteria = await getSearchCriteria()
      const keyword = body.keyword || 'building permit'
      const maxPages = body.maxPages || 3
      const pageSize = 20
      const previews: any[] = []

      for (let page = 1; page <= maxPages; page++) {
        const { results } = await searchPermits(criteria, keyword, page, pageSize)
        if (results.length === 0) break

        for (const permit of results) {
          const mod = String(permit.ModuleName).toLowerCase()
          if (mod !== 'permit' && mod !== '1' && mod !== '2') continue

          try {
            const detail = await getPermitDetail(permit.CaseId)
            if (!detail) continue

            const addr = detail.Addresses?.[0]
            const fullAddr = addr
              ? `${addr.AddressLine1 || ''} ${addr.AddressLine2 || ''}, ${addr.City || ''}, ${addr.State || ''} ${addr.PostalCode || ''}`.replace(/\s+/g, ' ').trim()
              : permit.Address?.FullAddress || ''

            // Extract ALL contacts with their types
            const contacts = (detail.Contacts || []).map((c: any) => ({
              type: c.ContactTypeName || 'Unknown',
              company: c.GlobalEntityName || '',
              firstName: c.FirstName || '',
              lastName: c.LastName || '',
              email: c.EmailTo || '',
              phone: c.Phone || '',
              address: c.MainAddress || '',
            }))

            previews.push({
              caseId: permit.CaseId,
              permitNumber: detail.PermitNumber || permit.CaseNumber,
              permitType: permit.CaseType || '',
              status: permit.CaseStatus || '',
              applyDate: permit.ApplyDate || null,
              issueDate: permit.IssueDate || null,
              address: fullAddr,
              town: addr?.City || '',
              county: 'Rockland',
              parcel: addr?.ParcelNumber || '',
              value: detail.ValuationValue || 0,
              sqft: detail.SquareFeet || 0,
              description: detail.Description || permit.Description || '',
              contacts,
              sourceUrl: `https://rocklandcountyny-energovpub.tylerhost.net/apps/selfservice#/permit/${permit.CaseId}`,
            })
          } catch (e) {
            console.error('Permit detail error:', e)
          }
        }
        if (results.length < pageSize) break
      }

      return new Response(
        JSON.stringify({ previews, total: previews.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // IMPORT: Save selected permits + create competitors/architects as requested
    if (action === 'import') {
      const permits = body.permits || []
      const contractorsToTrack = body.contractorsToTrack || [] // [{name, location, phone, email}]
      const architectsToAdd = body.architectsToAdd || [] // [{name, firm, location, email, phone}]

      // Insert permits
      let permitsImported = 0
      if (permits.length > 0) {
        const rows = permits.map((p: any) => ({
          org_id: orgId,
          permit_number: p.permitNumber,
          project_address: p.address,
          county: p.county || 'Rockland',
          town: p.town || '',
          permit_type: p.permitType,
          status: p.status,
          filed_date: p.applyDate || null,
          estimated_value: p.value || null,
          scope_description: p.description || '',
          contractor_name: p.contractorName || null,
          architect_name: p.architectName || null,
          source_system: 'energov',
          source_url: p.sourceUrl || '',
          our_project: false,
          opportunity: !p.contractorName,
          raw_data: p,
        }))

        for (let i = 0; i < rows.length; i += 50) {
          const { data } = await supabase
            .from('permits')
            .upsert(rows.slice(i, i + 50), { onConflict: 'org_id,permit_number,county' })
            .select()
          if (data) permitsImported += data.length
        }
      }

      // Create competitors from selected contractors
      let competitorsCreated = 0
      if (contractorsToTrack.length > 0) {
        const { data: existing } = await supabase.from('competitors').select('name').eq('org_id', orgId)
        const existingNames = new Set((existing || []).map((c: any) => c.name.toLowerCase()))

        for (const contractor of contractorsToTrack) {
          if (!existingNames.has(contractor.name.toLowerCase())) {
            const { error } = await supabase.from('competitors').insert({
              org_id: orgId,
              name: contractor.name,
              location: contractor.address || contractor.location || undefined,
              displacement_score: 50,
              strengths: [],
              weaknesses: [],
              active_liens: false,
            })
            if (!error) competitorsCreated++
          }
        }
      }

      // Create architects from selected contacts
      let architectsCreated = 0
      if (architectsToAdd.length > 0) {
        const { data: existing } = await supabase.from('architects').select('name').eq('org_id', orgId)
        const existingNames = new Set((existing || []).map((a: any) => a.name.toLowerCase()))

        for (const arch of architectsToAdd) {
          if (!existingNames.has(arch.name.toLowerCase())) {
            const { error } = await supabase.from('architects').insert({
              org_id: orgId,
              name: arch.name,
              firm: arch.firm || arch.name,
              location: arch.location || undefined,
              email: arch.email || undefined,
              phone: arch.phone || undefined,
              stage: 'Cold',
              tier: 'Prospect',
              pulse_score: 30,
              projects_together: 0,
              referral_value: 0,
              source: 'manual',
              is_in_radar: false,
            })
            if (!error) architectsCreated++
          }
        }
      }

      return new Response(
        JSON.stringify({ permitsImported, competitorsCreated, architectsCreated }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SYNC: Auto-fetch and import permits (used by Scan All Sources)
    if (action === 'sync') {
      const criteria = await getSearchCriteria()
      const keywords = body.keywords || ['construction', 'building', 'alteration', 'new home', 'residential', 'commercial', 'demolition']
      const keyword = body.keyword || null
      const searchTerms = keyword ? [keyword] : keywords
      const maxPages = body.maxPages || 2
      const pageSize = 20
      const allPreviews: any[] = []
      const seenCaseIds = new Set<string>()

      for (const term of searchTerms) {
        for (let page = 1; page <= maxPages; page++) {
          const freshCriteria = await getSearchCriteria()
          const { results } = await searchPermits(freshCriteria, term, page, pageSize)
          if (results.length === 0) break

          for (const permit of results) {
            const mod = String(permit.ModuleName).toLowerCase()
            if (mod !== 'permit' && mod !== '1' && mod !== '2') continue
            if (seenCaseIds.has(permit.CaseId)) continue
            seenCaseIds.add(permit.CaseId)

            try {
              const detail = await getPermitDetail(permit.CaseId)
              if (!detail) continue

              const addr = detail.Addresses?.[0]
              const fullAddr = addr
                ? `${addr.AddressLine1 || ''} ${addr.AddressLine2 || ''}, ${addr.City || ''}, ${addr.State || ''} ${addr.PostalCode || ''}`.replace(/\s+/g, ' ').trim()
                : permit.Address?.FullAddress || ''

              const contacts = (detail.Contacts || []).map((c: any) => ({
                type: c.ContactTypeName || 'Unknown',
                company: c.GlobalEntityName || '',
                firstName: c.FirstName || '',
                lastName: c.LastName || '',
                email: c.EmailTo || '',
                phone: c.Phone || '',
                address: c.MainAddress || '',
              }))

              // Find contractor and architect from contacts
              const contractor = contacts.find((c: any) => c.type.toLowerCase().includes('contractor'))
              const architect = contacts.find((c: any) => c.type.toLowerCase().includes('architect'))

              allPreviews.push({
                permitNumber: detail.PermitNumber || permit.CaseNumber,
                permitType: permit.CaseType || '',
                status: permit.CaseStatus || '',
                applyDate: permit.ApplyDate || null,
                address: fullAddr,
                town: addr?.City || '',
                county: 'Rockland',
                value: detail.ValuationValue || 0,
                description: detail.Description || permit.Description || '',
                contractorName: contractor ? `${contractor.firstName} ${contractor.lastName}`.trim() || contractor.company : null,
                architectName: architect ? `${architect.firstName} ${architect.lastName}`.trim() || architect.company : null,
                sourceUrl: `https://rocklandcountyny-energovpub.tylerhost.net/apps/selfservice#/permit/${permit.CaseId}`,
                contacts,
              })
            } catch (e) {
              console.error('Permit detail error:', e)
            }
          }
          if (results.length < pageSize) break
        }
      }

      // Import permits that don't already exist
      let permitsImported = 0
      let newCompetitorsCreated = 0
      const { data: existingPermits } = await supabase.from('permits').select('permit_number').eq('org_id', orgId)
      const existingNumbers = new Set((existingPermits || []).map((p: any) => p.permit_number))

      const newPermits = allPreviews.filter(p => p.permitNumber && !existingNumbers.has(p.permitNumber))

      if (newPermits.length > 0) {
        const rows = newPermits.map((p: any) => ({
          org_id: orgId,
          permit_number: p.permitNumber,
          project_address: p.address,
          county: p.county || 'Rockland',
          town: p.town || '',
          permit_type: p.permitType,
          status: p.status,
          filed_date: p.applyDate || null,
          estimated_value: p.value || null,
          scope_description: p.description || '',
          contractor_name: p.contractorName || null,
          architect_name: p.architectName || null,
          source_system: 'energov',
          source_url: p.sourceUrl || '',
          our_project: false,
          opportunity: !p.contractorName,
        }))

        for (let i = 0; i < rows.length; i += 50) {
          const { data } = await supabase
            .from('permits')
            .upsert(rows.slice(i, i + 50), { onConflict: 'org_id,permit_number,county' })
            .select()
          if (data) permitsImported += data.length
        }
      }

      // Auto-discover contractors
      const { data: existingComps } = await supabase.from('discovered_contractors').select('name').eq('org_id', orgId)
      const existingCompNames = new Set((existingComps || []).map((c: any) => c.name.toLowerCase()))

      for (const preview of newPermits) {
        if (preview.contractorName && !existingCompNames.has(preview.contractorName.toLowerCase())) {
          const contractor = preview.contacts?.find((c: any) => c.type.toLowerCase().includes('contractor'))
          await supabase.from('discovered_contractors').insert({
            org_id: orgId,
            name: preview.contractorName,
            phone: contractor?.phone || null,
            email: contractor?.email || null,
            address: contractor?.address || null,
            source: 'energov',
          }).then(() => { newCompetitorsCreated++ })
          existingCompNames.add(preview.contractorName.toLowerCase())
        }
      }

      return new Response(
        JSON.stringify({
          searched: searchTerms.length,
          found: allPreviews.length,
          permitsImported,
          newCompetitorsCreated,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DETAIL: Get single permit
    if (action === 'detail') {
      const detail = await getPermitDetail(body.permitId)
      return new Response(
        JSON.stringify({ detail }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error('EnerGov error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
