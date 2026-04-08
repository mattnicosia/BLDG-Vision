import { useState, useEffect } from 'react'
import { useCompanyProfile } from '@/hooks/useKB'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Pencil, Check, Plus, Trash2 } from 'lucide-react'

export function CompanyTab() {
  const { profile, loading, updateProfile } = useCompanyProfile()
  const [editing, setEditing] = useState(false)
  const [story, setStory] = useState('')
  const [diffs, setDiffs] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setStory(profile.story ?? '')
      setDiffs(profile.differentiators?.length ? profile.differentiators : [''])
    }
  }, [profile])

  async function handleSave() {
    setSaving(true)
    await updateProfile({
      story,
      differentiators: diffs.filter(Boolean),
    })
    setSaving(false)
    setEditing(false)
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Company profile</h2>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
        <label className="text-xs text-muted-foreground">Company story</label>
        {editing ? (
          <Textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={4}
            className="mt-2"
            placeholder="What makes your firm different? 2 to 4 sentences."
          />
        ) : (
          <p className="mt-2 text-sm">
            {profile?.story || 'No company story yet. Click Edit to add one.'}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
        <label className="text-xs text-muted-foreground">Differentiators</label>
        {editing ? (
          <div className="mt-2 flex flex-col gap-2">
            {diffs.map((d, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={d}
                  onChange={(e) => {
                    const next = [...diffs]
                    next[i] = e.target.value
                    setDiffs(next)
                  }}
                  placeholder={`Differentiator ${i + 1}`}
                />
                {diffs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDiffs(diffs.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {diffs.length < 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDiffs([...diffs, ''])}
                className="gap-1 self-start"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-1">
            {profile?.differentiators?.length ? (
              profile.differentiators.map((d, i) => (
                <p key={i} className="text-sm">
                  {d}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">None added yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
