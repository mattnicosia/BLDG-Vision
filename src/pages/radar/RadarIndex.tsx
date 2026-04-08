import { useState } from 'react'
import { useOrg } from '@/hooks/useOrg'
import { useArchitects } from '@/hooks/useArchitects'
import { useDiscoveredPlaces } from '@/hooks/useDiscoveredPlaces'
import { useBlockedPlaces } from '@/hooks/useBlockedPlaces'
import { supabase } from '@/lib/supabase'
import { RadarCard } from '@/components/radar/RadarCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Radar, Search, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import type { GooglePlaceResult } from '@/types'

export function RadarIndex() {
  const { org } = useOrg()
  const { architects, createArchitect } = useArchitects()
  const { places: discoveredPlaces, bulkUpsert, markAddedToCRM } = useDiscoveredPlaces()
  const { isBlocked } = useBlockedPlaces()
  const [freshResults, setFreshResults] = useState<GooglePlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [searched, setSearched] = useState(false)
  const [keyword, setKeyword] = useState('residential architect')
  const [radius, setRadius] = useState('30')
  const counties = (org?.service_counties ?? []) as Array<{ name: string; state: string; lat: number; lng: number }>

  const addedPlaceIds = new Set(architects.map((a) => a.google_place_id).filter(Boolean))

  // Show fresh search results if searching, otherwise show persisted discovered places
  const displayResults: GooglePlaceResult[] = searched ? freshResults : discoveredPlaces.map((dp: any) => ({
    id: dp.google_place_id,
    displayName: { text: dp.name, languageCode: 'en' },
    formattedAddress: dp.address || '',
    rating: dp.rating,
    userRatingCount: dp.review_count,
    websiteUri: dp.website,
    phone: dp.phone,
    location: { latitude: dp.lat || 0, longitude: dp.lng || 0 },
  }))

  async function searchPlaces(
    points: Array<{ lat: number; lng: number }>,
    searchKeyword: string,
    searchRadius: string
  ): Promise<GooglePlaceResult[]> {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const allPlaces: GooglePlaceResult[] = []
    const seenIds = new Set<string>()

    for (const point of points) {
      const res = await fetch(`${supabaseUrl}/functions/v1/google-places-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          lat: point.lat,
          lng: point.lng,
          radius: parseInt(searchRadius) || 30,
          keyword: searchKeyword,
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
    return allPlaces
  }

  function getSearchPoints(maxPoints: number) {
    const searchPoints = counties.length > 0
      ? counties.map((c) => ({ lat: c.lat, lng: c.lng }))
      : [{ lat: Number(org!.territory_lat), lng: Number(org!.territory_lng) }]
    const step = Math.max(1, Math.floor(searchPoints.length / maxPoints))
    return searchPoints.filter((_, i) => i % step === 0).slice(0, maxPoints)
  }

  async function handleSearch() {
    if (counties.length === 0 && !org?.territory_lat) {
      toast.error('Set your service counties in Settings or Onboarding first')
      return
    }
    setLoading(true)
    setSearched(true)

    try {
      const points = getSearchPoints(5)
      const allPlaces = await searchPlaces(points, keyword, radius)
      setFreshResults(allPlaces)

      // Persist to discovered_places
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
        await bulkUpsert(rows)
      }

      if (allPlaces.length === 0) {
        toast('No results found. Try a different keyword or larger radius.')
      }
    } catch (err) {
      toast.error('Search failed. Check your connection.')
      setFreshResults([])
    }
    setLoading(false)
  }

  async function handleScanTerritory() {
    if (counties.length === 0) {
      toast.error('Set your service counties first')
      return
    }
    setScanning(true)

    try {
      // Search every county with multiple keywords
      const keywords = ['residential architect', 'architect', 'architectural firm']
      const allPlaces: GooglePlaceResult[] = []
      const seenIds = new Set<string>()

      for (const kw of keywords) {
        toast(`Scanning: "${kw}"...`)
        const points = counties.map((c) => ({ lat: c.lat, lng: c.lng }))
        const results = await searchPlaces(points, kw, '30')
        for (const place of results) {
          if (!seenIds.has(place.id)) {
            seenIds.add(place.id)
            allPlaces.push(place)
          }
        }
      }

      // Persist all to discovered_places
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
        toast.success(`Territory scan complete. ${count} contacts discovered.`)
      } else {
        toast('No contacts found in your territory.')
      }

      setFreshResults(allPlaces)
      setSearched(true)
    } catch (err) {
      toast.error('Scan failed. Try again.')
    }
    setScanning(false)
  }

  async function handleAdd(place: GooglePlaceResult) {
    const result = await createArchitect({
      name: place.displayName.text,
      firm: place.displayName.text,
      location: place.formattedAddress,
      website: place.websiteUri,
      lat: place.location.latitude,
      lng: place.location.longitude,
      google_place_id: place.id,
      source: 'radar',
      is_in_radar: true,
      stage: 'Cold',
      tier: 'Prospect',
      projects_together: 0,
      referral_value: 0,
    })
    if (result) {
      await markAddedToCRM(place.id, result.id)
      toast.success(`${place.displayName.text} added to CRM`)
    }
  }

  if (counties.length === 0 && !org?.territory_lat) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-medium">Discover</h1>
        </div>
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <Radar className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Set your service counties in Settings to use Discover
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Discover</h1>
          <p className="text-sm text-muted-foreground">
            {discoveredPlaces.length > 0
              ? `${discoveredPlaces.length} contacts discovered in your territory`
              : 'Discover architects, attorneys, and other contacts in your service territory'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleScanTerritory}
          disabled={scanning}
          className="gap-2"
        >
          <ScanLine className="h-4 w-4" />
          {scanning ? 'Scanning...' : 'Scan territory'}
        </Button>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Search keyword</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="residential architect"
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        <div className="flex w-28 flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Radius (mi)</label>
          <Input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} className="gap-1.5">
          <Radar className="h-4 w-4" />
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Quick search pills for common contact types */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[
          'residential architect',
          'land use attorney',
          'zoning attorney',
          'real estate developer',
          'civil engineer',
          'landscape architect',
          'interior designer',
          'general contractor',
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => { setKeyword(suggestion); setSearched(false) }}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: keyword === suggestion ? '#0F6E56' : 'transparent',
              color: keyword === suggestion ? '#ffffff' : '#71717a',
              border: `1px solid ${keyword === suggestion ? '#0F6E56' : '#e4e4e7'}`,
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {searched && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {displayResults.length} result{displayResults.length !== 1 ? 's' : ''} found for "{keyword}"
          </p>
          <button
            onClick={() => { setSearched(false); setFreshResults([]) }}
            className="text-xs text-primary hover:underline"
          >
            Show all discovered
          </button>
        </div>
      )}

      {!searched && displayResults.length > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          {displayResults.length} previously discovered contacts
        </p>
      )}

      <div className="flex flex-col gap-2">
        {displayResults.filter((place) => !isBlocked(place.id, place.displayName.text)).map((place) => (
          <RadarCard
            key={place.id}
            place={place}
            onAdd={handleAdd}
            alreadyAdded={addedPlaceIds.has(place.id)}
          />
        ))}
        {displayResults.length === 0 && !loading && (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              {searched ? 'No contacts found. Try a different keyword.' : 'Search or scan your territory to discover contacts.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
