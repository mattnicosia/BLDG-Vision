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
import type { Architect, ArchitectStage } from '@/types'
import { STAGE_STYLES } from '@/types'

interface Props {
  onClose: () => void
  onCreate: (
    architect: Omit<Architect, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'pulse_score'>
  ) => Promise<Architect | null>
}

export function AddArchitectDialog({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [firm, setFirm] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [stage, setStage] = useState<ArchitectStage>('Warm')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await onCreate({
      name,
      firm,
      email: email || undefined,
      phone: phone || undefined,
      location: location || undefined,
      website: website || undefined,
      stage,
      tier: 'Prospect',
      notes: notes || undefined,
      projects_together: 0,
      referral_value: 0,
      source: 'manual',
      is_in_radar: false,
    })
    setSaving(false)
    if (result) onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add architect</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Architect name"
            required
          />
          <Input
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            placeholder="Firm name"
          />
          <div className="flex gap-3">
            <Input
              className="flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />
            <Input
              className="flex-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
            />
          </div>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
          />
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">Stage</label>
            <div className="flex gap-2">
              {(Object.keys(STAGE_STYLES) as ArchitectStage[]).map((s) => {
                const style = STAGE_STYLES[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: stage === s ? style.bg : 'transparent',
                      color: stage === s ? style.text : '#71717a',
                      border: `1px solid ${stage === s ? style.border : '#e4e4e7'}`,
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || saving}>
              {saving ? 'Adding...' : 'Add architect'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
