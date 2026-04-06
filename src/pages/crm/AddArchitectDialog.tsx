import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { useBlockedPlaces } from '@/hooks/useBlockedPlaces'
import { Search, Loader2, Plus, Check, Star, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { getInitials, getAvatarColor } from '@/types'
import type { Architect, GooglePlaceResult } from '@/types'

interface Props {
  onClose: () => void
  onCreate: (
    architect: Omit<Architect, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'pulse_score'>
  ) => Promise<Architect | null>
  existingPlaceIds: Set<string>
}

export function AddArchitectDialog({ onClose, onCreate, existingPlaceIds }: Props) {
  const { org } = useOrg()
  const { isBlocked } = useBlockedPlaces()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GooglePlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setSearched(true)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const lat = org?.territory_lat ? Number(org.territory_lat) : 41.0
      const lng = org?.territory_lng ? Number(org.territory_lng) : -74.0

      const res = await fetch(`${supabaseUrl}/functions/v1/google-places-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          lat,
          lng,
          radius: 100,
          keyword: query,
        }),
      })

      const data = await res.json()
      const places = (data.places ?? []).filter(
        (p: GooglePlaceResult) => !isBlocked(p.id, p.displayName.text)
      )
      setResults(places)
    } catch {
      toast.error('Search failed')
      setResults([])
    }
    setSearching(false)
  }

  async function handleAdd(place: GooglePlaceResult) {
    setAdding(place.id)
    const result = await onCreate({
      name: place.displayName.text,
      firm: place.displayName.text,
      location: place.formattedAddress,
      website: place.websiteUri,
      lat: place.location.latitude,
      lng: place.location.longitude,
      google_place_id: place.id,
      source: 'google_places',
      is_in_radar: true,
      stage: 'Cold',
      tier: 'Prospect',
      projects_together: 0,
      referral_value: 0,
    })
    if (result) {
      setAdded((prev) => new Set([...prev, place.id]))
      toast.success(`${place.displayName.text} added`)
    }
    setAdding(null)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add architect</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, firm, or type..."
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
            />
          </div>
          <Button onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {searching && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          )}

          {!searching && searched && results.length === 0 && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No results found. Try a different search.</p>
            </div>
          )}

          {!searching && results.map((place) => {
            const isAdded = added.has(place.id) || existingPlaceIds.has(place.id)
            const colors = getAvatarColor(place.displayName.text)
            return (
              <div
                key={place.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
                style={{ borderWidth: '0.5px' }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {getInitials(place.displayName.text)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{place.displayName.text}</span>
                  <span className="truncate text-xs text-muted-foreground">{place.formattedAddress}</span>
                  <div className="flex items-center gap-2">
                    {place.rating && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-2.5 w-2.5" style={{ color: '#BA7517' }} />
                        {place.rating}
                      </span>
                    )}
                    {place.websiteUri && (
                      <a
                        href={place.websiteUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="h-2.5 w-2.5" /> Website
                      </a>
                    )}
                  </div>
                </div>
                {isAdded ? (
                  <Button variant="outline" size="sm" disabled className="gap-1 shrink-0">
                    <Check className="h-3 w-3" /> Added
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdd(place)}
                    disabled={adding === place.id}
                    className="gap-1 shrink-0"
                  >
                    {adding === place.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Add
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {!searched && !searching && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Search for an architect by name, firm, or specialty
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
