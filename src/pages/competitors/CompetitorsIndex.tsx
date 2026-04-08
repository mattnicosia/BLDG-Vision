import { useState } from 'react'
import { useCompetitors } from '@/hooks/useCompetitors'
import { useDiscoveredContractors, type DiscoveredContractor } from '@/hooks/useDiscoveredContractors'
import { useOrg } from '@/hooks/useOrg'
import { supabase } from '@/lib/supabase'
import { CompetitorCard } from '@/components/competitors/CompetitorCard'
import { AddCompetitorDialog } from './AddCompetitorDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Swords, ScanLine, Star, Globe, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { GooglePlaceResult } from '@/types'

export function CompetitorsIndex() {
  const { org } = useOrg()
  const { competitors, loading, createCompetitor, deleteCompetitor } = useCompetitors()
  const { contractors: discovered, bulkUpsert, markAdded } = useDiscoveredContractors()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [tab, setTab] = useState<'tracked' | 'discovered'>('tracked')

  const counties = (org?.service_counties ?? []) as Array<{ name: string; state: string; lat: number; lng: number }>
  const addedPlaceIds = new Set(competitors.map((c) => c.google_place_id).filter(Boolean))

  const filtered = competitors.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.location?.toLowerCase().includes(q) ?? false)
    )
  })

  const filteredDiscovered = discovered.filter((c) => {
    if (c.added_to_competitors) return false
    if (addedPlaceIds.has(c.google_place_id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.address?.toLowerCase().includes(q) ?? false)
  })

  async function handleScan() {
    if (counties.length === 0) {
      toast.error('Set your service counties first')
      return
    }
    setScanning(true)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const keywords = ['general contractor', 'construction company', 'home builder']
      const allPlaces: GooglePlaceResult[] = []
      const seenIds = new Set<string>()

      for (const kw of keywords) {
        toast(`Scanning: "${kw}"...`)
        for (const county of counties) {
          const res = await fetch(`${supabaseUrl}/functions/v1/google-places-proxy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({
              lat: county.lat,
              lng: county.lng,
              radius: 30,
              keyword: kw,
            }),
          })
          const data = await res.json()
          if (data.places) {
            for (const place of data.places) {
              if (!seenIds.has(place.id)) {
                seenIds.add(place.id)
                allPlaces.push(place)
              }
            }
          }
        }
      }

      if (allPlaces.length > 0) {
        const rows = allPlaces.map((p) => ({
          google_place_id: p.id,
          name: p.displayName.text,
          address: p.formattedAddress,
          lat: p.location.latitude,
          lng: p.location.longitude,
          rating: p.rating,
          review_count: p.userRatingCount,
          website: p.websiteUri,
        }))
        const count = await bulkUpsert(rows)
        toast.success(`Scan complete. ${count} contractors discovered.`)
      } else {
        toast('No contractors found.')
      }
    } catch (err) {
      toast.error('Scan failed. Try again.')
    }
    setScanning(false)
  }

  async function handleAddToCompetitors(dc: DiscoveredContractor) {
    const result = await createCompetitor({
      name: dc.name,
      location: dc.address,
      lat: dc.lat,
      lng: dc.lng,
      website: dc.website,
      google_place_id: dc.google_place_id,
      google_rating: dc.rating,
      google_review_count: dc.review_count,
      displacement_score: 50,
      strengths: [],
      weaknesses: [],
      active_liens: false,
    })
    if (result) {
      await markAdded(dc.google_place_id, result.id)
      toast.success(`${dc.name} added to competitors`)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Competitors</h1>
          <p className="text-sm text-muted-foreground">
            {competitors.length} tracked
            {discovered.filter((d) => !d.added_to_competitors).length > 0 &&
              ` / ${discovered.filter((d) => !d.added_to_competitors).length} discovered`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleScan}
            disabled={scanning}
            className="gap-2"
          >
            <ScanLine className="h-4 w-4" />
            {scanning ? 'Scanning...' : 'Scan for contractors'}
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add manually
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setTab('tracked')}
          className="pb-2 text-sm font-medium transition-colors"
          style={{
            color: tab === 'tracked' ? '#0F6E56' : '#71717a',
            borderBottom: tab === 'tracked' ? '2px solid #0F6E56' : '2px solid transparent',
          }}
        >
          Tracked ({competitors.length})
        </button>
        <button
          onClick={() => setTab('discovered')}
          className="pb-2 text-sm font-medium transition-colors"
          style={{
            color: tab === 'discovered' ? '#0F6E56' : '#71717a',
            borderBottom: tab === 'discovered' ? '2px solid #0F6E56' : '2px solid transparent',
          }}
        >
          Discovered ({discovered.filter((d) => !d.added_to_competitors).length})
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or location..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Tracked tab */}
      {tab === 'tracked' && (
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <Swords className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {competitors.length === 0
                  ? 'No competitors tracked. Scan your territory or add manually.'
                  : 'No competitors match your search.'}
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <CompetitorCard
                key={c.id}
                competitor={c}
                onDelete={async (id) => {
                  await deleteCompetitor(id)
                  toast.success('Competitor removed')
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Discovered tab */}
      {tab === 'discovered' && (
        <div className="flex flex-col gap-2">
          {filteredDiscovered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <ScanLine className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {discovered.length === 0
                  ? 'No contractors discovered yet. Click "Scan for contractors" to search your territory.'
                  : 'All discovered contractors have been added.'}
              </p>
            </div>
          ) : (
            filteredDiscovered.map((dc) => (
              <div
                key={dc.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-[#1C1C1C] p-4"
                style={{ borderWidth: '0.5px' }}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-[#E8E8F0]">{dc.name}</span>
                  {dc.address && (
                    <span className="truncate text-xs text-muted-foreground">{dc.address}</span>
                  )}
                  <div className="flex items-center gap-3">
                    {dc.rating && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3" style={{ color: '#BA7517' }} />
                        {dc.rating}
                        {dc.review_count && ` (${dc.review_count})`}
                      </span>
                    )}
                    {dc.website && (
                      <a
                        href={dc.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Globe className="h-3 w-3" /> Website
                      </a>
                    )}
                  </div>
                </div>
                {addedPlaceIds.has(dc.google_place_id) ? (
                  <Button variant="outline" size="sm" disabled className="gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Added
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToCompetitors(dc)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Track
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showAdd && (
        <AddCompetitorDialog
          onClose={() => setShowAdd(false)}
          onCreate={createCompetitor}
        />
      )}
    </div>
  )
}
