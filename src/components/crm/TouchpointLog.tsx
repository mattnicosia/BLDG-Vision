import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import type { ArchitectTouchpoint } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Mail, Phone, Users, MapPin, Heart, MoreHorizontal } from 'lucide-react'

const TOUCHPOINT_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'site_visit', label: 'Site Visit', icon: MapPin },
  { value: 'social', label: 'Social', icon: Heart },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
] as const

interface TouchpointLogProps {
  architectId: string
  touchpoints: ArchitectTouchpoint[]
  onAdd: () => void
}

export function TouchpointLog({ architectId, touchpoints, onAdd }: TouchpointLogProps) {
  const { org } = useOrg()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<ArchitectTouchpoint['type']>('email')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!org) return
    setSaving(true)
    const { error } = await supabase.from('architect_touchpoints').insert({
      org_id: org.id,
      architect_id: architectId,
      type,
      notes,
      contacted_at: new Date().toISOString(),
    })
    if (!error) {
      setNotes('')
      setShowForm(false)
      onAdd()
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Contact log</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1 text-xs"
        >
          <Plus className="h-3 w-3" /> Log touchpoint
        </Button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4" style={{ borderWidth: '0.5px' }}>
          <div className="flex flex-wrap gap-2">
            {TOUCHPOINT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: type === t.value ? '#E1F5EE' : 'transparent',
                  color: type === t.value ? '#085041' : '#71717a',
                  border: `1px solid ${type === t.value ? '#9FE1CB' : '#e4e4e7'}`,
                }}
              >
                <t.icon className="h-3 w-3" />
                {t.label}
              </button>
            ))}
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened?"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {touchpoints.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No touchpoints yet</p>
        )}
        {touchpoints.map((tp) => {
          const TypeIcon =
            TOUCHPOINT_TYPES.find((t) => t.value === tp.type)?.icon ?? MoreHorizontal
          return (
            <div
              key={tp.id}
              className="flex items-start gap-3 rounded-lg bg-[#111118] p-3"
            >
              <TypeIcon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex flex-1 flex-col gap-0.5">
                {tp.notes && (
                  <p className="text-sm text-[#E8E8F0]">{tp.notes}</p>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(tp.contacted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
