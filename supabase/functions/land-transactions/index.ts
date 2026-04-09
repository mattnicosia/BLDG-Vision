import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SALES_WEB_URL = 'https://pad.tax.ny.gov/api/nimu-pad-sales-web/SALESWEBUC/fetchSalesWebData'

// NY Property class codes relevant to construction
const RELEVANT_CLASSES: Record<string, string> = {
  '210': 'One Family Year-Round Residence',
  '220': 'Two Family Year-Round Residence',
  '230': 'Three Family Year-Round Residence',
  '240': 'Rural Residence with Acreage',
  '250': 'Estate',
  '260': 'Seasonal Residence',
  '270': 'Mobile Home',
  '280': 'Multiple Residences',
  '281': 'Multiple Residences',
  '283': 'Multiple Residences',
  '311': 'Residential Vacant Land',
  '312': 'Residential Vacant Land (<10 ac)',
  '313': 'Vacant Land in Residential Zone',
  '314': 'Rural Vacant Land (<10 ac)',
  '322': 'Rural Vacant Land (>10 ac)',
  '330': 'Vacant Land (Commercial)',
  '340': 'Vacant Land (Industrial)',
  '400': 'Commercial',
  '411': 'Apartments',
  '421': 'Restaurant/Bar',
  '449': 'Other Retail',
  '484': 'One Story Small Structure',
}

// County SWIS codes for service counties
const COUNTY_CODES: Record<string, string> = {
  'Rockland': '390000',
  'Westchester': '600000',
  'Orange': '360000',
  'Dutchess': '130000',
  'Ulster': '560000',
  'Columbia': '110000',
  'Greene': '200000',
}

async function fetchSalesData(countyCode: string, offset: number, limit: number) {
  const res = await fetch(SALES_WEB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        counties: [countyCode],
        munis: [],
        schools: [],
        criterias: [],
        sortBy: [],
        offset,
        limit,
      },
    }),
  })
  const data = await res.json()
  return data?.app?.data?.oServiceResponse || null
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

    if (action === 'fetch') {
      const county = body.county || 'Rockland'
      const countyCode = COUNTY_CODES[county]
      if (!countyCode) throw new Error(`Unknown county: ${county}`)

      const minPrice = body.minPrice || 300000
      const monthsBack = body.monthsBack || 6
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack)

      // Data is sorted by address NOT date, so we must sample broadly
      const response = await fetchSalesData(countyCode, 0, 1)
      if (!response) throw new Error('Failed to fetch from Sales Web')
      const totalRecords = response.fullLength || 0

      // Sample 10 batches of 500 records spread across the dataset
      const allSales: any[] = []
      const batchSize = 500
      const numBatches = 10
      const step = Math.floor(totalRecords / numBatches)

      for (let i = 0; i < numBatches; i++) {
        const offset = i * step
        const resp = await fetchSalesData(countyCode, offset, batchSize)
        if (resp?.salesWebList) {
          for (const sale of resp.salesWebList) {
            const saleDate = sale.saleDt ? new Date(sale.saleDt) : null
            if (!saleDate || saleDate < cutoffDate) continue
            if (sale.salePriceAmt < minPrice) continue
            allSales.push(sale)
          }
        }
      }

      // Deduplicate by transaction ID
      const seen = new Set<string>()
      const unique = allSales.filter((s) => {
        const key = String(s.saleTranNmbr)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Upsert to land_transactions
      let inserted = 0
      let signalsCreated = 0

      for (const sale of unique) {
        const classDesc = RELEVANT_CLASSES[sale.prpClsAtSaleCd] || sale.prpClsAtSaleCd
        const address = `${sale.stNmbr} ${sale.stName}`.trim()
        const isVacantLand = ['311', '312', '313', '314', '322', '330', '340'].includes(sale.prpClsAtSaleCd)

        const row = {
          org_id: orgId,
          address,
          street_number: sale.stNmbr || '',
          street_name: sale.stName || '',
          zip: sale.zipCd || '',
          county,
          swis_code: sale.swisCd || '',
          buyer_name: `${sale.buyerFirstName} ${sale.buyerLastName}`.trim(),
          seller_name: `${sale.sellerFirstName} ${sale.sellerLastName}`.trim(),
          sale_price: sale.salePriceAmt,
          sale_date: sale.saleDt ? sale.saleDt.slice(0, 10) : null,
          property_class: sale.prpClsAtSaleCd,
          property_class_desc: classDesc,
          new_construction: sale.newCnstrInd === 1,
          book_page: sale.bookNmbr && sale.pageNmbr ? `${sale.bookNmbr}/${sale.pageNmbr}` : '',
          transaction_id: String(sale.saleTranNmbr),
        }

        const { error } = await supabase
          .from('land_transactions')
          .upsert(row, { onConflict: 'org_id,transaction_id' })

        if (!error) inserted++

        // Generate signal for high-value vacant land purchases (likely development)
        if (isVacantLand && sale.salePriceAmt >= 500000) {
          await supabase.from('signals').insert({
            org_id: orgId,
            type: 'opportunity',
            priority: 'high',
            headline: `Vacant land sold for $${(sale.salePriceAmt / 1000000).toFixed(1)}M in ${county}`,
            detail: `${address}. Buyer: ${row.buyer_name}. Property class: ${classDesc}. Likely development opportunity.`,
            source: 'NY State Sales Web',
          })
          signalsCreated++
        }

        // Signal for high-value residential transfers (renovation/rebuild opportunity)
        if (!isVacantLand && sale.salePriceAmt >= 1000000) {
          await supabase.from('signals').insert({
            org_id: orgId,
            type: 'opportunity',
            priority: 'medium',
            headline: `$${(sale.salePriceAmt / 1000000).toFixed(1)}M property transfer in ${county}`,
            detail: `${address}. Buyer: ${row.buyer_name}. ${classDesc}. High-value transfer may signal renovation or rebuild.`,
            source: 'NY State Sales Web',
          })
          signalsCreated++
        }
      }

      return new Response(
        JSON.stringify({
          totalInCounty: totalRecords,
          matchingFilters: unique.length,
          inserted,
          signalsCreated,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error('Land transaction error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
