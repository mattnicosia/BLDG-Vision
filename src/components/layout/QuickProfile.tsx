import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { Search, User, Phone, Mail, Building2, X, Zap, ChevronRight } from 'lucide-react'
import { getPulseColor } from '@/lib/pulse'
import { STAGE_STYLES } from '@/types'
import type { Architect } from '@/types'

interface QuickProfileProps {
  open: boolean
  onClose: () => void
}

export function QuickProfile({ open, onClose }: QuickProfileProps) {
  const { org } = useOrg()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Architect[]>([])
  const [selected, setSelected] = useState<Architect | null>(null)
  const [touchpoints, setTouchpoints] = useState<Array<{ type: string; notes: string; contacted_at: string }>>([])
  const [connections, setConnections] = useState<Array<{ name: string; type: string; count: number }>>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults([])
      setSelected(null)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!org || q.length < 2) { setResults([]); return }
    const { data } = await supabase
      .from('architects')
      .select('*')
      .eq('org_id', org.id)
      .or(`name.ilike.%${q}%,firm.ilike.%${q}%`)
      .order('pulse_score', { ascending: false })
      .limit(8)
    if (data) setResults(data)
  }, [org])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  async function selectPerson(arch: Architect) {
    setSelected(arch)
    // Fetch touchpoints
    const { data: tp } = await supabase
      .from('architect_touchpoints')
      .select('type, notes, contacted_at')
      .eq('architect_id', arch.id)
      .order('contacted_at', { ascending: false })
      .limit(3)
    if (tp) setTouchpoints(tp)

    // Fetch connections from person_connections
    const { data: conns } = await supabase
      .from('person_connections')
      .select('person_a_name, person_a_type, person_b_name, person_b_type, project_count')
      .or(`person_a_name.ilike.%${arch.name}%,person_b_name.ilike.%${arch.name}%`)
      .limit(10)
    if (conns) {
      setConnections(conns.map(c => {
        const isA = c.person_a_name.toLowerCase().includes(arch.name.toLowerCase())
        return {
          name: isA ? c.person_b_name : c.person_a_name,
          type: isA ? c.person_b_type : c.person_a_type,
          count: c.project_count,
        }
      }))
    }
  }

  // Keyboard: Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const pulseColor = selected ? getPulseColor(selected.pulse_score) : '#7C7C7C'
  const stageStyle = selected ? STAGE_STYLES[selected.stage] : null
  const days = selected?.last_contact_date
    ? Math.floor((Date.now() - new Date(selected.last_contact_date).getTime()) / 86400000)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl page-enter"
        style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A', boxShadow: '0 16px 64px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: '#2A2A2A' }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: '#7C7C7C' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
            placeholder="Search contacts by name or firm..."
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: '#E8E8F0' }}
          />
          <button onClick={onClose}><X className="h-4 w-4" style={{ color: '#4A4A4A' }} /></button>
        </div>

        {/* Results or selected profile */}
        {selected ? (
          <div className="p-4">
            {/* Profile header */}
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${pulseColor}40, ${pulseColor}20)`, color: pulseColor }}
              >
                {selected.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1">
                <Link
                  to={`/relationships/${selected.id}`}
                  onClick={onClose}
                  className="text-[16px] font-semibold hover:underline"
                  style={{ color: '#E8E8F0' }}
                >
                  {selected.name}
                </Link>
                {selected.firm && selected.firm !== selected.name && (
                  <p className="text-[13px]" style={{ color: '#7C7C7C' }}>{selected.firm}</p>
                )}
                <div className="mt-1 flex items-center gap-3">
                  <span className="metric-number text-[13px] font-semibold" style={{ color: pulseColor }}>
                    Pulse {selected.pulse_score}
                  </span>
                  {stageStyle && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: stageStyle.bg, color: stageStyle.text }}>
                      {selected.stage}
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: '#7C7C7C' }}>
                    {selected.projects_together} projects together
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg p-2" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] uppercase" style={{ color: '#7C7C7C' }}>Last contact</p>
                <p className="metric-number text-[14px]" style={{ color: days !== null && days > 30 ? '#EF4444' : '#E8E8F0' }}>
                  {days !== null ? `${days}d ago` : 'Never'}
                </p>
              </div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] uppercase" style={{ color: '#7C7C7C' }}>Projects</p>
                <p className="metric-number text-[14px]" style={{ color: '#06B6D4' }}>{selected.projects_together}</p>
              </div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] uppercase" style={{ color: '#7C7C7C' }}>Referral value</p>
                <p className="metric-number text-[14px]" style={{ color: '#06B6D4' }}>
                  {selected.referral_value > 0 ? `$${(selected.referral_value / 1000000).toFixed(1)}M` : '$0'}
                </p>
              </div>
            </div>

            {/* Contact info */}
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px]" style={{ backgroundColor: '#141414', color: '#818CF8' }}>
                  <Mail className="h-3 w-3" /> {selected.email}
                </a>
              )}
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px]" style={{ backgroundColor: '#141414', color: '#E8E8F0' }}>
                  <Phone className="h-3 w-3" /> {selected.phone}
                </a>
              )}
            </div>

            {/* Connections */}
            {connections.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Works with</p>
                <div className="flex flex-wrap gap-1.5">
                  {connections.map((c, i) => (
                    <span key={i} className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: '#141414', color: '#A0A0A0', border: '1px solid #2A2A2A' }}>
                      {c.name} <span style={{ color: '#4A4A4A' }}>({c.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent touchpoints */}
            {touchpoints.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Recent activity</p>
                {touchpoints.map((tp, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-[11px]" style={{ color: '#A0A0A0' }}>
                    <span style={{ color: '#4A4A4A' }}>{new Date(tp.contacted_at).toLocaleDateString()}</span>
                    <span>{tp.type}: {tp.notes || 'No notes'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <Link
                to={`/relationships/${selected.id}`}
                onClick={onClose}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium"
                style={{ backgroundColor: '#6366F1', color: '#fff' }}
              >
                Full profile <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {query.length >= 2 && results.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px]" style={{ color: '#7C7C7C' }}>No contacts found</p>
            )}
            {results.map(arch => {
              const pc = getPulseColor(arch.pulse_score)
              return (
                <button
                  key={arch.id}
                  onClick={() => selectPerson(arch)}
                  className="nav-item flex w-full items-center gap-3 px-4 py-3 text-left"
                  style={{ borderBottom: '1px solid #2A2A2A' }}
                >
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: pc, boxShadow: `0 0 6px ${pc}` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{arch.name}</p>
                    {arch.firm && arch.firm !== arch.name && (
                      <p className="text-[11px]" style={{ color: '#7C7C7C' }}>{arch.firm}</p>
                    )}
                  </div>
                  <span className="metric-number text-[12px] font-medium" style={{ color: pc }}>{arch.pulse_score}</span>
                </button>
              )
            })}
            {query.length < 2 && (
              <p className="px-4 py-6 text-center text-[13px]" style={{ color: '#4A4A4A' }}>
                Type a name to search your contacts
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
