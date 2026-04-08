import { useState } from 'react'
import { useKBProjects } from '@/hooks/useKB'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { usePersistedState } from '@/hooks/usePersistedState'
import {
  Plus, MapPin, Calendar, DollarSign, User, Trash2,
  Building2, Briefcase, HardHat, ChevronDown, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectCategory, KBProject } from '@/types'

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  residential: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06B6D4' },
  commercial: { bg: 'rgba(129, 140, 248, 0.15)', text: '#818CF8' },
  hospitality: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
}

function formatValue(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

export function ProjectsTab() {
  const { projects, loading, refetch } = useKBProjects()
  const [categoryFilter, setCategoryFilter] = usePersistedState<ProjectCategory | 'all'>('projects-category', 'all')
  const [statusFilter, setStatusFilter] = usePersistedState<'all' | 'active' | 'inactive'>('projects-status', 'all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function deleteProject(project: KBProject) {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('kb_projects').delete().eq('id', project.id)
    if (error) { toast.error(error.message) } else { toast.success('Project deleted'); refetch() }
  }

  const filtered = projects.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
    if (statusFilter === 'active' && p.status === 'inactive') return false
    if (statusFilter === 'inactive' && p.status !== 'inactive') return false
    return true
  })

  const activeCount = projects.filter(p => p.status !== 'inactive').length
  const inactiveCount = projects.filter(p => p.status === 'inactive').length
  const totalValue = filtered.reduce((s, p) => s + (p.budget_value || 0), 0)

  if (loading) return <p className="text-sm" style={{ color: '#7C7C7C' }}>Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="nav-item rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: statusFilter === s ? '#6366F1' : 'transparent',
                  color: statusFilter === s ? '#fff' : '#7C7C7C',
                  border: `1px solid ${statusFilter === s ? '#6366F1' : '#2A2A2A'}`,
                }}
              >
                {s === 'all' ? `All (${projects.length})` : s === 'active' ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
              </button>
            ))}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ProjectCategory | 'all')}
            className="rounded-md border px-2 py-1 text-xs"
            style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
          >
            <option value="all">All categories</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="hospitality">Hospitality</option>
          </select>
          {totalValue > 0 && (
            <span className="metric-number text-[12px]" style={{ color: '#06B6D4' }}>
              Total: {formatValue(totalValue)}
            </span>
          )}
        </div>
        <Link to="/settings/projects/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add project
          </Button>
        </Link>
      </div>

      {/* Projects list */}
      {filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm" style={{ color: '#7C7C7C' }}>
            {projects.length === 0 ? 'No projects yet. Connect Procore or add manually.' : 'No projects match your filters.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 stagger-enter">
          {filtered.map((p) => {
            const catStyle = CATEGORY_STYLES[p.category] ?? CATEGORY_STYLES.residential
            const expanded = expandedIds.has(p.id)
            const hasContacts = p.architect_name || p.client_name || p.engineer_name || p.owners_rep_name

            return (
              <div
                key={p.id}
                className="card-hover rounded-xl border p-4"
                style={{ backgroundColor: '#1C1C1C', borderColor: '#2A2A2A' }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <button onClick={() => toggleExpand(p.id)} className="mt-0.5">
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5" style={{ color: '#7C7C7C' }} />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" style={{ color: '#7C7C7C' }} />
                      )}
                    </button>
                    <div>
                      <button onClick={() => toggleExpand(p.id)} className="text-left">
                        <h3 className="text-[14px] font-medium" style={{ color: '#E8E8F0' }}>{p.name}</h3>
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                        {p.location && (
                          <span className="flex items-center gap-1" style={{ color: '#7C7C7C' }}>
                            <MapPin className="h-3 w-3" /> {p.location}
                          </span>
                        )}
                        {p.year && (
                          <span className="flex items-center gap-1" style={{ color: '#7C7C7C' }}>
                            <Calendar className="h-3 w-3" /> {p.year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.budget_value && p.budget_value > 1 ? (
                      <span className="metric-number text-[16px] font-medium" style={{ color: '#06B6D4' }}>
                        {formatValue(p.budget_value)}
                      </span>
                    ) : null}
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                      style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                    >
                      {p.category}
                    </span>
                    {p.status === 'inactive' && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: 'rgba(124, 124, 124, 0.15)', color: '#7C7C7C' }}>
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact row — always visible */}
                {hasContacts && (
                  <div className="mt-2 flex flex-wrap gap-4 text-[11px]">
                    {p.architect_name && (
                      <span className="flex items-center gap-1" style={{ color: '#818CF8' }}>
                        <User className="h-3 w-3" />
                        Architect: {p.architect_id ? (
                          <Link to={`/relationships/${p.architect_id}`} className="hover:underline" style={{ color: '#818CF8' }}>{p.architect_name}</Link>
                        ) : p.architect_name}
                      </span>
                    )}
                    {p.client_name && (
                      <span className="flex items-center gap-1" style={{ color: '#06B6D4' }}>
                        <Building2 className="h-3 w-3" /> Client: {p.client_name}
                      </span>
                    )}
                    {p.engineer_name && (
                      <span className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
                        <HardHat className="h-3 w-3" /> Engineer: {p.engineer_name}
                      </span>
                    )}
                    {p.owners_rep_name && (
                      <span className="flex items-center gap-1" style={{ color: '#A0A0A0' }}>
                        <Briefcase className="h-3 w-3" /> Owner's Rep: {p.owners_rep_name}
                      </span>
                    )}
                  </div>
                )}

                {/* Expanded details */}
                {expanded && (
                  <div className="mt-3 border-t pt-3" style={{ borderColor: '#2A2A2A' }}>
                    <div className="grid grid-cols-2 gap-3">
                      {p.project_type && (
                        <div>
                          <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Type</p>
                          <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{p.project_type}</p>
                        </div>
                      )}
                      {p.sf && (
                        <div>
                          <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Square footage</p>
                          <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{Number(p.sf).toLocaleString()} SF</p>
                        </div>
                      )}
                      {p.start_date && (
                        <div>
                          <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Start date</p>
                          <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{new Date(p.start_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {p.end_date && (
                        <div>
                          <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>End date</p>
                          <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{new Date(p.end_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    {p.description && (
                      <div className="mt-3">
                        <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Description</p>
                        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: '#A0A0A0' }}>{p.description}</p>
                      </div>
                    )}
                    {p.tags && p.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {p.tags.map((tag, i) => (
                          <span key={i} className="rounded-full px-2 py-0.5 text-[10px]"
                            style={{ backgroundColor: '#141414', color: '#7C7C7C', border: '1px solid #2A2A2A' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(p)}
                        className="gap-1 text-[11px]"
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
