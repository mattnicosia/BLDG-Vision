import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, User, DollarSign, Plus, ChevronDown, ChevronRight, Calendar, FileText, ExternalLink, Building2 } from 'lucide-react'

interface LifecycleProject {
  id: string
  address: string
  description: string
  architect_name?: string
  architect_id?: string
  applicant_name?: string
  engineer_name?: string
  contractor_name?: string
  town?: string
  value?: number
  source: 'board' | 'permit'
  source_type: string
  source_label: string
  stage: string
  date?: string
  decision?: string
  conditions?: string
  scope?: string
  source_url?: string
  permit_number?: string
}

const STAGES = [
  { key: 'land_sale', label: 'Land Sale', color: '#FEE2E2', text: '#A32D2D' },
  { key: 'planning', label: 'Planning Board', color: '#EEEDFE', text: '#3C3489' },
  { key: 'zoning', label: 'Zoning Board', color: '#FAEEDA', text: '#854F0B' },
  { key: 'arb', label: 'Architectural Review', color: '#E1F5EE', text: '#085041' },
  { key: 'permit_filed', label: 'Permit Filed', color: '#F1EFE8', text: '#5F5E5A' },
  { key: 'permit_approved', label: 'Permit Approved', color: '#0F6E56', text: '#ffffff' },
]

function mapToStage(source: string, sourceType: string, decision?: string): string {
  if (source === 'board') {
    if (sourceType === 'planning') return 'planning'
    if (sourceType === 'zoning') return 'zoning'
    if (sourceType === 'architectural_review') return 'arb'
    return 'planning'
  }
  const status = (decision || '').toLowerCase()
  if (status.includes('approved') || status.includes('issued') || status.includes('final')) return 'permit_approved'
  return 'permit_filed'
}

function formatDate(d?: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props {
  onAddToPipeline?: (project: LifecycleProject) => void
}

export function ProjectLifecycle({ onAddToPipeline }: Props) {
  const { org } = useOrg()
  const [projects, setProjects] = useState<LifecycleProject[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [selectedProject, setSelectedProject] = useState<LifecycleProject | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!org) return
    setLoading(true)

    const [boardRes, permitRes, landRes] = await Promise.all([
      supabase.from('board_items').select('*').eq('org_id', org.id).order('meeting_date', { ascending: false }).limit(50),
      supabase.from('permits').select('*').eq('org_id', org.id).order('filed_date', { ascending: false }).limit(50),
      supabase.from('land_transactions').select('*').eq('org_id', org.id).order('sale_date', { ascending: false }).limit(50),
    ])

    const all: LifecycleProject[] = []

    if (boardRes.data) {
      for (const item of boardRes.data) {
        if (!item.project_address && !item.project_description) continue
        const boardLabels: Record<string, string> = { planning: 'Planning Board', zoning: 'Zoning Board', architectural_review: 'Architectural Review' }
        all.push({
          id: item.id,
          address: item.project_address || '',
          description: item.project_description || '',
          architect_name: item.architect_name,
          architect_id: item.architect_id,
          applicant_name: item.applicant_name,
          engineer_name: item.engineer_name,
          town: item.town_name,
          source: 'board',
          source_type: item.board_type,
          source_label: boardLabels[item.board_type] || item.board_type,
          stage: mapToStage('board', item.board_type),
          date: item.meeting_date,
          decision: item.decision,
          conditions: item.conditions,
          scope: item.estimated_scope,
        })
      }
    }

    if (permitRes.data) {
      for (const permit of permitRes.data) {
        const type = (permit.permit_type || '').toLowerCase()
        if (type.includes('address') || type.includes('9-1-1') || type.includes('rental')) continue
        all.push({
          id: permit.id,
          address: permit.project_address || '',
          description: permit.scope_description || '',
          architect_name: permit.architect_name,
          contractor_name: permit.contractor_name,
          town: permit.town,
          value: permit.estimated_value,
          source: 'permit',
          source_type: permit.permit_type || '',
          source_label: permit.permit_type || 'Permit',
          stage: mapToStage('permit', '', permit.status),
          date: permit.filed_date,
          decision: permit.status,
          permit_number: permit.permit_number,
          source_url: permit.source_url,
        })
      }
    }

    // Land transactions
    if (landRes.data) {
      for (const land of landRes.data) {
        if (land.sale_price < 300000) continue
        all.push({
          id: land.id,
          address: land.address || '',
          description: `${land.property_class_desc || 'Property'} sold for $${(land.sale_price / 1000000).toFixed(1)}M. Buyer: ${land.buyer_name || 'Unknown'}`,
          applicant_name: land.buyer_name,
          town: land.county,
          value: land.sale_price,
          source: 'permit' as const,
          source_type: 'Land Transaction',
          source_label: `Land Sale - ${land.property_class_desc || 'Property'}`,
          stage: 'land_sale',
          date: land.sale_date,
          decision: land.new_construction ? 'New construction' : 'Transfer',
        })
      }
    }

    setProjects(all)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const byStage: Record<string, LifecycleProject[]> = {}
  for (const stage of STAGES) byStage[stage.key] = []
  for (const p of projects) {
    if (byStage[p.stage]) byStage[p.stage].push(p)
  }

  if (loading) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Project lifecycle
        <span className="text-xs text-muted-foreground font-normal">({projects.length} projects)</span>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-6 gap-2">
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
                <div className="flex max-h-[300px] flex-col gap-1 overflow-y-auto rounded-lg bg-muted/30 p-1.5" style={{ minHeight: 80 }}>
                  {stageProjects.length === 0 ? (
                    <p className="py-2 text-center text-[9px] text-muted-foreground">None</p>
                  ) : (
                    stageProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="w-full rounded-md border border-border bg-white p-2 text-left transition-colors hover:bg-muted/50"
                        style={{ borderWidth: '0.5px' }}
                      >
                        {project.address && (
                          <p className="text-[10px] font-medium leading-tight">
                            <MapPin className="mr-0.5 inline h-2.5 w-2.5 text-muted-foreground" />
                            {project.address.length > 28 ? project.address.slice(0, 28) + '...' : project.address}
                          </p>
                        )}
                        <p className="mt-0.5 text-[9px] text-muted-foreground truncate">
                          {project.source_label}
                        </p>
                        {project.description && (
                          <p className="mt-0.5 text-[9px] text-muted-foreground line-clamp-1">
                            {project.description}
                          </p>
                        )}
                        {(project.architect_name || project.value) && (
                          <div className="mt-0.5 flex items-center gap-2">
                            {project.architect_name && (
                              <span className="text-[9px] text-primary truncate">
                                <User className="mr-0.5 inline h-2 w-2" />{project.architect_name}
                              </span>
                            )}
                            {project.value ? (
                              <span className="text-[9px] font-medium" style={{ color: '#0F6E56' }}>
                                ${(project.value / 1000000).toFixed(1)}M
                              </span>
                            ) : null}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Project detail modal */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {selectedProject.address || 'Project details'}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {/* Stage + source badge */}
              <div className="flex flex-wrap gap-2">
                {STAGES.filter((s) => s.key === selectedProject.stage).map((s) => (
                  <span key={s.key} className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: s.color, color: s.text }}>
                    {s.label}
                  </span>
                ))}
                {selectedProject.decision && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground capitalize">
                    {selectedProject.decision}
                  </span>
                )}
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm">{selectedProject.description}</p>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {selectedProject.town && (
                  <div>
                    <p className="text-xs text-muted-foreground">Town</p>
                    <p className="text-sm">{selectedProject.town}</p>
                  </div>
                )}
                {selectedProject.date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(selectedProject.date)}
                    </p>
                  </div>
                )}
                {selectedProject.value ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated value</p>
                    <p className="text-sm font-medium" style={{ color: '#0F6E56' }}>
                      <DollarSign className="mr-0.5 inline h-3 w-3" />
                      {selectedProject.value.toLocaleString()}
                    </p>
                  </div>
                ) : null}
                {selectedProject.scope && (
                  <div>
                    <p className="text-xs text-muted-foreground">Scope</p>
                    <p className="text-sm">{selectedProject.scope}</p>
                  </div>
                )}
                {selectedProject.permit_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Permit number</p>
                    <p className="text-sm">{selectedProject.permit_number}</p>
                  </div>
                )}
                {selectedProject.source_label && (
                  <div>
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm">{selectedProject.source_label}</p>
                  </div>
                )}
              </div>

              {/* People involved */}
              {(selectedProject.architect_name || selectedProject.applicant_name || selectedProject.engineer_name || selectedProject.contractor_name) && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">People involved</p>
                  <div className="flex flex-col gap-1.5">
                    {selectedProject.architect_name && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Architect</p>
                          {selectedProject.architect_id ? (
                            <Link to={`/relationships/${selectedProject.architect_id}`} className="text-sm text-primary hover:underline" onClick={() => setSelectedProject(null)}>
                              {selectedProject.architect_name}
                            </Link>
                          ) : (
                            <p className="text-sm">{selectedProject.architect_name}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedProject.applicant_name && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Applicant</p>
                          <p className="text-sm">{selectedProject.applicant_name}</p>
                        </div>
                      </div>
                    )}
                    {selectedProject.engineer_name && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Engineer</p>
                          <p className="text-sm">{selectedProject.engineer_name}</p>
                        </div>
                      </div>
                    )}
                    {selectedProject.contractor_name && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                        <Building2 className="h-3.5 w-3.5" style={{ color: '#A32D2D' }} />
                        <div>
                          <p className="text-[10px] text-muted-foreground">Contractor</p>
                          <p className="text-sm">{selectedProject.contractor_name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conditions */}
              {selectedProject.conditions && (
                <div>
                  <p className="text-xs text-muted-foreground">Conditions</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedProject.conditions}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-2">
                {selectedProject.source_url && (
                  <a
                    href={selectedProject.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View source
                  </a>
                )}
                {onAddToPipeline && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onAddToPipeline(selectedProject)
                      setSelectedProject(null)
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add to pipeline
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
