import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useArchitects } from '@/hooks/useArchitects'
import type { ArchitectCompetitorLink } from '@/types'

interface Props {
  competitorId: string
  existingArchitectIds: string[]
  onClose: () => void
  onLink: (link: Omit<ArchitectCompetitorLink, 'id' | 'org_id' | 'created_at'>) => Promise<void>
}

export function LinkArchitectDialog({
  competitorId,
  existingArchitectIds,
  onClose,
  onLink,
}: Props) {
  const { architects } = useArchitects()
  const [architectId, setArchitectId] = useState('')
  const [projectsCount, setProjectsCount] = useState('1')
  const [totalValue, setTotalValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const available = architects.filter(
    (a) => !existingArchitectIds.includes(a.id)
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!architectId) return
    setSaving(true)
    await onLink({
      architect_id: architectId,
      competitor_id: competitorId,
      projects_count: parseInt(projectsCount) || 1,
      total_value: totalValue ? parseInt(totalValue) : undefined,
      notes: notes || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Link architect</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Architect</label>
            <select
              value={architectId}
              onChange={(e) => setArchitectId(e.target.value)}
              className="rounded-md border border-border bg-[#1C1C1C] px-3 py-2 text-sm"
              required
            >
              <option value="">Select architect...</option>
              {available.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.firm ? `(${a.firm})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Projects together</label>
              <Input
                type="number"
                value={projectsCount}
                onChange={(e) => setProjectsCount(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Total value ($)</label>
              <Input
                type="number"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
              />
            </div>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!architectId || saving}>
              {saving ? 'Linking...' : 'Link'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
