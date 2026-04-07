import { useState } from 'react'
import { useOrg } from '@/hooks/useOrg'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { CountyPicker } from '@/components/territory/CountyPicker'
import { EmailSignatureSettings } from '@/components/settings/EmailSignatureSettings'
import { computeTerritoryCenter, type CountyData } from '@/data/counties'
import { Button } from '@/components/ui/button'
import { Pencil, Check, MapPin, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsIndex() {
  const { org, refetch } = useOrg()
  const { user } = useAuth()
  const [editingTerritory, setEditingTerritory] = useState(false)
  const [selectedCounties, setSelectedCounties] = useState<CountyData[]>(
    (org?.service_counties as CountyData[]) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichingSocial, setEnrichingSocial] = useState(false)

  async function saveTerritory() {
    if (!org) return
    setSaving(true)
    const center = computeTerritoryCenter(selectedCounties)
    const states = [...new Set(selectedCounties.map((c) => c.state))]
    const territoryLabel = selectedCounties
      .slice(0, 3)
      .map((c) => `${c.name} ${c.state}`)
      .join(', ') + (selectedCounties.length > 3 ? ` +${selectedCounties.length - 3} more` : '')

    const { error } = await supabase
      .from('organizations')
      .update({
        service_counties: selectedCounties,
        region: states.join(', '),
        territory_label: territoryLabel,
        territory_lat: center.lat,
        territory_lng: center.lng,
        territory_radius_miles: center.radiusMiles,
      })
      .eq('id', org.id)

    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Territory updated')
      setEditingTerritory(false)
      await refetch()
    }
  }

  const counties = (org?.service_counties as CountyData[]) ?? []

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Settings</h1>
      </div>

      <div className="flex flex-col gap-4">
        {/* Organization */}
        <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
          <h2 className="mb-3 text-base font-medium">Organization</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm">{org?.name ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm capitalize">{org?.plan ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget range</p>
              <p className="text-sm">
                ${((org?.budget_min ?? 0) / 1000000).toFixed(1)}M -
                ${((org?.budget_max ?? 0) / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>
        </div>

        {/* Service Territory */}
        <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-medium">Service territory</h2>
            {!editingTerritory ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCounties(counties)
                  setEditingTerritory(true)
                }}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTerritory(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveTerritory}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>

          {editingTerritory ? (
            <CountyPicker
              selected={selectedCounties}
              onChange={setSelectedCounties}
            />
          ) : counties.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {counties.map((c) => (
                <span
                  key={c.fips}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: '#E1F5EE', color: '#085041' }}
                >
                  <MapPin className="h-2.5 w-2.5" />
                  {c.name}, {c.state}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No counties set. Click Edit to select your service territory.
            </p>
          )}
        </div>

        {/* Email settings */}
        <EmailSignatureSettings />

        {/* Data enrichment */}
        <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
          <h2 className="mb-1 text-base font-medium">Data enrichment</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Fetch missing website and phone data from Google Places for all your architects, discovered places, and contractors.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={enriching}
              className="gap-2"
              onClick={async () => {
                setEnriching(true)
                try {
                  const session = await supabase.auth.getSession()
                  const token = session.data.session?.access_token
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
                  const res = await fetch(`${supabaseUrl}/functions/v1/enrich-places`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'apikey': anonKey,
                    },
                    body: JSON.stringify({ tables: ['architects', 'discovered_places', 'discovered_contractors'] }),
                  })
                  const data = await res.json()
                  if (data.error) {
                    toast.error(data.error)
                  } else {
                    toast.success(`Enriched ${data.enriched} records with website/phone data`)
                  }
                } catch {
                  toast.error('Enrichment failed')
                }
                setEnriching(false)
              }}
            >
              <RefreshCw className={`h-4 w-4 ${enriching ? 'animate-spin' : ''}`} />
              {enriching ? 'Fetching...' : 'Fetch websites + phones'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={enrichingSocial}
              className="gap-2"
              onClick={async () => {
                setEnrichingSocial(true)
                try {
                  const session = await supabase.auth.getSession()
                  const token = session.data.session?.access_token
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
                  const res = await fetch(`${supabaseUrl}/functions/v1/enrich-social`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                      'apikey': anonKey,
                    },
                    body: JSON.stringify({}),
                  })
                  const data = await res.json()
                  if (data.error) {
                    toast.error(data.error)
                  } else if (data.results?.length > 0) {
                    const found = data.results.map((r: any) => `${r.name}: ${r.found.join(', ')}`).join('; ')
                    toast.success(`Found social links for ${data.enriched} architects: ${found}`)
                  } else {
                    toast.success(`Scanned ${data.total} architects. No new social links found.`)
                  }
                } catch {
                  toast.error('Social enrichment failed')
                }
                setEnrichingSocial(false)
              }}
            >
              <RefreshCw className={`h-4 w-4 ${enrichingSocial ? 'animate-spin' : ''}`} />
              {enrichingSocial ? 'Scanning...' : 'Scan for social media'}
            </Button>
          </div>
        </div>

        {/* Account */}
        <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
          <h2 className="mb-3 text-base font-medium">Account</h2>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm">{user?.email ?? 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
