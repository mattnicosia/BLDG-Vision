import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Mail, RefreshCw, Calendar, Send } from 'lucide-react'
import { generateEmailSeries } from '@/lib/ai'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { toast } from 'sonner'

const SERIES_TYPES = [
  'Introduction',
  'Re-engagement',
  'Post-meeting follow-up',
  'VE showcase',
  'Project update',
  'Seasonal check-in',
]

interface Props {
  architectId: string
  architectName?: string
  architectEmail?: string
  open: boolean
  onClose: () => void
  onScheduled?: () => void
}

function parseEmails(text: string): string[] {
  const byNumber = text.split(/(?=Email\s+\d)/i).filter((s) => s.trim())
  if (byNumber.length >= 3) return byNumber

  const byDash = text.split(/\n-{3,}\n/).filter((s) => s.trim())
  if (byDash.length >= 3) return byDash

  return [text]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function EmailSeriesModal({ architectId, architectName, architectEmail, open, onClose, onScheduled }: Props) {
  const { org } = useOrg()
  const [seriesType, setSeriesType] = useState(SERIES_TYPES[0])
  const [topic, setTopic] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [firstSendDate, setFirstSendDate] = useState(
    addDays(new Date(), 1).toISOString().split('T')[0]
  )

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setEmails([])
    setScheduled(false)

    const { text, error: err } = await generateEmailSeries(seriesType, topic || seriesType)

    if (err) {
      setError(err)
    } else {
      setEmails(parseEmails(text))
    }
    setLoading(false)
  }

  function handleCopy(index: number) {
    navigator.clipboard.writeText(emails[index])
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(emails.join('\n\n---\n\n'))
    setCopiedIndex(-1)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  async function handleScheduleCampaign() {
    if (!org || !architectId) return
    setScheduling(true)

    try {
      // Create campaign
      const { data: campaign, error: campError } = await supabase
        .from('email_campaigns')
        .insert({
          org_id: org.id,
          architect_id: architectId,
          architect_name: architectName,
          series_type: seriesType,
          topic: topic || seriesType,
          status: 'active',
        })
        .select()
        .single()

      if (campError || !campaign) {
        toast.error(campError?.message || 'Failed to create campaign')
        setScheduling(false)
        return
      }

      // Create campaign emails with spacing: Day 0, Day 4, Day 9
      const baseDate = new Date(firstSendDate + 'T09:00:00')
      const spacing = [0, 4, 9]

      for (let i = 0; i < emails.length && i < 3; i++) {
        const scheduledAt = addDays(baseDate, spacing[i] ?? i * 5)

        await supabase.from('campaign_emails').insert({
          campaign_id: campaign.id,
          org_id: org.id,
          architect_id: architectId,
          subject: `${seriesType} - Email ${i + 1}`,
          body_html: emails[i].replace(/\n/g, '<br>'),
          sequence_number: i + 1,
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled',
        })
      }

      toast.success(`Campaign scheduled: ${emails.length} emails for ${architectName}`)
      setScheduled(true)
      onScheduled?.()
    } catch {
      toast.error('Failed to schedule campaign')
    }
    setScheduling(false)
  }

  const baseDate = new Date(firstSendDate + 'T09:00:00')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Email series{architectName ? ` for ${architectName}` : ''}
          </DialogTitle>
        </DialogHeader>

        {emails.length === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Series type</label>
              <select
                value={seriesType}
                onChange={(e) => setSeriesType(e.target.value)}
                className="rounded-md border border-border bg-[#1C1C1C] px-3 py-2 text-sm"
              >
                {SERIES_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Topic / angle</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Recent project completion, new capability..."
              />
            </div>

            {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}

            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              <Mail className="h-4 w-4" />
              {loading ? 'Generating 3-email series...' : 'Generate series'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {emails.map((email, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-xl border border-border bg-[#1C1C1C] p-4"
                style={{ borderWidth: '0.5px' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Email {i + 1} of {emails.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(addDays(baseDate, [0, 4, 9][i] ?? i * 5))}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(i)} className="gap-1">
                    {copiedIndex === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedIndex === i ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{email.trim()}</p>
              </div>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5">
                {copiedIndex === -1 ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedIndex === -1 ? 'Copied all' : 'Copy all'}
              </Button>
            </div>

            {/* Campaign scheduling */}
            {architectEmail && !scheduled && (
              <div className="rounded-lg border border-border p-3" style={{ borderColor: '#06B6D4', borderWidth: '0.5px' }}>
                <h4 className="mb-2 text-xs font-medium">Schedule as campaign</h4>
                <div className="flex items-end gap-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-[10px] text-muted-foreground">First send date</label>
                    <Input
                      type="date"
                      value={firstSendDate}
                      onChange={(e) => setFirstSendDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleScheduleCampaign}
                    disabled={scheduling}
                    className="gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {scheduling ? 'Scheduling...' : 'Schedule'}
                  </Button>
                </div>
                <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                  {emails.slice(0, 3).map((_, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" />
                      Email {i + 1}: {formatDate(addDays(baseDate, [0, 4, 9][i] ?? i * 5))}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {scheduled && (
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#E1F5EE' }}>
                <p className="text-xs font-medium" style={{ color: '#085041' }}>
                  Campaign scheduled for {architectName}
                </p>
              </div>
            )}

            {!architectEmail && (
              <p className="text-[10px] text-muted-foreground">
                Add an email address to this architect to schedule a campaign.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
