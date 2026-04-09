import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { useNavigate } from 'react-router-dom'
import { getPulseColor } from '@/lib/pulse'
import { STAGE_STYLES } from '@/types'
import { Search, User, Phone, Mail, Globe, Clock, ChevronRight } from 'lucide-react'
import type { Architect } from '@/types'

export function QuickProfile() {
  const { org } = useOrg()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Architect[]>([])
  const [selected, setSelected] = useState<Architect | null>(null)
  const [touchpoints, setTouchpoints] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); setOpen(true); setSelected(null); setQuery('') }
      if (e.key === 'Escape') { setOpen(false); setSelected(null) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

  useEffect(() => {
    if (!org || !query || query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('architects').select('*').eq('org_id', org.id).or(`name.ilike.%${query}%,firm.ilike.%${query}%`).order('pulse_score', { ascending: false }).limit(8)
      if (data) setResults(data)
    }, 200)
    return () => clearTimeout(t)
  }, [query, org])

  useEffect(() => {
    if (!selected || !org) return
    Promise.all([
      supabase.from('architect_touchpoints').select('type, notes, contacted_at').eq('architect_id', selected.id).order('contacted_at', { ascending: false }).limit(3),
      supabase.from('kb_projects').select('name, budget_value').eq('org_id', org.id).ilike('architect_name', `%${selected.name.split(' ')[0]}%`).limit(5),
    ]).then(([tRes, pRes]) => { if (tRes.data) setTouchpoints(tRes.data); if (pRes.data) setProjects(pRes.data) })
  }, [selected, org])

  if (!open) return null
  const pulseColor = selected ? getPulseColor(selected.pulse_score) : '#7C7C7C'
  const stageStyle = selected ? STAGE_STYLES[selected.stage] : null

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => { setOpen(false); setSelected(null) }} />
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl page-enter" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: '#2A2A2A' }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: '#6366F1' }} />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }} placeholder="Search any person..." className="flex-1 bg-transparent text-[14px] outline-none" style={{ color: '#E8E8F0' }} />
          <kbd className="rounded px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: '#141414', color: '#4A4A4A' }}>ESC</kbd>
        </div>

        {!selected && results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {results.map(a => (
              <button key={a.id} onClick={() => setSelected(a)} className="nav-item flex w-full items-center gap-3 border-b px-4 py-2.5 text-left" style={{ borderColor: '#2A2A2A' }}>
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getPulseColor(a.pulse_score) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: '#E8E8F0' }}>{a.name}</p>
                  {a.firm && a.firm !== a.name && <p className="text-[11px] truncate" style={{ color: '#7C7C7C' }}>{a.firm}</p>}
                </div>
                <span className="metric-number text-[12px]" style={{ color: getPulseColor(a.pulse_score) }}>{a.pulse_score}</span>
                <ChevronRight className="h-3 w-3" style={{ color: '#4A4A4A' }} />
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold" style={{ color: '#E8E8F0' }}>{selected.name}</h2>
                {selected.firm && selected.firm !== selected.name && <p className="text-[12px]" style={{ color: '#7C7C7C' }}>{selected.firm}</p>}
              </div>
              <div className="flex items-center gap-2">
                {stageStyle && <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: stageStyle.bg, color: stageStyle.text }}>{selected.stage}</span>}
                <div className="text-center">
                  <p className="metric-number text-[22px] leading-none" style={{ color: pulseColor }}>{selected.pulse_score}</p>
                  <p className="text-[8px] uppercase" style={{ color: '#7C7C7C' }}>Pulse</p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg p-2" style={{ backgroundColor: '#141414' }}><p className="text-[9px] uppercase" style={{ color: '#7C7C7C' }}>Projects</p><p className="metric-number text-[16px]" style={{ color: '#06B6D4' }}>{selected.projects_together}</p></div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#141414' }}><p className="text-[9px] uppercase" style={{ color: '#7C7C7C' }}>Value</p><p className="metric-number text-[16px]" style={{ color: '#06B6D4' }}>{selected.referral_value ? `$${(selected.referral_value / 1000000).toFixed(1)}M` : '--'}</p></div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#141414' }}><p className="text-[9px] uppercase" style={{ color: '#7C7C7C' }}>Last contact</p><p className="text-[12px] font-medium" style={{ color: selected.last_contact_date ? '#E8E8F0' : '#EF4444' }}>{selected.last_contact_date ? `${Math.floor((Date.now() - new Date(selected.last_contact_date).getTime()) / 86400000)}d ago` : 'Never'}</p></div>
            </div>
            {(selected.email || selected.phone) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px]" style={{ backgroundColor: '#141414', color: '#818CF8' }}><Mail className="h-3 w-3" /> {selected.email}</a>}
                {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px]" style={{ backgroundColor: '#141414', color: '#E8E8F0' }}><Phone className="h-3 w-3" /> {selected.phone}</a>}
                {selected.website && <a href={selected.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px]" style={{ backgroundColor: '#141414', color: '#7C7C7C' }}><Globe className="h-3 w-3" /> Web</a>}
              </div>
            )}
            {touchpoints.length > 0 && <div className="mt-3"><p className="mb-1 text-[9px] uppercase" style={{ color: '#7C7C7C' }}>Recent interactions</p>{touchpoints.map((tp, i) => <div key={i} className="flex items-center gap-2 py-0.5 text-[11px]" style={{ color: '#A0A0A0' }}><Clock className="h-2.5 w-2.5" style={{ color: '#4A4A4A' }} /><span>{tp.type} {new Date(tp.contacted_at).toLocaleDateString()}</span></div>)}</div>}
            {projects.length > 0 && <div className="mt-3"><p className="mb-1 text-[9px] uppercase" style={{ color: '#7C7C7C' }}>Projects together</p>{projects.map((p, i) => <div key={i} className="flex items-center justify-between py-0.5 text-[11px]"><span style={{ color: '#E8E8F0' }}>{p.name}</span>{p.budget_value && <span className="metric-number" style={{ color: '#06B6D4' }}>${(p.budget_value / 1000000).toFixed(1)}M</span>}</div>)}</div>}
            <div className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: '#2A2A2A' }}>
              <button onClick={() => { navigate(`/relationships/${selected.id}`); setOpen(false) }} className="nav-item flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium" style={{ backgroundColor: '#6366F1', color: '#fff' }}><User className="h-3 w-3" /> Full profile</button>
              {selected.phone && <a href={`tel:${selected.phone}`} className="nav-item flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium" style={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', color: '#E8E8F0' }}><Phone className="h-3 w-3" /> Call</a>}
            </div>
          </div>
        )}
        {!selected && !query && <div className="px-4 py-4 text-center"><p className="text-[11px]" style={{ color: '#4A4A4A' }}>Type a name to see everything in 3 seconds</p></div>}
      </div>
    </>
  )
}
