import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { useAuth } from '@/hooks/useAuth'
import { useOpportunities } from '@/hooks/useOpportunities'
import {
  AlertTriangle, TrendingUp, Zap, DollarSign, Target,
  ArrowRight, User, FileText, RefreshCw, Shield, MapPin,
  Briefcase, Eye, Clock, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPulseColor } from '@/lib/pulse'
import { toast } from 'sonner'
import type { Architect, Signal } from '@/types'

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  relationship: User,
  opportunity: Eye,
  competitive: Shield,
  pipeline: Briefcase,
  market: MapPin,
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#06B6D4',
}

interface BriefItem {
  priority: string
  title: string
  body: string
  action: string
  category: string
}

interface DailyBrief {
  id: string
  summary: string
  priority_items: BriefItem[]
  metrics: Record<string, number>
  data_sources: Record<string, number>
  generated_at: string
  brief_date: string
}

export function DashboardIndex() {
  const { org } = useOrg()
  const { user } = useAuth()
  const { metrics } = useOpportunities()
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [coolingArchitects, setCoolingArchitects] = useState<Architect[]>([])
  const [recentSignals, setRecentSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const fetchData = useCallback(async () => {
    if (!org) return
    setLoading(true)

    const [archResult, signalResult, briefResult] = await Promise.all([
      supabase.from('architects').select('*').eq('org_id', org.id).lt('pulse_score', 50).order('pulse_score', { ascending: true }).limit(5),
      supabase.from('signals').select('*').eq('org_id', org.id).is('actioned_at', null).is('dismissed_at', null).order('created_at', { ascending: false }).limit(5),
      supabase.from('daily_briefs').select('*').eq('org_id', org.id).order('brief_date', { ascending: false }).limit(1),
    ])

    if (archResult.data) setCoolingArchitects(archResult.data)
    if (signalResult.data) setRecentSignals(signalResult.data)
    if (briefResult.data?.[0]) setBrief(briefResult.data[0])
    setLoading(false)
  }, [org])

  useEffect(() => { fetchData() }, [fetchData])

  async function generateBrief() {
    setBriefLoading(true)
    toast('Generating intelligence brief...')
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/daily-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': anonKey },
        body: JSON.stringify({ force: true }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.brief) {
        setBrief(data.brief)
        toast.success('Brief generated')
      }
    } catch (err: any) {
      toast.error(err.message || 'Brief generation failed')
    }
    setBriefLoading(false)
  }

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p style={{ color: '#7C7C7C' }}>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl page-enter">
      {/* Greeting + Generate button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#E8E8F0' }}>
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: '#7C7C7C' }}>
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateBrief}
          disabled={briefLoading}
          className="gap-2"
          style={{ backgroundColor: '#1C1C1C', borderColor: '#2A2A2A', color: '#E8E8F0' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${briefLoading ? 'animate-spin' : ''}`} />
          {briefLoading ? 'Generating...' : brief ? 'Refresh brief' : 'Generate brief'}
        </Button>
      </div>

      {/* Morning Brief */}
      {brief && (
        <div
          className="mb-6 rounded-xl p-5"
          style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }}>
                <FileText className="h-4 w-4" style={{ color: '#6366F1' }} />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold" style={{ color: '#E8E8F0' }}>Intelligence Brief</h2>
                <p className="text-[11px]" style={{ color: '#7C7C7C' }}>
                  Generated {new Date(brief.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {brief.data_sources && ` from ${Object.values(brief.data_sources).reduce((a: number, b: any) => a + (Number(b) || 0), 0)} data points`}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <p className="mb-4 text-[14px] leading-relaxed" style={{ color: '#A0A0A0' }}>
            {brief.summary}
          </p>

          {/* Priority items */}
          <div className="flex flex-col gap-2">
            {(Array.isArray(brief.priority_items) ? brief.priority_items : []).map((item: BriefItem, i: number) => {
              const Icon = CATEGORY_ICONS[item.category] || Eye
              const dotColor = PRIORITY_COLORS[item.priority] || '#7C7C7C'
              return (
                <div
                  key={i}
                  className="rounded-lg p-3"
                  style={{
                    backgroundColor: '#141414',
                    borderLeft: `3px solid ${dotColor}`,
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: '#A0A0A0' }}>
                        {item.body}
                      </p>
                      {item.action && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium" style={{ color: '#6366F1' }}>
                          <ChevronRight className="h-3 w-3" /> {item.action}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                      style={{ backgroundColor: `${dotColor}20`, color: dotColor }}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Strategic note */}
          {brief.priority_items && typeof (brief as any).strategic_note === 'string' && (brief as any).strategic_note && (
            <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: '#141414', borderLeft: '3px solid #6366F1' }}>
              <p className="text-[12px] italic leading-relaxed" style={{ color: '#A0A0A0' }}>
                {(brief as any).strategic_note}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pipeline snapshot */}
      <div className="mb-6 grid grid-cols-4 gap-3 stagger-enter">
        {[
          { to: '/pipeline', icon: DollarSign, label: 'Pipeline', value: `$${(metrics.pipelineValue / 1000000).toFixed(1)}M`, sub: `${metrics.pipelineCount} active deals`, valueColor: '#06B6D4' },
          { to: '/pipeline', icon: TrendingUp, label: 'Weighted', value: `$${(metrics.weightedValue / 1000000).toFixed(1)}M`, sub: 'Expected revenue', valueColor: '#06B6D4' },
          { to: '/pipeline', icon: Target, label: 'Win rate', value: `${metrics.winRate}%`, sub: `${metrics.wonCount} won / ${metrics.lostCount} lost`, valueColor: '#818CF8' },
          { to: '/opportunities', icon: Zap, label: 'Signals', value: String(recentSignals.length), sub: 'Unactioned', valueColor: '#F59E0B' },
        ].map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="card-hover rounded-xl p-5"
            style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>
              <card.icon className="h-3.5 w-3.5" />
              {card.label}
            </div>
            <p className="metric-number mt-2 text-[28px] leading-none" style={{ color: card.valueColor }}>
              {card.value}
            </p>
            <p className="mt-1.5 text-[11px]" style={{ color: '#4A4A4A' }}>{card.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 stagger-enter">
        {/* Relationships needing attention */}
        <div className="card-hover rounded-xl p-5" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
              </div>
              Relationships cooling
            </h2>
            <Link to="/relationships" className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#6366F1' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {coolingArchitects.length === 0 ? (
            <p className="text-[13px]" style={{ color: '#7C7C7C' }}>All relationships are healthy</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {coolingArchitects.map((arch) => {
                const days = arch.last_contact_date ? Math.floor((Date.now() - new Date(arch.last_contact_date).getTime()) / 86400000) : null
                const pulseColor = getPulseColor(arch.pulse_score)
                return (
                  <Link key={arch.id} to={`/relationships/${arch.id}`} className="nav-item flex items-center justify-between rounded-lg p-2.5" style={{ backgroundColor: '#141414' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#161616' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#141414' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: pulseColor, boxShadow: `0 0 6px ${pulseColor}` }} />
                      <div>
                        <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{arch.name}</span>
                        {arch.firm && arch.firm !== arch.name && <span className="ml-1.5 text-[11px]" style={{ color: '#4A4A4A' }}>{arch.firm}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      {days !== null && <span style={{ color: '#4A4A4A' }}>{days}d ago</span>}
                      <span className="metric-number font-medium" style={{ color: pulseColor }}>{arch.pulse_score}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent signals */}
        <div className="card-hover rounded-xl p-5" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }}>
                <Zap className="h-3.5 w-3.5" style={{ color: '#6366F1' }} />
              </div>
              Recent signals
            </h2>
            <Link to="/opportunities" className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#6366F1' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentSignals.length === 0 ? (
            <p className="text-[13px]" style={{ color: '#7C7C7C' }}>No new signals</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recentSignals.map((signal) => {
                const dotColor = signal.priority === 'high' ? '#EF4444' : signal.priority === 'medium' ? '#F59E0B' : '#06B6D4'
                return (
                  <div key={signal.id} className="flex items-start gap-2.5 rounded-lg p-2.5" style={{ backgroundColor: '#141414' }}>
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                    <div className="min-w-0">
                      <p className="text-[13px] leading-tight" style={{ color: '#E8E8F0' }}>{signal.headline}</p>
                      {signal.source && <p className="mt-0.5 text-[11px]" style={{ color: '#4A4A4A' }}>{signal.source}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3 stagger-enter">
        <Link to="/opportunities">
          <Button variant="outline" className="nav-item gap-2 text-[13px]" style={{ backgroundColor: '#1C1C1C', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
            <FileText className="h-4 w-4" /> Opportunities
          </Button>
        </Link>
        <Link to="/pipeline">
          <Button variant="outline" className="nav-item gap-2 text-[13px]" style={{ backgroundColor: '#1C1C1C', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
            <DollarSign className="h-4 w-4" /> Pipeline
          </Button>
        </Link>
        <Link to="/relationships">
          <Button variant="outline" className="nav-item gap-2 text-[13px]" style={{ backgroundColor: '#1C1C1C', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
            <User className="h-4 w-4" /> Relationships
          </Button>
        </Link>
      </div>
    </div>
  )
}
