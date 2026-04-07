import { useState, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useEmailSettings } from '@/hooks/useEmailSettings'
import { sendEmail, generateOutreach, saveDraft, updateDraftOutcome } from '@/lib/ai'
import { Sparkles, Send, Save, Search, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Architect } from '@/types'
import { getInitials, getAvatarColor } from '@/types'

interface ComposeEmailProps {
  open: boolean
  onClose: () => void
  onSent: () => void
  architects: Architect[]
  initialRecipient?: Architect
  initialSubject?: string
  initialBody?: string
  resumeDraftId?: string
}

export function ComposeEmail({
  open,
  onClose,
  onSent,
  architects,
  initialRecipient,
  initialSubject = '',
  initialBody = '',
  resumeDraftId,
}: ComposeEmailProps) {
  const { settings: emailSettings } = useEmailSettings()
  const [recipient, setRecipient] = useState<Architect | null>(initialRecipient ?? null)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [draftId, setDraftId] = useState<string | null>(resumeDraftId ?? null)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const filteredArchitects = useMemo(() => {
    if (!recipientSearch) return architects.filter((a) => a.email).slice(0, 8)
    const q = recipientSearch.toLowerCase()
    return architects.filter(
      (a) =>
        (a.name.toLowerCase().includes(q) ||
          (a.firm?.toLowerCase().includes(q) ?? false) ||
          (a.email?.toLowerCase().includes(q) ?? false)) &&
        a.email
    ).slice(0, 8)
  }, [architects, recipientSearch])

  function selectRecipient(arch: Architect) {
    setRecipient(arch)
    setRecipientSearch('')
    setShowRecipientDropdown(false)
  }

  async function handleGenerateAI() {
    if (!recipient) {
      toast.error('Select a recipient first')
      return
    }
    setGenerating(true)
    const { text, error } = await generateOutreach(recipient.id)
    if (error) {
      toast.error(error)
    } else {
      setBody(text)
      if (!subject) setSubject(`Following up - ${recipient.name}`)
      // Auto-save draft
      const id = await saveDraft({
        architect_id: recipient.id,
        type: 'outreach',
        subject: subject || `Following up - ${recipient.name}`,
        body: text,
      })
      if (id) setDraftId(id)
    }
    setGenerating(false)
  }

  async function handleSaveDraft() {
    if (!body) return
    if (draftId) {
      await updateDraftOutcome(draftId, 'copied', body)
      toast.success('Draft saved')
    } else {
      const id = await saveDraft({
        architect_id: recipient?.id,
        type: 'outreach',
        subject,
        body,
      })
      if (id) {
        setDraftId(id)
        toast.success('Draft saved')
      }
    }
    onClose()
  }

  async function handleSend() {
    if (!recipient?.email || !subject || !body) {
      toast.error('Recipient, subject, and body are required')
      return
    }
    setSending(true)
    const bodyHtml = body.replace(/\n/g, '<br>')
    const { success, error } = await sendEmail({
      to_email: recipient.email,
      subject,
      body_html: bodyHtml,
      architect_id: recipient.id,
      draft_id: draftId ?? undefined,
    })
    if (success) {
      setSent(true)
      toast.success(`Email sent to ${recipient.name}`)
      if (draftId) updateDraftOutcome(draftId, 'sent', body)
      onSent()
      setTimeout(onClose, 1000)
    } else {
      toast.error(error || 'Failed to send')
    }
    setSending(false)
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Compose email</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          {/* Recipient */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">To</label>
            {recipient ? (
              <div className="flex items-center gap-2 rounded-lg border border-border p-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: getAvatarColor(recipient.name).bg, color: getAvatarColor(recipient.name).text }}
                >
                  {getInitials(recipient.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{recipient.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{recipient.email}</p>
                </div>
                <button onClick={() => setRecipient(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={recipientSearch}
                  onChange={(e) => {
                    setRecipientSearch(e.target.value)
                    setShowRecipientDropdown(true)
                  }}
                  onFocus={() => setShowRecipientDropdown(true)}
                  placeholder="Search by name, firm, or email..."
                  className="pl-9"
                />
                {showRecipientDropdown && filteredArchitects.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                    {filteredArchitects.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => selectRecipient(a)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium">{a.name}</span>
                        {a.firm && <span className="text-muted-foreground">({a.firm})</span>}
                        <span className="ml-auto text-xs text-muted-foreground">{a.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Body</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateAI}
                disabled={generating || !recipient}
                className="gap-1.5 text-xs"
              >
                {generating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {generating ? 'Generating...' : 'Generate with AI'}
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email or click Generate with AI..."
              rows={10}
              className="min-h-[200px]"
            />
          </div>

          {/* Signature preview */}
          {emailSettings?.signature_html && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground">Signature</label>
              <div
                className="rounded-lg border border-border bg-muted/30 p-2 text-xs"
                dangerouslySetInnerHTML={{ __html: emailSettings.signature_html }}
              />
            </div>
          )}

          {!emailSettings?.from_email && (
            <p className="text-[10px] text-muted-foreground">
              Set up your email in Settings before sending.
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!body}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save draft
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || sent || !recipient?.email || !subject || !body}
              className="gap-1.5"
            >
              {sent ? 'Sent' : sending ? 'Sending...' : (
                <>
                  <Send className="h-3.5 w-3.5" /> Send
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
