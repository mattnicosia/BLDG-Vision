import { useState } from 'react'
import { useOrg } from '@/hooks/useOrg'
import { useArchitects } from '@/hooks/useArchitects'
import { supabase } from '@/lib/supabase'
import { RadarCard } from '@/components/radar/RadarCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Radar, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { GooglePlaceResult } from '@/types'

export function RadarIndex() {
  const { org } = useOrg()
  const { architects, createArchitect } = useArchitects()
  const [results, setResults] = useState<GooglePlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [keyword, setKeyword] = useState('residential architect')
  const [radius, setRadius] = useState('30')
  const counties = (org?.service_counties ?? []) as Array<{ name: string; state: string; lat: number; lng: number }>

  const addedPlaceIds = new Set(architects.map((a) => a.google_place_id).filter(Boolean))

  async function handleSearch() {
    if (counties.length === 0 && !org?.territory_lat) {
      toast.error('Set your service counties in Settings or Onboarding first')
      return
    }
    setLoading(true)
    setSearched(true)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Search from each county center and deduplicate
      const searchPoints = counties.length > 0
        ? counties.map((c) => ({ lat: c.lat, lng: c.lng }))
        : [{ lat: Number(org!.territory_lat), lng: Number(org!.territory_lng) }]

      // Limit to 5 searches to avoid rate limits, pick evenly spaced counties
      const step = Math.max(1, Math.floor(searchPoints.length / 5))
      const points = searchPoints.filter((_, i) => i % step === 0).slice(0, 5)

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
            radius: parseInt(radius) || 30,
            keyword,
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

      setResults(allPlaces)
      if (allPlaces.length === 0) {
        toast('No results found. Try a different keyword or larger radius.')
      }
    } catch (err) {
      toast.error('Search failed. Check your connection.')
      setResults([])
    }
    setLoading(false)
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
      toast.success(`${place.displayName.text} added to CRM`)
    }
  }

  if (counties.length === 0 && !org?.territory_lat) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-medium">Regional Radar</h1>
        </div>
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <Radar className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Set your service counties in Settings to use Radar
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Regional Radar</h1>
        <p className="text-sm text-muted-foreground">
          Discover architects in your service territory
        </p>
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

      {searched && (
        <p className="mb-3 text-sm text-muted-foreground">
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((place) => (
          <RadarCard
            key={place.id}
            place={place}
            onAdd={handleAdd}
            alreadyAdded={addedPlaceIds.has(place.id)}
          />
        ))}
        {searched && results.length === 0 && !loading && (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              No architects found. Try broadening your search.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
