import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Database, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SyncResult {
  permitsImported: number
  contractorsFound: number
  newCompetitorsCreated: number
  newCompetitorNames: string[]
  links: number
}

export function PermitSyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  async function handleSync() {
    setSyncing(true)
    toast('Syncing permits from Rockland County EnerGov...')

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/energov-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          action: 'sync',
          keyword: 'building permit',
          maxPages: 3,
        }),
      })

      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        setLastResult(data)
        const parts = []
        if (data.permitsImported > 0) parts.push(`${data.permitsImported} permits`)
        if (data.newCompetitorsCreated > 0) parts.push(`${data.newCompetitorsCreated} new contractors`)
        if (data.links > 0) parts.push(`${data.links} contractor-permit links`)
        toast.success(`Sync complete: ${parts.join(', ')}`)
      }
    } catch (err) {
      toast.error('Sync failed. Try again.')
    }
    setSyncing(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        onClick={handleSync}
        disabled={syncing}
        className="gap-2"
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Database className="h-4 w-4" />
        )}
        {syncing ? 'Syncing Rockland County...' : 'Sync Rockland County permits'}
      </Button>
      {lastResult && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{lastResult.permitsImported} permits imported</span>
          <span>{lastResult.contractorsFound} contractors found</span>
          {lastResult.newCompetitorsCreated > 0 && (
            <span style={{ color: '#06B6D4' }}>
              +{lastResult.newCompetitorsCreated} new competitors auto-created
            </span>
          )}
        </div>
      )}
    </div>
  )
}
