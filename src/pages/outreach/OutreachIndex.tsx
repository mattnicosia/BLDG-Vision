import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { Mail, Send, Clock, FileText, Calendar, User } from 'lucide-react'

interface DraftRecord {
  id: string
  architect_id?: string
  type: string
  subject?: string
  body: string
  outcome?: string
  sent_at?: string
  created_at: string
}

interface CampaignRecord {
  id: string
  architect_name?: string
  series_type?: string
  topic?: string
  status: string
  created_at: string
}

export function OutreachIndex() {
  const { org } = useOrg()
  const [tab, setTab] = useState<'sent' | 'drafts' | 'campaigns'>('sent')
  const [drafts, setDrafts] = useState<DraftRecord[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const [draftResult, campaignResult] = await Promise.all([
      supabase
        .from('ai_drafts')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('email_campaigns')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (draftResult.data) setDrafts(draftResult.data)
    if (campaignResult.data) setCampaigns(campaignResult.data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const sentDrafts = drafts.filter((d) => d.outcome === 'sent')
  const pendingDrafts = drafts.filter((d) => d.outcome !== 'sent' && d.outcome !== 'discarded')

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Outreach</h1>
        <p className="text-sm text-muted-foreground">
          {sentDrafts.length} sent, {pendingDrafts.length} drafts, {campaigns.length} campaigns
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-4 border-b border-border">
        {([
          { key: 'sent', label: `Sent (${sentDrafts.length})` },
          { key: 'drafts', label: `Drafts (${pendingDrafts.length})` },
          { key: 'campaigns', label: `Campaigns (${campaigns.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="pb-2 text-sm font-medium transition-colors"
            style={{
              color: tab === t.key ? '#0F6E56' : '#71717a',
              borderBottom: tab === t.key ? '2px solid #0F6E56' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sent */}
      {tab === 'sent' && (
        <div className="flex flex-col gap-2">
          {sentDrafts.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <Send className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No emails sent yet. Draft outreach from any relationship profile.</p>
            </div>
          ) : (
            sentDrafts.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-white p-4" style={{ borderWidth: '0.5px' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Send className="h-3 w-3" style={{ color: '#0F6E56' }} />
                      <span className="text-sm font-medium">{d.subject || d.type}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.body}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {d.sent_at ? formatDate(d.sent_at) : formatDate(d.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Drafts */}
      {tab === 'drafts' && (
        <div className="flex flex-col gap-2">
          {pendingDrafts.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No pending drafts</p>
            </div>
          ) : (
            pendingDrafts.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-white p-4" style={{ borderWidth: '0.5px' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{d.subject || d.type}</span>
                      {d.outcome && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {d.outcome}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.body}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(d.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Campaigns */}
      {tab === 'campaigns' && (
        <div className="flex flex-col gap-2">
          {campaigns.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <Mail className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No campaigns yet. Schedule an email series from a relationship profile.</p>
            </div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-white p-4" style={{ borderWidth: '0.5px' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{c.series_type}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                        style={{
                          backgroundColor: c.status === 'active' ? '#E1F5EE' : c.status === 'completed' ? '#F1EFE8' : '#FAEEDA',
                          color: c.status === 'active' ? '#085041' : c.status === 'completed' ? '#5F5E5A' : '#854F0B',
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {c.architect_name && (
                        <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" /> {c.architect_name}</span>
                      )}
                      {c.topic && <span>{c.topic}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
