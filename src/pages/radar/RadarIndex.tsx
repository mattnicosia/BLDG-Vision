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
  const [radius, setRadius] = useState(org?.territory_radius_miles?.toString() ?? '50')

  const addedPlaceIds = new Set(architects.map((a) => a.google_place_id).filter(Boolean))

  async function handleSearch() {
    if (!org?.territory_lat || !org?.territory_lng) {
      toast.error('Set your territory coordinates in Settings first')
      return
    }
    setLoading(true)
    setSearched(true)

    const { data, error } = await supabase.functions.invoke('google-places-proxy', {
      body: {
        lat: org.territory_lat,
        lng: org.territory_lng,
        radius: parseInt(radius) || 50,
        keyword,
      },
    })

    if (error) {
      toast.error('Search failed. Check your Google Places API key.')
      setResults([])
    } else {
      setResults(data?.places ?? [])
      if ((data?.places ?? []).length === 0) {
        toast('No results found. Try a different keyword or larger radius.')
      }
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

  if (!org?.territory_lat || !org?.territory_lng) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-medium">Regional Radar</h1>
        </div>
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <Radar className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Set your territory coordinates in Settings to use Radar
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
