import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Plus, Trash2, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { CountyPicker } from '@/components/territory/CountyPicker'
import { computeTerritoryCenter, type CountyData } from '@/data/counties'

interface ProjectDraft {
  name: string
  location: string
  year: string
  architect_name: string
  project_type: string
  budget_value: string
  description: string
}

interface ArchitectDraft {
  name: string
  firm: string
  location: string
  stage: 'Active' | 'Warm' | 'Cold'
}

const emptyProject = (): ProjectDraft => ({
  name: '',
  location: '',
  year: new Date().getFullYear().toString(),
  architect_name: '',
  project_type: 'New Construction',
  budget_value: '',
  description: '',
})

const emptyArchitect = (): ArchitectDraft => ({
  name: '',
  firm: '',
  location: '',
  stage: 'Warm',
})

export function OnboardingWizard() {
  const navigate = useNavigate()
  const { org, loading: orgLoading, refetch } = useOrg()
  const [step, setStep] = useState(1)

  // Refetch org on mount in case signup just created it
  useEffect(() => {
    refetch()
  }, [])

  if (orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    )
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Company info
  const [selectedCounties, setSelectedCounties] = useState<CountyData[]>(
    (org?.service_counties as CountyData[]) ?? []
  )
  const [budgetMin, setBudgetMin] = useState(org?.budget_min?.toString() ?? '1000000')
  const [budgetMax, setBudgetMax] = useState(org?.budget_max?.toString() ?? '8000000')

  // Step 2: Story
  const [story, setStory] = useState('')
  const [diff1, setDiff1] = useState('')
  const [diff2, setDiff2] = useState('')
  const [diff3, setDiff3] = useState('')

  // Step 3: Projects
  const [projects, setProjects] = useState<ProjectDraft[]>([emptyProject()])

  // Step 4: Architects
  const [architects, setArchitects] = useState<ArchitectDraft[]>([emptyArchitect()])

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return selectedCounties.length > 0
      case 2:
        return story.length > 0
      case 3:
        return projects.some((p) => p.name.length > 0)
      case 4:
        return architects.some((a) => a.name.length > 0)
      default:
        return false
    }
  }

  async function saveStep1() {
    if (!org) return
    const center = computeTerritoryCenter(selectedCounties)
    const states = [...new Set(selectedCounties.map((c) => c.state))]
    const territoryLabel = selectedCounties
      .slice(0, 3)
      .map((c) => `${c.name} ${c.state}`)
      .join(', ') + (selectedCounties.length > 3 ? ` +${selectedCounties.length - 3} more` : '')
    const { error: e } = await supabase
      .from('organizations')
      .update({
        service_counties: selectedCounties,
        region: states.join(', '),
        territory_label: territoryLabel,
        territory_lat: center.lat,
        territory_lng: center.lng,
        territory_radius_miles: center.radiusMiles,
        budget_min: parseInt(budgetMin) || 1000000,
        budget_max: parseInt(budgetMax) || 10000000,
      })
      .eq('id', org.id)
    if (e) setError(e.message)
    else setStep(2)
  }

  async function saveStep2() {
    if (!org) return
    const differentiators = [diff1, diff2, diff3].filter(Boolean)
    const { error: e } = await supabase.from('company_profiles').upsert(
      {
        org_id: org.id,
        story,
        differentiators,
      },
      { onConflict: 'org_id' }
    )
    if (e) setError(e.message)
    else setStep(3)
  }

  async function saveStep3() {
    if (!org) return
    const validProjects = projects.filter((p) => p.name.length > 0)
    const rows = validProjects.map((p) => ({
      org_id: org.id,
      name: p.name,
      location: p.location,
      year: parseInt(p.year) || new Date().getFullYear(),
      architect_name: p.architect_name,
      project_type: p.project_type,
      budget_value: parseInt(p.budget_value) || 0,
      description: p.description,
      highlights: [],
      tags: [],
      photos: [],
      is_showcase: false,
    }))
    const { error: e } = await supabase.from('kb_projects').insert(rows)
    if (e) setError(e.message)
    else setStep(4)
  }

  async function saveStep4() {
    if (!org) return
    setSaving(true)
    const validArchitects = architects.filter((a) => a.name.length > 0)
    const rows = validArchitects.map((a) => ({
      org_id: org.id,
      name: a.name,
      firm: a.firm,
      location: a.location,
      stage: a.stage,
      tier: 'Prospect' as const,
      pulse_score: 50,
      projects_together: 0,
      referral_value: 0,
      source: 'manual' as const,
      is_in_radar: false,
    }))
    const { error: e } = await supabase.from('architects').insert(rows)
    if (e) {
      setError(e.message)
      setSaving(false)
      return
    }
    await refetch()
    navigate('/crm')
  }

  async function handleNext() {
    setError('')
    setSaving(true)
    try {
      switch (step) {
        case 1: await saveStep1(); break
        case 2: await saveStep2(); break
        case 3: await saveStep3(); break
        case 4: await saveStep4(); break
      }
    } finally {
      setSaving(false)
    }
  }

  function addProject() {
    if (projects.length < 5) setProjects([...projects, emptyProject()])
  }

  function removeProject(i: number) {
    if (projects.length > 1) setProjects(projects.filter((_, idx) => idx !== i))
  }

  function updateProject(i: number, field: keyof ProjectDraft, value: string) {
    setProjects(projects.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  function addArchitect() {
    if (architects.length < 5) setArchitects([...architects, emptyArchitect()])
  }

  function removeArchitect(i: number) {
    if (architects.length > 1) setArchitects(architects.filter((_, idx) => idx !== i))
  }

  function updateArchitect(i: number, field: keyof ArchitectDraft, value: string) {
    setArchitects(
      architects.map((a, idx) => (idx === i ? { ...a, [field]: value } : a))
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1C1C1C]">
      <div className="w-full max-w-lg px-6 py-12">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: '#06B6D4' }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-medium">Set up your firm</h1>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="h-1.5 w-8 rounded-full"
                style={{
                  backgroundColor: s <= step ? '#06B6D4' : '#2A2A2A',
                }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Step {step} of 4
          </p>
        </div>

        {/* Step 1: Service Territory */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Your service territory</h2>
            <p className="text-sm text-muted-foreground">
              Select the counties where you build. This powers your Radar,
              Map, and competitive intelligence.
            </p>
            <CountyPicker
              selected={selectedCounties}
              onChange={setSelectedCounties}
            />
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-sm text-muted-foreground">Min budget ($)</label>
                <Input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-sm text-muted-foreground">Max budget ($)</label>
                <Input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Story */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Your company story</h2>
            <p className="text-sm text-muted-foreground">
              This powers the AI. Write 2 to 4 sentences about what makes your
              firm different.
            </p>
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="We build premium custom homes in the Hudson Valley..."
              rows={4}
            />
            <div className="flex flex-col gap-3">
              <label className="text-sm text-muted-foreground">
                What do you do that most GCs don't? (up to 3)
              </label>
              <Input
                value={diff1}
                onChange={(e) => setDiff1(e.target.value)}
                placeholder="In-house millwork shop"
              />
              <Input
                value={diff2}
                onChange={(e) => setDiff2(e.target.value)}
                placeholder="Dedicated VE team from pre-con"
              />
              <Input
                value={diff3}
                onChange={(e) => setDiff3(e.target.value)}
                placeholder="Owner-present on every site visit"
              />
            </div>
          </div>
        )}

        {/* Step 3: Projects */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Add your first projects</h2>
            <p className="text-sm text-muted-foreground">
              Add 1 to 5 completed projects. These train the AI on your real work.
            </p>
            {projects.map((p, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Project {i + 1}</span>
                  {projects.length > 1 && (
                    <button
                      onClick={() => removeProject(i)}
                      className="text-muted-foreground hover:text-[#E8E8F0]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Input
                  value={p.name}
                  onChange={(e) => updateProject(i, 'name', e.target.value)}
                  placeholder="Project name"
                />
                <div className="flex gap-3">
                  <Input
                    className="flex-1"
                    value={p.location}
                    onChange={(e) => updateProject(i, 'location', e.target.value)}
                    placeholder="Location"
                  />
                  <Input
                    className="w-20"
                    value={p.year}
                    onChange={(e) => updateProject(i, 'year', e.target.value)}
                    placeholder="Year"
                  />
                </div>
                <div className="flex gap-3">
                  <Input
                    className="flex-1"
                    value={p.architect_name}
                    onChange={(e) => updateProject(i, 'architect_name', e.target.value)}
                    placeholder="Architect name"
                  />
                  <Input
                    className="w-32"
                    value={p.budget_value}
                    onChange={(e) => updateProject(i, 'budget_value', e.target.value)}
                    placeholder="Budget ($)"
                    type="number"
                  />
                </div>
                <Input
                  value={p.description}
                  onChange={(e) => updateProject(i, 'description', e.target.value)}
                  placeholder="Brief description (2 sentences)"
                />
              </div>
            ))}
            {projects.length < 5 && (
              <Button variant="outline" onClick={addProject} className="gap-2">
                <Plus className="h-4 w-4" /> Add project
              </Button>
            )}
          </div>
        )}

        {/* Step 4: Architects */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Add your first architects</h2>
            <p className="text-sm text-muted-foreground">
              Add 1 to 5 architects you work with or want to build a relationship with.
            </p>
            {architects.map((a, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Architect {i + 1}</span>
                  {architects.length > 1 && (
                    <button
                      onClick={() => removeArchitect(i)}
                      className="text-muted-foreground hover:text-[#E8E8F0]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Input
                  value={a.name}
                  onChange={(e) => updateArchitect(i, 'name', e.target.value)}
                  placeholder="Architect name"
                />
                <Input
                  value={a.firm}
                  onChange={(e) => updateArchitect(i, 'firm', e.target.value)}
                  placeholder="Firm name"
                />
                <Input
                  value={a.location}
                  onChange={(e) => updateArchitect(i, 'location', e.target.value)}
                  placeholder="Location"
                />
                <div className="flex gap-2">
                  {(['Active', 'Warm', 'Cold'] as const).map((stage) => (
                    <button
                      key={stage}
                      onClick={() => updateArchitect(i, 'stage', stage)}
                      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor:
                          a.stage === stage
                            ? stage === 'Active'
                              ? '#E1F5EE'
                              : stage === 'Warm'
                                ? '#FAEEDA'
                                : '#F1EFE8'
                            : 'transparent',
                        color:
                          a.stage === stage
                            ? stage === 'Active'
                              ? '#085041'
                              : stage === 'Warm'
                                ? '#854F0B'
                                : '#5F5E5A'
                            : '#7C7C7C',
                        border: `1px solid ${
                          a.stage === stage
                            ? stage === 'Active'
                              ? '#9FE1CB'
                              : stage === 'Warm'
                                ? '#FAC775'
                                : '#D3D1C7'
                            : '#2A2A2A'
                        }`,
                      }}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {architects.length < 5 && (
              <Button variant="outline" onClick={addArchitect} className="gap-2">
                <Plus className="h-4 w-4" /> Add architect
              </Button>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm" style={{ color: '#EF4444' }}>
            {error}
          </p>
        )}

        <div className="mt-8 flex justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={handleNext} disabled={!canProceed() || saving}>
            {saving ? (
              'Saving...'
            ) : step === 4 ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Finish setup
              </>
            ) : (
              <>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
