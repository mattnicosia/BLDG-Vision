import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Mail, ChevronDown, ChevronRight, Pause, Play, XCircle, Calendar, Send, User } from 'lucide-react'
import { toast } from 'sonner'
import type { EmailCampaign, CampaignEmail } from '@/types'

interface CampaignManagerProps {
  campaigns: EmailCampaign[]
  campaignEmails: CampaignEmail[]
  onRefresh: () => void
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: '#E1F5EE', text: '#085041' },
  completed: { bg: '#F1EFE8', text: '#5F5E5A' },
  paused: { bg: '#FAEEDA', text: '#854F0B' },
  cancelled: { bg: '#FEE2E2', text: '#EF4444' },
  scheduled: { bg: '#EEEDFE', text: '#3C3489' },
  sent: { bg: '#E1F5EE', text: '#085041' },
  failed: { bg: '#FEE2E2', text: '#EF4444' },
  pending: { bg: '#F1EFE8', text: '#5F5E5A' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function CampaignManager({ campaigns, campaignEmails, onRefresh }: CampaignManagerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function pauseCampaign(id: string) {
    await supabase.from('email_campaigns').update({ status: 'paused' }).eq('id', id)
    await supabase.from('campaign_emails').update({ status: 'cancelled' }).eq('campaign_id', id).in('status', ['pending', 'scheduled'])
    toast.success('Campaign paused')
    onRefresh()
  }

  async function resumeCampaign(id: string) {
    await supabase.from('email_campaigns').update({ status: 'active' }).eq('id', id)
    // Re-schedule cancelled emails starting from today
    const emails = campaignEmails.filter((e) => e.campaign_id === id && e.status === 'cancelled')
    for (let i = 0; i < emails.length; i++) {
      const scheduledAt = new Date()
      scheduledAt.setDate(scheduledAt.getDate() + (i * 4) + 1)
      await supabase.from('campaign_emails').update({
        status: 'scheduled',
        scheduled_at: scheduledAt.toISOString(),
      }).eq('id', emails[i].id)
    }
    toast.success('Campaign resumed')
    onRefresh()
  }

  async function cancelCampaign(id: string) {
    if (!confirm('Cancel this campaign? Unsent emails will not be delivered.')) return
    await supabase.from('email_campaigns').update({ status: 'cancelled' }).eq('id', id)
    await supabase.from('campaign_emails').update({ status: 'cancelled' }).eq('campaign_id', id).in('status', ['pending', 'scheduled'])
    toast.success('Campaign cancelled')
    onRefresh()
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
        <Mail className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No campaigns yet. Create one from a relationship profile.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {campaigns.map((campaign) => {
        const isExpanded = expanded.has(campaign.id)
        const emails = campaignEmails.filter((e) => e.campaign_id === campaign.id).sort((a, b) => a.sequence_number - b.sequence_number)
        const style = STATUS_STYLES[campaign.status] ?? STATUS_STYLES.pending
        const sentCount = emails.filter((e) => e.status === 'sent').length

        return (
          <div
            key={campaign.id}
            className="rounded-xl border border-border bg-[#1C1C1C]"
            style={{ borderWidth: '0.5px' }}
          >
            <button
              onClick={() => toggleExpand(campaign.id)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{campaign.series_type}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {campaign.architect_name && (
                      <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" /> {campaign.architect_name}</span>
                    )}
                    <span>{sentCount}/{emails.length} sent</span>
                    <span>{formatDate(campaign.created_at)}</span>
                  </div>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                <div className="flex flex-col gap-2">
                  {emails.map((email) => {
                    const eStyle = STATUS_STYLES[email.status] ?? STATUS_STYLES.pending
                    return (
                      <div key={email.id} className="flex items-center justify-between rounded-lg bg-[#141414] p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Email {email.sequence_number}
                          </span>
                          <span className="text-xs">{email.subject || `Email ${email.sequence_number}`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {email.scheduled_at && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(email.scheduled_at)}
                            </span>
                          )}
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize"
                            style={{ backgroundColor: eStyle.bg, color: eStyle.text }}
                          >
                            {email.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {campaign.status !== 'completed' && campaign.status !== 'cancelled' && (
                  <div className="mt-3 flex gap-2">
                    {campaign.status === 'active' && (
                      <Button variant="outline" size="sm" onClick={() => pauseCampaign(campaign.id)} className="gap-1">
                        <Pause className="h-3 w-3" /> Pause
                      </Button>
                    )}
                    {campaign.status === 'paused' && (
                      <Button variant="outline" size="sm" onClick={() => resumeCampaign(campaign.id)} className="gap-1">
                        <Play className="h-3 w-3" /> Resume
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => cancelCampaign(campaign.id)} className="gap-1 text-destructive">
                      <XCircle className="h-3 w-3" /> Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
