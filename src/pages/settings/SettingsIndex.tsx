import { useState } from 'react'
import { usePersistedState } from '@/hooks/usePersistedState'
import { useOrg } from '@/hooks/useOrg'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { CountyPicker } from '@/components/territory/CountyPicker'
import { EmailSignatureSettings } from '@/components/settings/EmailSignatureSettings'
import { BoardSourcesManager } from '@/components/settings/BoardSourcesManager'
import { PipelineStagesManager } from '@/components/settings/PipelineStagesManager'
import { KBIndex } from '@/pages/kb/KBIndex'
import { computeTerritoryCenter, type CountyData } from '@/data/counties'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [enrichingEmails, setEnrichingEmails] = useState(false)
  const [editingOrg, setEditingOrg] = useState(false)
  const [orgName, setOrgName] = useState(org?.name ?? '')
  const [orgRegion, setOrgRegion] = useState(org?.region ?? '')
  const [orgBudgetMin, setOrgBudgetMin] = useState(org?.budget_min?.toString() ?? '')
  const [orgBudgetMax, setOrgBudgetMax] = useState(org?.budget_max?.toString() ?? '')
  const [savingOrg, setSavingOrg] = useState(false)

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

  const [settingsTab, setSettingsTab] = usePersistedState<'general' | 'playbook'>('settings-tab', 'general')

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <h1 className="text-xl font-medium">Settings</h1>
      </div>

      <div className="mb-4 flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setSettingsTab('general')}
          className="pb-2 text-sm font-medium"
          style={{
            color: settingsTab === 'general' ? '#06B6D4' : '#7C7C7C',
            borderBottom: settingsTab === 'general' ? '2px solid #06B6D4' : '2px solid transparent',
          }}
        >
          General
        </button>
        <button
          onClick={() => setSettingsTab('playbook')}
          className="pb-2 text-sm font-medium"
          style={{
            color: settingsTab === 'playbook' ? '#06B6D4' : '#7C7C7C',
            borderBottom: settingsTab === 'playbook' ? '2px solid #06B6D4' : '2px solid transparent',
          }}
        >
          Playbook
        </button>
      </div>

      {settingsTab === 'playbook' ? (
        <KBIndex />
      ) : (
      <div className="flex flex-col gap-4">
        {/* Organization */}
        <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-medium">Organization</h2>
            {!editingOrg ? (
              <Button variant="outline" size="sm" onClick={() => {
                setOrgName(org?.name ?? '')
                setOrgRegion(org?.region ?? '')
                setOrgBudgetMin(org?.budget_min?.toString() ?? '')
                setOrgBudgetMax(org?.budget_max?.toString() ?? '')
                setEditingOrg(true)
              }} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingOrg(false)}>Cancel</Button>
                <Button size="sm" disabled={savingOrg} className="gap-1.5" onClick={async () => {
                  if (!org) return
                  setSavingOrg(true)
                  const { error } = await supabase.from('organizations').update({
                    name: orgName || org.name,
                    region: orgRegion || undefined,
                    budget_min: parseInt(orgBudgetMin) || org.budget_min,
                    budget_max: parseInt(orgBudgetMax) || org.budget_max,
                  }).eq('id', org.id)
                  setSavingOrg(false)
                  if (error) toast.error(error.message)
                  else { toast.success('Organization updated'); setEditingOrg(false); refetch() }
                }}>
                  <Check className="h-3.5 w-3.5" /> {savingOrg ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
          {editingOrg ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Company name</label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Region</label>
                <Input value={orgRegion} onChange={(e) => setOrgRegion(e.target.value)} placeholder="e.g., NY, NJ" />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Min budget ($)</label>
                  <Input type="number" value={orgBudgetMin} onChange={(e) => setOrgBudgetMin(e.target.value)} />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Max budget ($)</label>
                  <Input type="number" value={orgBudgetMax} onChange={(e) => setOrgBudgetMax(e.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm capitalize">{org?.plan ?? 'N/A'}</p>
              </div>
            </div>
          ) : (
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
                <p className="text-xs text-muted-foreground">Region</p>
                <p className="text-sm">{org?.region ?? 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget range</p>
                <p className="text-sm">
                  ${((org?.budget_min ?? 0) / 1000000).toFixed(1)}M -
                  ${((org?.budget_max ?? 0) / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Stages */}
        <PipelineStagesManager />

        {/* Service Territory */}
        <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
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

        {/* Scan schedule */}
        <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
          <h2 className="mb-1 text-base font-medium">Automated scanning</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Automatically check board meetings, permits, and other data sources for new activity.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={org?.scan_schedule ?? '6am'}
              onChange={async (e) => {
                const schedule = e.target.value
                const { error } = await supabase
                  .from('organizations')
                  .update({ scan_schedule: schedule, scan_enabled: schedule !== 'disabled' })
                  .eq('id', org?.id)
                if (error) {
                  toast.error(error.message)
                } else {
                  toast.success(`Scan schedule updated to ${schedule === 'disabled' ? 'off' : schedule}`)
                  refetch()
                }
              }}
              className="rounded-md border border-border bg-[#1C1C1C] px-3 py-2 text-sm"
            >
              <option value="6am">Daily at 6:00 AM</option>
              <option value="7am">Daily at 7:00 AM</option>
              <option value="8am">Daily at 8:00 AM</option>
              <option value="9am">Daily at 9:00 AM</option>
              <option value="12pm">Daily at 12:00 PM</option>
              <option value="6pm">Daily at 6:00 PM</option>
              <option value="twice_daily">Twice daily (6 AM + 6 PM)</option>
              <option value="hourly">Every hour</option>
              <option value="disabled">Disabled</option>
            </select>
            <span className="text-xs text-muted-foreground">Eastern Time</span>
          </div>
        </div>

        {/* Board meeting sources */}
        <BoardSourcesManager />

        {/* Email settings */}
        <EmailSignatureSettings />

        {/* Procore integration */}
        <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
          <h2 className="mb-1 text-base font-medium">Procore</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Connect your Procore account to sync projects, architects, and contacts automatically.
          </p>
          {org?.procore_connected_at ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg p-2.5" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                <span className="text-[13px] font-medium" style={{ color: '#22C55E' }}>Connected</span>
                <span className="text-[11px]" style={{ color: '#7C7C7C' }}>
                  since {new Date(org.procore_connected_at).toLocaleDateString()}
                </span>
                {org.procore_last_sync_at && (
                  <span className="ml-auto text-[11px]" style={{ color: '#7C7C7C' }}>
                    Last sync: {new Date(org.procore_last_sync_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    toast('Syncing projects from Procore...')
                    try {
                      const session = await supabase.auth.getSession()
                      const token = session.data.session?.access_token
                      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
                      const res = await fetch(`${supabaseUrl}/functions/v1/procore-sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': anonKey },
                        body: JSON.stringify({ action: 'sync' }),
                      })
                      const data = await res.json()
                      if (data.error) throw new Error(data.error)
                      toast.success(`Synced ${data.projectsSynced} projects, found ${data.architectsFound} architects`)
                      refetch()
                    } catch (err: any) {
                      toast.error(err.message || 'Sync failed')
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4" /> Sync now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  style={{ color: '#EF4444' }}
                  onClick={async () => {
                    if (!confirm('Disconnect Procore? This will not delete synced data.')) return
                    try {
                      const session = await supabase.auth.getSession()
                      const token = session.data.session?.access_token
                      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
                      await fetch(`${supabaseUrl}/functions/v1/procore-connect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': anonKey },
                        body: JSON.stringify({ action: 'disconnect' }),
                      })
                      toast.success('Procore disconnected')
                      refetch()
                    } catch {
                      toast.error('Disconnect failed')
                    }
                  }}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              className="gap-2"
              onClick={async () => {
                try {
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
                  const res = await fetch(`${supabaseUrl}/functions/v1/procore-connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
                    body: JSON.stringify({ action: 'get_auth_url' }),
                  })
                  const data = await res.json()
                  if (data.url) {
                    window.location.href = data.url
                  } else {
                    toast.error('Failed to get authorization URL')
                  }
                } catch {
                  toast.error('Connection failed')
                }
              }}
              style={{ backgroundColor: '#F47E3E', color: '#ffffff', border: 'none' }}
            >
              Connect Procore
            </Button>
          )}
        </div>

        {/* Data enrichment */}
        <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
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
            <Button
              variant="outline"
              size="sm"
              disabled={enrichingEmails}
              className="gap-2"
              onClick={async () => {
                setEnrichingEmails(true)
                try {
                  const session = await supabase.auth.getSession()
                  const token = session.data.session?.access_token
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
                  const res = await fetch(`${supabaseUrl}/functions/v1/enrich-emails`, {
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
                    const found = data.results.map((r: any) => `${r.name}: ${r.email}`).join(', ')
                    toast.success(`Found emails for ${data.enriched} contacts: ${found}`)
                  } else {
                    toast.success(`Scanned ${data.total} websites. No new emails found.`)
                  }
                } catch {
                  toast.error('Email enrichment failed')
                }
                setEnrichingEmails(false)
              }}
            >
              <RefreshCw className={`h-4 w-4 ${enrichingEmails ? 'animate-spin' : ''}`} />
              {enrichingEmails ? 'Finding...' : 'Find email addresses'}
            </Button>
          </div>
        </div>

        {/* Account */}
        <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
          <h2 className="mb-3 text-base font-medium">Account</h2>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm">{user?.email ?? 'N/A'}</p>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
