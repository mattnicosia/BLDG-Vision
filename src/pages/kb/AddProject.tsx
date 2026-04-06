import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKBProjects } from '@/hooks/useKB'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AddProject() {
  const navigate = useNavigate()
  const { createProject } = useKBProjects()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [architectName, setArchitectName] = useState('')
  const [projectType, setProjectType] = useState('New Construction')
  const [category, setCategory] = useState<'residential' | 'commercial' | 'hospitality'>('residential')
  const [budgetValue, setBudgetValue] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await createProject({
      name,
      category,
      location: location || undefined,
      year: parseInt(year) || new Date().getFullYear(),
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
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
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
        <Input
          value={architectName}
          onChange={(e) => setArchitectName(e.target.value)}
          placeholder="Architect name"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'residential' | 'commercial' | 'hospitality')}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
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
