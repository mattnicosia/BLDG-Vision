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
import type { Competitor } from '@/types'

interface Props {
  onClose: () => void
  onCreate: (
    competitor: Omit<Competitor, 'id' | 'org_id' | 'created_at' | 'updated_at'>
  ) => Promise<Competitor | null>
}

export function AddCompetitorDialog({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [displacementScore, setDisplacementScore] = useState('50')
  const [strengths, setStrengths] = useState('')
  const [weaknesses, setWeaknesses] = useState('')
  const [intel, setIntel] = useState('')
  const [opening, setOpening] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await onCreate({
      name,
      location: location || undefined,
      website: website || undefined,
      displacement_score: parseInt(displacementScore) || 50,
      strengths: strengths ? strengths.split(',').map((s) => s.trim()).filter(Boolean) : [],
      weaknesses: weaknesses ? weaknesses.split(',').map((s) => s.trim()).filter(Boolean) : [],
      intel: intel || undefined,
      opening: opening || undefined,
      active_liens: false,
    })
    setSaving(false)
    if (result) onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add competitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Competitor name"
            required
          />
          <div className="flex gap-3">
            <Input
              className="flex-1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
            />
            <Input
              className="flex-1"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Website"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">
              Displacement score (0-100)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={displacementScore}
              onChange={(e) => setDisplacementScore(e.target.value)}
            />
          </div>
          <Input
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="Strengths (comma-separated)"
          />
          <Input
            value={weaknesses}
            onChange={(e) => setWeaknesses(e.target.value)}
            placeholder="Weaknesses (comma-separated)"
          />
          <Textarea
            value={intel}
            onChange={(e) => setIntel(e.target.value)}
            placeholder="Intel / notes"
            rows={2}
          />
          <Textarea
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder="Your opening / competitive advantage"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || saving}>
              {saving ? 'Adding...' : 'Add competitor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
