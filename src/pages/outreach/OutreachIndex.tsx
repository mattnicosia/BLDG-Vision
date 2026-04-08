import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { useArchitects } from '@/hooks/useArchitects'
import { ComposeEmail } from '@/components/outreach/ComposeEmail'
import { AISuggestions } from '@/components/outreach/AISuggestions'
import { CampaignManager } from '@/components/outreach/CampaignManager'
import { SentEmails } from '@/components/outreach/SentEmails'
import { EmailTemplates } from '@/components/outreach/EmailTemplates'
import { Button } from '@/components/ui/button'
import { EmailSeriesModal } from '@/components/ai/EmailSeriesModal'
import { Pencil, Sparkles, Send, Mail, FileText, Plus } from 'lucide-react'
import type { Architect, AIDraft, Signal, EmailCampaign, CampaignEmail, EmailTemplate } from '@/types'

export function OutreachIndex() {
  const { org } = useOrg()
  const { architects } = useArchitects()
  const [tab, setTab] = useState<'suggestions' | 'sent' | 'drafts' | 'campaigns' | 'templates'>('suggestions')
  const [loading, setLoading] = useState(true)

  // Data
  const [drafts, setDrafts] = useState<AIDraft[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [campaignEmails, setCampaignEmails] = useState<CampaignEmail[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])

  // Campaign creation state
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [campaignArchitect, setCampaignArchitect] = useState<Architect | undefined>()

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeRecipient, setComposeRecipient] = useState<Architect | undefined>()
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeDraftId, setComposeDraftId] = useState<string | undefined>()

  const fetchData = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const [draftRes, signalRes, campRes, campEmailRes, templateRes] = await Promise.all([
      supabase.from('ai_drafts').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('signals').select('*').eq('org_id', org.id).is('actioned_at', null).is('dismissed_at', null).order('created_at', { ascending: false }).limit(20),
      supabase.from('email_campaigns').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('campaign_emails').select('*').eq('org_id', org.id).order('sequence_number'),
      supabase.from('email_templates').select('*').eq('org_id', org.id).order('created_at', { ascending: false }),
    ])
    if (draftRes.data) setDrafts(draftRes.data)
    if (signalRes.data) setSignals(signalRes.data)
    if (campRes.data) setCampaigns(campRes.data)
    if (campEmailRes.data) setCampaignEmails(campEmailRes.data)
    if (templateRes.data) setTemplates(templateRes.data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const sentDrafts = drafts.filter((d) => d.outcome === 'sent')
  const pendingDrafts = drafts.filter((d) => d.outcome !== 'sent' && d.outcome !== 'discarded' && d.body)

  function openCompose(recipient?: Architect, subject?: string, body?: string, draftId?: string) {
    setComposeRecipient(recipient)
    setComposeSubject(subject ?? '')
    setComposeBody(body ?? '')
    setComposeDraftId(draftId)
    setComposeOpen(true)
  }

  function handleSuggestionDraft(architect: Architect, _reason: string) {
    openCompose(architect)
  }

  function handleCreateCampaign(architect?: Architect) {
    if (architect) {
      setCampaignArchitect(architect)
      setShowCampaignModal(true)
    } else {
      // No architect pre-selected, open with first available
      setCampaignArchitect(undefined)
      setShowCampaignModal(true)
    }
  }

  function handleUseTemplate(template: EmailTemplate) {
    openCompose(undefined, template.subject_template ?? '', template.body_template)
  }

  function handleResumeDraft(draft: AIDraft) {
    const arch = draft.architect_id ? architects.find((a) => a.id === draft.architect_id) : undefined
    openCompose(arch, draft.subject ?? '', draft.edited_body || draft.body, draft.id)
  }

  const tabs = [
    { key: 'suggestions', label: 'Suggestions', icon: Sparkles },
    { key: 'sent', label: `Sent (${sentDrafts.length})`, icon: Send },
    { key: 'drafts', label: `Drafts (${pendingDrafts.length})`, icon: FileText },
    { key: 'campaigns', label: `Campaigns (${campaigns.length})`, icon: Mail },
    { key: 'templates', label: `Templates (${templates.length})`, icon: FileText },
  ] as const

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Outreach</h1>
          <p className="text-sm text-muted-foreground">
            {sentDrafts.length} sent, {pendingDrafts.length} drafts, {campaigns.length} campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleCreateCampaign()} className="gap-2">
            <Plus className="h-4 w-4" /> New campaign
          </Button>
          <Button onClick={() => openCompose()} className="gap-2">
            <Pencil className="h-4 w-4" /> Compose
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-4 border-b border-border">
        {tabs.map((t) => (
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

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          {tab === 'suggestions' && (
            <AISuggestions
              architects={architects}
              sentDrafts={sentDrafts}
              signals={signals}
              onGenerateDraft={handleSuggestionDraft}
              onCreateCampaign={handleCreateCampaign}
            />
          )}

          {tab === 'sent' && (
            <SentEmails sentDrafts={sentDrafts} architects={architects} />
          )}

          {tab === 'drafts' && (
            <div className="flex flex-col gap-2">
              {pendingDrafts.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No pending drafts</p>
                </div>
              ) : (
                pendingDrafts.map((draft) => {
                  const arch = draft.architect_id ? architects.find((a) => a.id === draft.architect_id) : null
                  return (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-white p-3"
                      style={{ borderWidth: '0.5px' }}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{draft.subject || draft.type}</span>
                        {arch && <span className="ml-2 text-xs text-muted-foreground">to {arch.name}</span>}
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{draft.body}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeDraft(draft)}
                        className="ml-3 shrink-0 gap-1"
                      >
                        <Pencil className="h-3 w-3" /> Resume
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {tab === 'campaigns' && (
            <CampaignManager
              campaigns={campaigns}
              campaignEmails={campaignEmails}
              onRefresh={fetchData}
            />
          )}

          {tab === 'templates' && (
            <EmailTemplates
              templates={templates}
              onUseTemplate={handleUseTemplate}
              onRefresh={fetchData}
            />
          )}
        </>
      )}

      {/* Compose sheet */}
      <ComposeEmail
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={fetchData}
        architects={architects}
        initialRecipient={composeRecipient}
        initialSubject={composeSubject}
        initialBody={composeBody}
        resumeDraftId={composeDraftId}
      />

      {/* Campaign creation modal */}
      {showCampaignModal && (
        <EmailSeriesModal
          architectId={campaignArchitect?.id ?? architects[0]?.id ?? ''}
          architectName={campaignArchitect?.name}
          architectEmail={campaignArchitect?.email}
          open={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          onScheduled={() => {
            setShowCampaignModal(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
