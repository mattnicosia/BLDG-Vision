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
import type { Signal, SignalType } from '@/types'

const SIGNAL_TYPES: { value: SignalType; label: string }[] = [
  { value: 'new_permit', label: 'New Permit' },
  { value: 'new_post', label: 'Social Post' },
  { value: 'new_review', label: 'Review' },
  { value: 'award', label: 'Award' },
  { value: 'publication', label: 'Publication' },
  { value: 'website_update', label: 'Website Update' },
  { value: 'job_posting', label: 'Job Posting' },
  { value: 'lien_filed', label: 'Lien Filed' },
  { value: 'stop_work', label: 'Stop Work' },
  { value: 'project_anniversary', label: 'Anniversary' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'planning_board', label: 'Planning Board' },
]

const PRIORITIES = ['high', 'medium', 'low'] as const

const PRIORITY_STYLES = {
  high: { bg: '#FEE2E2', text: '#EF4444', border: '#FECACA' },
  medium: { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775' },
  low: { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB' },
}

interface Props {
  onClose: () => void
  onCreate: (
    signal: Omit<Signal, 'id' | 'org_id' | 'created_at' | 'actioned_at' | 'dismissed_at'>
  ) => Promise<Signal | null>
}

export function AddSignalDialog({ onClose, onCreate }: Props) {
  const [type, setType] = useState<SignalType>('opportunity')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [headline, setHeadline] = useState('')
  const [detail, setDetail] = useState('')
  const [source, setSource] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await onCreate({
      type,
      priority,
      headline,
      detail: detail || undefined,
      source: source || undefined,
      source_url: sourceUrl || undefined,
    })
    setSaving(false)
    if (result) onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add signal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SignalType)}
              className="rounded-md border border-border bg-[#1C1C1C] px-3 py-2 text-sm"
            >
              {SIGNAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => {
                const style = PRIORITY_STYLES[p]
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="rounded-full px-3 py-1 text-xs font-medium capitalize"
                    style={{
                      backgroundColor: priority === p ? style.bg : 'transparent',
                      color: priority === p ? style.text : '#7C7C7C',
                      border: `1px solid ${priority === p ? style.border : '#2A2A2A'}`,
                    }}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Headline (what happened)"
            required
          />
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
          />
          <div className="flex gap-3">
            <Input
              className="flex-1"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Source"
            />
            <Input
              className="flex-1"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="Source URL"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!headline || saving}>
              {saving ? 'Adding...' : 'Add signal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
