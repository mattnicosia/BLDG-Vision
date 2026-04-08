import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useKBProjects } from '@/hooks/useKB'
import { useArchitects } from '@/hooks/useArchitects'
import { usePermits } from '@/hooks/usePermits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'

export function AddProject() {
  const navigate = useNavigate()
  const { createProject } = useKBProjects()
  const { architects } = useArchitects()
  const { permits } = usePermits()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [architectId, setArchitectId] = useState('')
  const [architectName, setArchitectName] = useState('')
  const [projectType, setProjectType] = useState('New Construction')
  const [category, setCategory] = useState<'residential' | 'commercial' | 'hospitality'>('residential')
  const [budgetValue, setBudgetValue] = useState('')
  const [description, setDescription] = useState('')
  const [permitId, setPermitId] = useState('')
  const [saving, setSaving] = useState(false)

  function handleArchitectChange(id: string) {
    setArchitectId(id)
    if (id) {
      const arch = architects.find((a) => a.id === id)
      if (arch) setArchitectName(arch.name)
    } else {
      setArchitectName('')
    }
  }

  function handlePermitChange(id: string) {
    setPermitId(id)
    if (id) {
      const permit = permits.find((p) => p.id === id)
      if (permit) {
        if (!location && permit.project_address) setLocation(permit.project_address)
        if (!description && permit.scope_description) setDescription(permit.scope_description)
        if (permit.estimated_value && !budgetValue) setBudgetValue(permit.estimated_value.toString())
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await createProject({
      name,
      category,
      location: location || undefined,
      year: parseInt(year) || new Date().getFullYear(),
      architect_id: architectId || undefined,
      architect_name: architectName || undefined,
      project_type: projectType || undefined,
      budget_value: parseInt(budgetValue) || undefined,
      description: description || undefined,
      highlights: [],
      tags: [],
      photos: [],
      is_showcase: false,
    })
    setSaving(false)
    if (result) navigate('/kb')
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        to="/kb"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-[#E8E8F0]"
      >
        <ArrowLeft className="h-4 w-4" /> Knowledge Base
      </Link>

      <h1 className="mb-6 text-xl font-medium">Add project</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
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
            className="w-24"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
          />
        </div>

        {/* Architect selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Architect</label>
          <select
            value={architectId}
            onChange={(e) => handleArchitectChange(e.target.value)}
            className="rounded-md border border-border bg-[#1A1A24] px-3 py-2 text-sm"
          >
            <option value="">Select architect (optional)</option>
            {architects.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.firm && a.firm !== a.name ? `(${a.firm})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Permit selector */}
        {permits.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Link to permit (optional)</label>
            <select
              value={permitId}
              onChange={(e) => handlePermitChange(e.target.value)}
              className="rounded-md border border-border bg-[#1A1A24] px-3 py-2 text-sm"
            >
              <option value="">No linked permit</option>
              {permits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.permit_number} - {p.project_address?.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'residential' | 'commercial' | 'hospitality')}
            className="rounded-md border border-border bg-[#1A1A24] px-3 py-2 text-sm"
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="hospitality">Hospitality</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Input
            className="flex-1"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            placeholder="Project type"
          />
          <Input
            className="w-32"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
            placeholder="Budget ($)"
            type="number"
          />
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/kb')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name || saving}>
            {saving ? 'Saving...' : 'Add project'}
          </Button>
        </div>
      </form>
    </div>
  )
}
