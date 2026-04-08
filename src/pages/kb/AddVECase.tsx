import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useOrg } from '@/hooks/useOrg'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'

export function AddVECase() {
  const navigate = useNavigate()
  const { org } = useOrg()
  const [title, setTitle] = useState('')
  const [originalSpec, setOriginalSpec] = useState('')
  const [veSpec, setVeSpec] = useState('')
  const [savingsAmount, setSavingsAmount] = useState('')
  const [savingsLabel, setSavingsLabel] = useState('')
  const [howItWorked, setHowItWorked] = useState('')
  const [architectResponse, setArchitectResponse] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!org) return
    setSaving(true)
    const { error } = await supabase.from('kb_ve_cases').insert({
      org_id: org.id,
      title,
      original_spec: originalSpec || undefined,
      ve_spec: veSpec || undefined,
      savings_amount: parseInt(savingsAmount) || undefined,
      savings_label: savingsLabel || undefined,
      how_it_worked: howItWorked || undefined,
      architect_response: architectResponse || undefined,
      tags: [],
    })
    setSaving(false)
    if (!error) navigate('/kb')
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        to="/kb"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-[#E8E8F0]"
      >
        <ArrowLeft className="h-4 w-4" /> Knowledge Base
      </Link>

      <h1 className="mb-6 text-xl font-medium">Add VE case</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VE case title"
          required
        />
        <div className="flex gap-3">
          <Input
            className="flex-1"
            value={originalSpec}
            onChange={(e) => setOriginalSpec(e.target.value)}
            placeholder="Original spec"
          />
          <Input
            className="flex-1"
            value={veSpec}
            onChange={(e) => setVeSpec(e.target.value)}
            placeholder="VE spec"
          />
        </div>
        <div className="flex gap-3">
          <Input
            className="flex-1"
            value={savingsAmount}
            onChange={(e) => setSavingsAmount(e.target.value)}
            placeholder="Savings ($)"
            type="number"
          />
          <Input
            className="flex-1"
            value={savingsLabel}
            onChange={(e) => setSavingsLabel(e.target.value)}
            placeholder='Savings label (e.g. "15% savings")'
          />
        </div>
        <Textarea
          value={howItWorked}
          onChange={(e) => setHowItWorked(e.target.value)}
          placeholder="How it worked"
          rows={3}
        />
        <Textarea
          value={architectResponse}
          onChange={(e) => setArchitectResponse(e.target.value)}
          placeholder="How did the architect respond?"
          rows={2}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/kb')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title || saving}>
            {saving ? 'Saving...' : 'Add VE case'}
          </Button>
        </div>
      </form>
    </div>
  )
}
