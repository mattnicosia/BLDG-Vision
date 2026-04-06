import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ENERGOV_BASE = 'https://rocklandcountyny-energovpub.tylerhost.net/apps/selfservice/api'
const TENANT_HEADERS = {
  'Content-Type': 'application/json',
  'tenantid': '1',
  'tenantname': 'RocklandCountyNYProd',
}

interface PermitSearchResult {
  CaseId: string
  CaseNumber: string
  CaseType: string
  CaseStatus: string
  ProjectName: string
  Address: {
    FullAddress: string
    City: string
    StateName: string
    PostalCode: string
  }
  Description: string
  ApplyDate: string
  IssueDate: string
  ModuleName: number | string
}

interface PermitContact {
  ContactTypeName: string
  GlobalEntityName: string
  FirstName: string
  LastName: string
  EmailTo: string
  Phone: string
  MainAddress: string
  ContactNumber: string
}

interface PermitDetail {
  permitId: string
  PermitNumber: string
  Description: string
  ValuationValue: number
  SquareFeet: number
  Addresses: Array<{
    AddressLine1: string
    AddressLine2: string
    City: string
    State: string
    PostalCode: string
    ParcelNumber: string
  }>
  Contacts: PermitContact[]
}

// Get the full search criteria template
async function getSearchCriteria(): Promise<any> {
  const res = await fetch(`${ENERGOV_BASE}/energov/search/criteria`, {
    headers: TENANT_HEADERS,
  })
  const data = await res.json()
  return data.Result
}

// Search permits with date range
async function searchPermits(criteria: any, keyword: string, pageNum: number, pageSize: number): Promise<{ results: PermitSearchResult[], total: number }> {
  criteria.Keyword = keyword
  criteria.ExactMatch = false
  criteria.SearchModule = 1 // All modules
  criteria.FilterModule = 1 // Filter to permits
  criteria.PermitCriteria.PageNumber = pageNum
  criteria.PermitCriteria.PageSize = pageSize

  const res = await fetch(`${ENERGOV_BASE}/energov/search/search`, {
    method: 'POST',
    headers: TENANT_HEADERS,
    body: JSON.stringify(criteria),
  })
  const data = await res.json()

  if (!data.Result) return { results: [], total: 0 }

  return {
    results: data.Result.EntityResults || [],
    total: data.Result.PermitsFound || 0,
  }
}

// Get permit detail with contacts
async function getPermitDetail(permitId: string): Promise<PermitDetail | null> {
  const res = await fetch(`${ENERGOV_BASE}/energov/permits/permit/${permitId}`, {
    headers: TENANT_HEADERS,
  })
  const data = await res.json()
  return data.Result || null
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

    if (!memberData?.org_id) throw new Error('No org found')
    const orgId = memberData.org_id

    const body = await req.json()
    const action = body.action as string

    if (action === 'search') {
      // Search for permits
      const criteria = await getSearchCriteria()
      const { results, total } = await searchPermits(
        criteria,
        body.keyword || 'building permit',
        body.page || 1,
        body.pageSize || 20
      )

      return new Response(
        JSON.stringify({ results, total }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync') {
      // Full sync: search permits, get details, extract contractors, save everything
      const criteria = await getSearchCriteria()
      const keyword = body.keyword || 'building permit'
      const maxPages = body.maxPages || 3
      const pageSize = 20

      const allPermits: any[] = []
      const allContractors: Map<string, any> = new Map()
      const permitContractorLinks: Array<{ permitId: string, contractorName: string, contactType: string }> = []

      // Search multiple pages
      for (let page = 1; page <= maxPages; page++) {
        const { results, total } = await searchPermits(criteria, keyword, page, pageSize)
        if (results.length === 0) break

        // Get details for each permit (limit to avoid rate limiting)
        for (const permit of results) {
          if (permit.ModuleName !== 'Permit' && permit.ModuleName !== 1) continue

          try {
            const detail = await getPermitDetail(permit.CaseId)
            if (!detail) continue

            const address = detail.Addresses?.[0]
            const fullAddress = address
              ? `${address.AddressLine1} ${address.AddressLine2}, ${address.City}, ${address.State} ${address.PostalCode}`.trim()
              : permit.Address?.FullAddress || ''

            // Save permit
            allPermits.push({
              org_id: orgId,
              permit_number: detail.PermitNumber || permit.CaseNumber,
              project_address: fullAddress,
              county: 'Rockland',
              town: address?.City || permit.Address?.City || '',
              permit_type: permit.CaseType,
              status: permit.CaseStatus,
              filed_date: permit.ApplyDate || null,
              estimated_value: detail.ValuationValue || null,
              scope_description: detail.Description || permit.Description || '',
              source_system: 'energov',
              source_url: `https://rocklandcountyny-energovpub.tylerhost.net/apps/selfservice#/permit/${permit.CaseId}`,
              our_project: false,
              opportunity: false,
            })

            // Extract contractors from contacts
            if (detail.Contacts) {
              for (const contact of detail.Contacts) {
                const typeName = contact.ContactTypeName?.toLowerCase() || ''
                if (typeName === 'contractor' || typeName === 'authorized representative') {
                  const name = contact.GlobalEntityName || `${contact.FirstName} ${contact.LastName}`.trim()
                  if (name && name !== 'null') {
                    allContractors.set(name.toLowerCase(), {
                      name,
                      location: contact.MainAddress || '',
                      phone: contact.Phone || '',
                      email: contact.EmailTo || '',
                    })
                    permitContractorLinks.push({
                      permitId: detail.PermitNumber || permit.CaseNumber,
                      contractorName: name,
                      contactType: contact.ContactTypeName || 'Unknown',
                    })
                  }
                }
              }
            }
          } catch (e) {
            // Skip individual permit errors
            console.error(`Error fetching permit ${permit.CaseId}:`, e)
          }
        }

        if (results.length < pageSize) break
      }

      // Bulk insert permits (upsert by permit_number)
      if (allPermits.length > 0) {
        for (let i = 0; i < allPermits.length; i += 50) {
          const batch = allPermits.slice(i, i + 50)
          await supabase
            .from('permits')
            .upsert(batch, { onConflict: 'org_id,permit_number,county' })
        }
      }

      // Auto-create competitors from contractors
      const contractorList = Array.from(allContractors.values())
      const newCompetitors: string[] = []
      if (contractorList.length > 0) {
        // Get existing competitors to avoid duplicates
        const { data: existing } = await supabase
          .from('competitors')
          .select('name')
          .eq('org_id', orgId)

        const existingNames = new Set((existing || []).map((c: any) => c.name.toLowerCase()))

        for (const contractor of contractorList) {
          if (!existingNames.has(contractor.name.toLowerCase())) {
            const { error } = await supabase.from('competitors').insert({
              org_id: orgId,
              name: contractor.name,
              location: contractor.location || undefined,
              displacement_score: 50,
              strengths: [],
              weaknesses: [],
              active_liens: false,
            })
            if (!error) newCompetitors.push(contractor.name)
          }
        }
      }

      return new Response(
        JSON.stringify({
          permitsImported: allPermits.length,
          contractorsFound: contractorList.length,
          newCompetitorsCreated: newCompetitors.length,
          newCompetitorNames: newCompetitors,
          links: permitContractorLinks.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'detail') {
      // Get single permit detail
      const detail = await getPermitDetail(body.permitId)
      return new Response(
        JSON.stringify({ detail }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error('EnerGov sync error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
