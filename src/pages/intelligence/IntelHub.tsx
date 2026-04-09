import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { usePersistedState } from '@/hooks/usePersistedState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useArchitects } from '@/hooks/useArchitects'
import { toast } from 'sonner'
import {
  Target, FileText, Crosshair, Plus, Check, X, ChevronRight,
  AlertTriangle, Eye, Shield, MapPin, Briefcase, Mic, MicOff,
  Clock, ArrowRight, Loader2, Search,
} from 'lucide-react'

// ─── TYPES ──────────────────────────────────────────────────────────
interface PIR {
  id: string
  question: string
  priority: string
  category: string
  status: string
  confidence_level: number
  indicators: string[]
  answer_summary?: string
  last_assessed?: string
  created_at: string
}

interface FieldReport {
  id: string
  source_type: string
  source_person_name?: string
  source_person_id?: string
  report_date: string
  raw_notes: string
  ai_summary?: string
  actionable: boolean
  collection_discipline: string
  relationship_signals: any[]
  processed_at?: string
  engagement_cycle_id?: string
  created_at: string
}

interface EngagementCycle {
  id: string
  trigger_type: string
  target_type: string
  target_name: string
  cycle_status: string
  priority: string
  next_action?: string
  next_action_date?: string
  engagement_type?: string
  engagement_outcome?: string
  intel_captured?: string
  assessment?: string
  created_at: string
  updated_at: string
}

const PRIORITY_COLORS: Record<string, string> = { critical: '#EF4444', high: '#F59E0B', medium: '#06B6D4', low: '#7C7C7C', important: '#F59E0B', routine: '#7C7C7C' }
const STATUS_COLORS: Record<string, string> = { find: '#818CF8', fix: '#F59E0B', finish: '#06B6D4', exploit: '#22C55E', analyze: '#6366F1', complete: '#7C7C7C', abandoned: '#4A4A4A' }
const CATEGORY_ICONS: Record<string, typeof Target> = { project: MapPin, architect: Eye, competitor: Shield, market: Briefcase, timing: Clock }

export function IntelHub() {
  const { org } = useOrg()
  const { architects } = useArchitects()
  const [tab, setTab] = usePersistedState<'pirs' | 'field_reports' | 'engagements'>('intelhub-tab', 'pirs')
  const [pirs, setPirs] = useState<PIR[]>([])
  const [reports, setReports] = useState<FieldReport[]>([])
  const [cycles, setCycles] = useState<EngagementCycle[]>([])
  const [loading, setLoading] = useState(true)

  // Forms
  const [showAddPIR, setShowAddPIR] = useState(false)
  const [showAddReport, setShowAddReport] = useState(false)
  const [newPIR, setNewPIR] = useState({ question: '', priority: 'important', category: 'project' })
  const [newReport, setNewReport] = useState({ source_type: 'conversation', source_person_name: '', source_person_id: '', raw_notes: '' })
  const [processing, setProcessing] = useState(false)
  const [listening, setListening] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const [pirRes, reportRes, cycleRes] = await Promise.all([
      supabase.from('intelligence_requirements').select('*').eq('org_id', org.id).order('priority').order('created_at', { ascending: false }),
      supabase.from('field_reports').select('*').eq('org_id', org.id).order('report_date', { ascending: false }).limit(50),
      supabase.from('engagement_cycles').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(50),
    ])
    if (pirRes.data) setPirs(pirRes.data)
    if (reportRes.data) setReports(reportRes.data)
    if (cycleRes.data) setCycles(cycleRes.data)
    setLoading(false)
  }, [org])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function addPIR() {
    if (!org || !newPIR.question) return
    await supabase.from('intelligence_requirements').insert({ org_id: org.id, ...newPIR })
    setNewPIR({ question: '', priority: 'important', category: 'project' })
    setShowAddPIR(false)
    fetchAll()
    toast.success('Intelligence requirement added')
  }

  async function submitFieldReport() {
    if (!org || !newReport.raw_notes) { toast.error('Enter your observations'); return }
    setProcessing(true)

    // Save the report
    const { data: report, error } = await supabase.from('field_reports').insert({
      org_id: org.id,
      source_type: newReport.source_type,
      source_person_name: newReport.source_person_name || null,
      source_person_id: newReport.source_person_id || null,
      raw_notes: newReport.raw_notes,
    }).select().single()

    if (error || !report) { toast.error('Failed to save report'); setProcessing(false); return }

    // Process with AI
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/process-field-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': anonKey },
        body: JSON.stringify({ action: 'process', report_id: report.id }),
      })
      const data = res.ok ? await res.json() : null
      if (data?.actionable) {
        toast.success(`Intel processed: ${data.recommended_action || 'Actionable intelligence captured'}`)
      } else {
        toast.success('Field report logged and processed')
      }
    } catch { toast.success('Field report saved (AI processing pending)') }

    setNewReport({ source_type: 'conversation', source_person_name: '', source_person_id: '', raw_notes: '' })
    setShowAddReport(false)
    setProcessing(false)
    fetchAll()
  }

  async function updateCycleStatus(id: string, newStatus: string, notes?: string) {
    const updates: any = { cycle_status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'fix') updates.fix_date = new Date().toISOString()
    if (newStatus === 'finish') updates.engagement_date = new Date().toISOString()
    if (notes) updates.engagement_notes = notes
    await supabase.from('engagement_cycles').update(updates).eq('id', id)
    fetchAll()
    toast.success(`Moved to ${newStatus.toUpperCase()}`)
  }

  // Voice input for field reports
  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Voice not supported'); return }
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('')
      setNewReport(prev => ({ ...prev, raw_notes: transcript }))
    }
    recognition.start()
    ;(window as any).__recognition = recognition
  }

  function stopVoice() {
    ;(window as any).__recognition?.stop()
    setListening(false)
  }

  const activePIRs = pirs.filter(p => p.status === 'active')
  const activeCycles = cycles.filter(c => c.cycle_status !== 'complete' && c.cycle_status !== 'abandoned')
  const F3EAD_STAGES = ['find', 'fix', 'finish', 'exploit', 'analyze']

  return (
    <div className="mx-auto max-w-5xl page-enter">
      <div className="mb-6">
        <h1 className="text-xl font-medium" style={{ color: '#E8E8F0' }}>Intelligence Hub</h1>
        <p className="text-[13px]" style={{ color: '#7C7C7C' }}>Requirements, field reports, and engagement tracking</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {[
          { key: 'pirs' as const, label: `Requirements (${activePIRs.length})`, icon: Target },
          { key: 'field_reports' as const, label: `Field Reports (${reports.length})`, icon: FileText },
          { key: 'engagements' as const, label: `Engagements (${activeCycles.length})`, icon: Crosshair },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="nav-item flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium"
            style={{
              backgroundColor: tab === t.key ? '#6366F1' : '#1C1C1C',
              color: tab === t.key ? '#fff' : '#7C7C7C',
              border: `1px solid ${tab === t.key ? '#6366F1' : '#2A2A2A'}`,
            }}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#7C7C7C' }}>Loading...</p> : (
        <>
          {/* ═══ PIRs TAB ═══ */}
          {tab === 'pirs' && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <p className="text-[12px]" style={{ color: '#7C7C7C' }}>
                  Define what you need to know. Everything in the system orients around these questions.
                </p>
                <Button size="sm" onClick={() => setShowAddPIR(true)} className="gap-1"><Plus className="h-3 w-3" /> Add requirement</Button>
              </div>

              {showAddPIR && (
                <div className="rounded-xl p-4" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                  <Input value={newPIR.question} onChange={e => setNewPIR({ ...newPIR, question: e.target.value })} placeholder='e.g., "Which architects in Ulster County are starting new projects over $2M?"' className="mb-2" />
                  <div className="flex gap-2">
                    <select value={newPIR.priority} onChange={e => setNewPIR({ ...newPIR, priority: e.target.value })} className="rounded-md border px-2 py-1.5 text-[12px]" style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
                      <option value="critical">Critical</option>
                      <option value="important">Important</option>
                      <option value="routine">Routine</option>
                    </select>
                    <select value={newPIR.category} onChange={e => setNewPIR({ ...newPIR, category: e.target.value })} className="rounded-md border px-2 py-1.5 text-[12px]" style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
                      <option value="project">Project</option>
                      <option value="architect">Architect</option>
                      <option value="competitor">Competitor</option>
                      <option value="market">Market</option>
                      <option value="timing">Timing</option>
                    </select>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => setShowAddPIR(false)}>Cancel</Button>
                    <Button size="sm" onClick={addPIR} className="gap-1"><Check className="h-3 w-3" /> Add</Button>
                  </div>
                </div>
              )}

              {activePIRs.length === 0 && !showAddPIR ? (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
                  <div className="text-center">
                    <Target className="mx-auto h-6 w-6" style={{ color: '#4A4A4A' }} />
                    <p className="mt-2 text-[12px]" style={{ color: '#7C7C7C' }}>No intelligence requirements defined. Add your first question.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 stagger-enter">
                  {activePIRs.map(pir => {
                    const Icon = CATEGORY_ICONS[pir.category] || Target
                    return (
                      <div key={pir.id} className="card-hover rounded-xl p-4" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${PRIORITY_COLORS[pir.priority]}15` }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: PRIORITY_COLORS[pir.priority] }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{pir.question}</p>
                            <div className="mt-1.5 flex items-center gap-3">
                              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ backgroundColor: `${PRIORITY_COLORS[pir.priority]}20`, color: PRIORITY_COLORS[pir.priority] }}>{pir.priority}</span>
                              <span className="text-[10px]" style={{ color: '#7C7C7C' }}>{pir.category}</span>
                              <span className="text-[10px]" style={{ color: '#7C7C7C' }}>Confidence: {pir.confidence_level}%</span>
                            </div>
                            {pir.answer_summary && <p className="mt-2 text-[11px]" style={{ color: '#A0A0A0' }}>{pir.answer_summary}</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ FIELD REPORTS TAB ═══ */}
          {tab === 'field_reports' && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <p className="text-[12px]" style={{ color: '#7C7C7C' }}>
                  Log what you hear, see, and learn from conversations. This is your most valuable intelligence.
                </p>
                <Button size="sm" onClick={() => setShowAddReport(true)} className="gap-1"><Plus className="h-3 w-3" /> Log intel</Button>
              </div>

              {showAddReport && (
                <div className="rounded-xl p-4" style={{ backgroundColor: '#1C1C1C', border: '1px solid #6366F1' }}>
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" style={{ color: '#6366F1' }} />
                    <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>New Field Report</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>HUMINT</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <select value={newReport.source_type} onChange={e => setNewReport({ ...newReport, source_type: e.target.value })} className="rounded-md border px-2 py-1.5 text-[12px]" style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
                      <option value="conversation">Conversation</option>
                      <option value="meeting">Meeting</option>
                      <option value="phone_call">Phone Call</option>
                      <option value="site_visit">Site Visit</option>
                      <option value="event">Event</option>
                      <option value="observation">Observation</option>
                    </select>
                    <select value={newReport.source_person_id} onChange={e => {
                      const arch = architects.find(a => a.id === e.target.value)
                      setNewReport({ ...newReport, source_person_id: e.target.value, source_person_name: arch?.name || '' })
                    }} className="rounded-md border px-2 py-1.5 text-[12px]" style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
                      <option value="">Person (optional)</option>
                      {architects.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <Input value={newReport.source_person_name} onChange={e => setNewReport({ ...newReport, source_person_name: e.target.value })} placeholder="Or type name" />
                  </div>
                  <div className="relative">
                    <Textarea
                      value={newReport.raw_notes}
                      onChange={e => setNewReport({ ...newReport, raw_notes: e.target.value })}
                      placeholder="What did you hear, see, or learn? Be specific: names, projects, dollar amounts, timelines, competitor mentions, frustrations expressed..."
                      rows={4}
                    />
                    <button
                      onClick={listening ? stopVoice : startVoice}
                      className="absolute bottom-2 right-2 rounded-lg p-1.5"
                      style={{ backgroundColor: listening ? 'rgba(239,68,68,0.15)' : '#141414', color: listening ? '#EF4444' : '#7C7C7C' }}
                    >
                      {listening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowAddReport(false)}>Cancel</Button>
                    <Button size="sm" onClick={submitFieldReport} disabled={processing} className="gap-1">
                      {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      {processing ? 'Processing...' : 'Submit & Process'}
                    </Button>
                  </div>
                </div>
              )}

              {reports.length === 0 && !showAddReport ? (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
                  <div className="text-center">
                    <FileText className="mx-auto h-6 w-6" style={{ color: '#4A4A4A' }} />
                    <p className="mt-2 text-[12px]" style={{ color: '#7C7C7C' }}>No field reports yet. Log your first conversation.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 stagger-enter">
                  {reports.map(report => (
                    <div key={report.id} className="card-hover rounded-xl p-4" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>HUMINT</span>
                          <span className="text-[11px] font-medium" style={{ color: '#E8E8F0' }}>{report.source_type.replace('_', ' ')}</span>
                          {report.source_person_name && <span className="text-[11px]" style={{ color: '#818CF8' }}>{report.source_person_name}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {report.actionable && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>ACTIONABLE</span>}
                          <span className="text-[10px]" style={{ color: '#4A4A4A' }}>{new Date(report.report_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {report.ai_summary ? (
                        <p className="mt-2 text-[12px]" style={{ color: '#A0A0A0' }}>{report.ai_summary}</p>
                      ) : (
                        <p className="mt-2 text-[12px]" style={{ color: '#7C7C7C' }}>{report.raw_notes.slice(0, 200)}{report.raw_notes.length > 200 ? '...' : ''}</p>
                      )}
                      {report.relationship_signals && report.relationship_signals.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {report.relationship_signals.map((sig: any, i: number) => (
                            <span key={i} className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: '#141414', color: '#F59E0B', border: '1px solid #2A2A2A' }}>
                              {sig.signal?.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ ENGAGEMENTS TAB ═══ */}
          {tab === 'engagements' && (
            <div className="flex flex-col gap-3">
              <p className="text-[12px]" style={{ color: '#7C7C7C' }}>
                Track every opportunity from detection through outcome. Find, Fix, Finish, Exploit, Analyze.
              </p>

              {/* F3EAD stage headers */}
              <div className="grid grid-cols-5 gap-2">
                {F3EAD_STAGES.map(stage => {
                  const stageCount = activeCycles.filter(c => c.cycle_status === stage).length
                  return (
                    <div key={stage} className="text-center">
                      <div className="mb-1 flex items-center justify-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[stage] }} />
                        <span className="text-[11px] font-semibold uppercase" style={{ color: STATUS_COLORS[stage], letterSpacing: '0.5px' }}>{stage}</span>
                      </div>
                      <span className="metric-number text-[18px]" style={{ color: '#E8E8F0' }}>{stageCount}</span>
                    </div>
                  )
                })}
              </div>

              {/* Engagement cards */}
              {activeCycles.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
                  <div className="text-center">
                    <Crosshair className="mx-auto h-6 w-6" style={{ color: '#4A4A4A' }} />
                    <p className="mt-2 text-[12px]" style={{ color: '#7C7C7C' }}>No active engagements. Scan for opportunities or log a field report to start one.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 stagger-enter">
                  {activeCycles.map(cycle => {
                    const stageIdx = F3EAD_STAGES.indexOf(cycle.cycle_status)
                    const nextStage = stageIdx < F3EAD_STAGES.length - 1 ? F3EAD_STAGES[stageIdx + 1] : 'complete'
                    return (
                      <div key={cycle.id} className="card-hover rounded-xl p-4" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A', borderLeft: `3px solid ${STATUS_COLORS[cycle.cycle_status]}` }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{cycle.target_name}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ backgroundColor: `${STATUS_COLORS[cycle.cycle_status]}20`, color: STATUS_COLORS[cycle.cycle_status] }}>{cycle.cycle_status}</span>
                              <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: `${PRIORITY_COLORS[cycle.priority]}15`, color: PRIORITY_COLORS[cycle.priority] }}>{cycle.priority}</span>
                              <span className="text-[10px]" style={{ color: '#7C7C7C' }}>{cycle.target_type} via {cycle.trigger_type}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCycleStatus(cycle.id, nextStage)}
                            className="gap-1 text-[11px]"
                            style={{ borderColor: STATUS_COLORS[nextStage], color: STATUS_COLORS[nextStage] }}
                          >
                            <ArrowRight className="h-3 w-3" /> {nextStage.toUpperCase()}
                          </Button>
                        </div>
                        {cycle.next_action && (
                          <p className="mt-2 flex items-center gap-1 text-[11px]" style={{ color: '#6366F1' }}>
                            <ChevronRight className="h-3 w-3" /> {cycle.next_action}
                          </p>
                        )}
                        {cycle.intel_captured && (
                          <p className="mt-1 text-[11px]" style={{ color: '#A0A0A0' }}>{cycle.intel_captured}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
