import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MapPin, User, DollarSign, Plus, ChevronDown, ChevronRight } from 'lucide-react'

interface LifecycleProject {
  id: string
  address: string
  description: string
  architect_name?: string
  architect_id?: string
  applicant_name?: string
  town?: string
  value?: number
  source: 'board' | 'permit'
  source_type: string
  stage: string
  date?: string
  decision?: string
}

const STAGES = [
  { key: 'planning', label: 'Planning Board', color: '#EEEDFE', text: '#3C3489' },
  { key: 'zoning', label: 'Zoning Board', color: '#FAEEDA', text: '#854F0B' },
  { key: 'arb', label: 'Architectural Review', color: '#E1F5EE', text: '#085041' },
  { key: 'permit_filed', label: 'Permit Filed', color: '#F1EFE8', text: '#5F5E5A' },
  { key: 'permit_approved', label: 'Permit Approved', color: '#0F6E56', text: '#ffffff' },
]

function mapToStage(project: any): string {
  if (project.source === 'board') {
    if (project.source_type === 'planning') return 'planning'
    if (project.source_type === 'zoning') return 'zoning'
    if (project.source_type === 'architectural_review') return 'arb'
    return 'planning'
  }
  // Permit
  const status = (project.decision || project.status || '').toLowerCase()
  if (status.includes('approved') || status.includes('issued') || status.includes('final')) return 'permit_approved'
  return 'permit_filed'
}

interface Props {
  onAddToPipeline?: (project: LifecycleProject) => void
}

export function ProjectLifecycle({ onAddToPipeline }: Props) {
  const { org } = useOrg()
  const [projects, setProjects] = useState<LifecycleProject[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const fetchProjects = useCallback(async () => {
    if (!org) return
    setLoading(true)

    const [boardRes, permitRes] = await Promise.all([
      supabase
        .from('board_items')
        .select('*')
        .eq('org_id', org.id)
        .order('meeting_date', { ascending: false })
        .limit(50),
      supabase
        .from('permits')
        .select('*')
        .eq('org_id', org.id)
        .order('filed_date', { ascending: false })
        .limit(50),
    ])

    const all: LifecycleProject[] = []

    // Board items
    if (boardRes.data) {
      for (const item of boardRes.data) {
        if (!item.project_address && !item.project_description) continue
        all.push({
          id: item.id,
          address: item.project_address || '',
          description: item.project_description || '',
          architect_name: item.architect_name,
          architect_id: item.architect_id,
          applicant_name: item.applicant_name,
          town: item.town_name,
          source: 'board',
          source_type: item.board_type,
          stage: mapToStage({ source: 'board', source_type: item.board_type }),
          date: item.meeting_date,
          decision: item.decision,
        })
      }
    }

    // Permits (only construction-relevant ones)
    if (permitRes.data) {
      for (const permit of permitRes.data) {
        const type = (permit.permit_type || '').toLowerCase()
        // Skip non-construction permits
        if (type.includes('address') || type.includes('9-1-1') || type.includes('rental')) continue
        all.push({
          id: permit.id,
          address: permit.project_address || '',
          description: permit.scope_description || '',
          architect_name: permit.architect_name,
          town: permit.town,
          value: permit.estimated_value,
          source: 'permit',
          source_type: permit.permit_type || '',
          stage: mapToStage({ source: 'permit', decision: permit.status }),
          date: permit.filed_date,
          decision: permit.status,
        })
      }
    }

    setProjects(all)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Group by stage
  const byStage: Record<string, LifecycleProject[]> = {}
  for (const stage of STAGES) byStage[stage.key] = []
  for (const p of projects) {
    if (byStage[p.stage]) byStage[p.stage].push(p)
  }

  if (loading) return null

  const totalProjects = projects.length

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Project lifecycle
        <span className="text-xs text-muted-foreground font-normal">({totalProjects} projects tracked)</span>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-5 gap-2">
          {STAGES.map((stage) => {
            const stageProjects = byStage[stage.key] || []
            return (
              <div key={stage.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: stage.color, color: stage.text }}
                  >
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{stageProjects.length}</span>
                </div>
                <div
                  className="flex flex-col gap-1 rounded-lg bg-muted/30 p-1.5"
                  style={{ minHeight: 80 }}
                >
                  {stageProjects.length === 0 ? (
                    <p className="py-2 text-center text-[9px] text-muted-foreground">None</p>
                  ) : (
                    stageProjects.slice(0, 4).map((project) => (
                      <div
                        key={project.id}
                        className="rounded-md border border-border bg-white p-1.5"
                        style={{ borderWidth: '0.5px' }}
                      >
                        {project.address && (
                          <p className="text-[10px] font-medium leading-tight truncate">
                            <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
                            {project.address.length > 30 ? project.address.slice(0, 30) + '...' : project.address}
                          </p>
                        )}
                        {project.architect_name && (
                          <p className="text-[9px] text-muted-foreground truncate">
                            <User className="mr-0.5 inline h-2 w-2" />
                            {project.architect_id ? (
                              <Link to={`/relationships/${project.architect_id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                                {project.architect_name}
                              </Link>
                            ) : project.architect_name}
                          </p>
                        )}
                        {project.value ? (
                          <p className="text-[9px] text-muted-foreground">
                            <DollarSign className="mr-0.5 inline h-2 w-2" />
                            ${(project.value / 1000000).toFixed(1)}M
                          </p>
                        ) : null}
                        {onAddToPipeline && (
                          <button
                            onClick={() => onAddToPipeline(project)}
                            className="mt-0.5 flex items-center gap-0.5 text-[8px] text-primary hover:underline"
                          >
                            <Plus className="h-2 w-2" /> Add to pipeline
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  {stageProjects.length > 4 && (
                    <p className="text-center text-[9px] text-muted-foreground">
                      +{stageProjects.length - 4} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
