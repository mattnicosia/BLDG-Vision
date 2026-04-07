import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { useAuth } from '@/hooks/useAuth'
import { useOpportunities } from '@/hooks/useOpportunities'
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Zap,
  DollarSign,
  Target,
  Calendar,
  ArrowRight,
  User,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPulseColor } from '@/lib/pulse'
import type { Architect, Signal } from '@/types'

export function DashboardIndex() {
  const { org } = useOrg()
  const { user } = useAuth()
  const { metrics } = useOpportunities()
  const [coolingArchitects, setCoolingArchitects] = useState<Architect[]>([])
  const [recentSignals, setRecentSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const fetchData = useCallback(async () => {
    if (!org) return
    setLoading(true)

    const [archResult, signalResult] = await Promise.all([
      // Architects with low or dropping pulse
      supabase
        .from('architects')
        .select('*')
        .eq('org_id', org.id)
        .lt('pulse_score', 50)
        .order('pulse_score', { ascending: true })
        .limit(5),
      // Recent signals
      supabase
        .from('signals')
        .select('*')
        .eq('org_id', org.id)
        .is('actioned_at', null)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (archResult.data) setCoolingArchitects(archResult.data)
    if (signalResult.data) setRecentSignals(signalResult.data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-medium">{greeting}, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Pipeline snapshot */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <Link
          to="/pipeline"
          className="rounded-xl border border-border bg-white p-4 transition-colors hover:bg-muted/30"
          style={{ borderWidth: '0.5px' }}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" /> Pipeline
          </div>
          <p className="mt-1 text-lg font-medium">
            ${(metrics.pipelineValue / 1000000).toFixed(1)}M
          </p>
          <p className="text-[10px] text-muted-foreground">{metrics.pipelineCount} active deals</p>
        </Link>
        <Link
          to="/pipeline"
          className="rounded-xl border border-border bg-white p-4 transition-colors hover:bg-muted/30"
          style={{ borderWidth: '0.5px' }}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Weighted
          </div>
          <p className="mt-1 text-lg font-medium">
            ${(metrics.weightedValue / 1000000).toFixed(1)}M
          </p>
          <p className="text-[10px] text-muted-foreground">Expected revenue</p>
        </Link>
        <div className="rounded-xl border border-border bg-white p-4" style={{ borderWidth: '0.5px' }}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3 w-3" /> Win rate
          </div>
          <p className="mt-1 text-lg font-medium">{metrics.winRate}%</p>
          <p className="text-[10px] text-muted-foreground">{metrics.wonCount} won / {metrics.lostCount} lost</p>
        </div>
        <Link
          to="/opportunities"
          className="rounded-xl border border-border bg-white p-4 transition-colors hover:bg-muted/30"
          style={{ borderWidth: '0.5px' }}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" /> Signals
          </div>
          <p className="mt-1 text-lg font-medium">{recentSignals.length}</p>
          <p className="text-[10px] text-muted-foreground">Unactioned</p>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Relationships needing attention */}
        <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" style={{ color: '#BA7517' }} />
              Relationships cooling
            </h2>
            <Link to="/relationships" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {coolingArchitects.length === 0 ? (
            <p className="text-sm text-muted-foreground">All relationships are healthy</p>
          ) : (
            <div className="flex flex-col gap-2">
              {coolingArchitects.map((arch) => {
                const days = arch.last_contact_date
                  ? Math.floor((Date.now() - new Date(arch.last_contact_date).getTime()) / 86400000)
                  : null
                return (
                  <Link
                    key={arch.id}
                    to={`/crm/${arch.id}`}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-2 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: getPulseColor(arch.pulse_score) }}
                      />
                      <span className="text-sm">{arch.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {days !== null && <span>{days}d ago</span>}
                      <span className="font-medium" style={{ color: getPulseColor(arch.pulse_score) }}>
                        {arch.pulse_score}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent signals */}
        <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" style={{ color: '#0F6E56' }} />
              Recent signals
            </h2>
            <Link to="/opportunities" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentSignals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new signals</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-start gap-2 rounded-lg bg-muted/50 p-2"
                >
                  <div
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        signal.priority === 'high' ? '#A32D2D' : signal.priority === 'medium' ? '#BA7517' : '#0F6E56',
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm leading-tight">{signal.headline}</p>
                    {signal.source && (
                      <p className="text-[10px] text-muted-foreground">{signal.source}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3">
        <Link to="/opportunities">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" /> Check new permits
          </Button>
        </Link>
        <Link to="/pipeline">
          <Button variant="outline" className="gap-2">
            <DollarSign className="h-4 w-4" /> View pipeline
          </Button>
        </Link>
        <Link to="/relationships">
          <Button variant="outline" className="gap-2">
            <User className="h-4 w-4" /> Browse relationships
          </Button>
        </Link>
      </div>
    </div>
  )
}
