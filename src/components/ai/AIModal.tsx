import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { generateOutreach, generateBrief, sendEmail, saveDraft, updateDraftOutcome } from '@/lib/ai'
import { useEmailSettings } from '@/hooks/useEmailSettings'
import { Copy, Check, Sparkles, FileText, Send, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import type { AIDraftMode } from '@/types'

interface AIModalProps {
  architectId: string
  architectName: string
  architectEmail?: string
  open: boolean
  onClose: () => void
  onSent?: () => void
}

export function AIModal({ architectId, architectName, architectEmail, open, onClose, onSent }: AIModalProps) {
  const { settings: emailSettings } = useEmailSettings()
  const [mode, setMode] = useState<AIDraftMode>('outreach')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)

  // Send state
  const [subject, setSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setResult('')
      setError('')
      setSubject('')
      setEditedBody('')
      setIsEditing(false)
      setSending(false)
      setSent(false)
      setDraftId(null)
      setCopied(false)
    }
  }, [open])

  async function generate(selectedMode: AIDraftMode) {
    setMode(selectedMode)
    setResult('')
    setError('')
    setSubject('')
    setEditedBody('')
    setIsEditing(false)
    setSent(false)
    setDraftId(null)
    setLoading(true)

    const fn = selectedMode === 'outreach' ? generateOutreach : generateBrief
    const { text, error: err } = await fn(architectId)

    if (err) {
      setError(err)
    } else {
      setResult(text)
      setEditedBody(text)

      // Auto-extract subject from outreach
      if (selectedMode === 'outreach') {
        setSubject(`Following up - ${architectName}`)
      }

      // Persist draft
      const id = await saveDraft({
        architect_id: architectId,
        type: selectedMode,
        body: text,
      })
      setDraftId(id)
    }
    setLoading(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(isEditing ? editedBody : result)
    setCopied(true)
    if (draftId) updateDraftOutcome(draftId, 'copied')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSend() {
    if (!architectEmail) {
      toast.error('No email address for this architect')
      return
    }
    if (!subject) {
      toast.error('Subject is required')
      return
    }

    setSending(true)
    const body = isEditing ? editedBody : result
    const bodyHtml = body.replace(/\n/g, '<br>')

    const { success, error: sendError } = await sendEmail({
      to_email: architectEmail,
      subject,
      body_html: bodyHtml,
      architect_id: architectId,
      draft_id: draftId ?? undefined,
    })

    if (success) {
      setSent(true)
      toast.success(`Email sent to ${architectName}`)
      if (draftId) updateDraftOutcome(draftId, 'sent', isEditing ? editedBody : undefined)
      onSent?.()
    } else {
      toast.error(sendError || 'Failed to send')
    }
    setSending(false)
  }

  function handleClose() {
    if (draftId && !sent && result) {
      updateDraftOutcome(draftId, 'discarded')
    }
    onClose()
  }

  const currentBody = isEditing ? editedBody : result
  const isOutreach = mode === 'outreach'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI for {architectName}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={mode === 'outreach' ? 'default' : 'outline'}
            size="sm"
            onClick={() => generate('outreach')}
            disabled={loading}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Draft outreach
          </Button>
          <Button
            variant={mode === 'brief' ? 'default' : 'outline'}
            size="sm"
            onClick={() => generate('brief')}
            disabled={loading}
            className="gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Generate brief
          </Button>
        </div>

        {/* Subject field (outreach only) */}
        {result && isOutreach && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
        )}

        {/* Draft body */}
        <div className="min-h-[160px] rounded-lg bg-muted/50 p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Generating...</p>
            </div>
          ) : error ? (
            <p className="text-sm" style={{ color: '#A32D2D' }}>{error}</p>
          ) : result ? (
            isEditing ? (
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={8}
                className="border-0 bg-transparent p-0 text-sm leading-relaxed focus-visible:ring-0"
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {result}
              </p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose an action above to generate content for {architectName}.
            </p>
          )}
        </div>

        {/* Signature preview (outreach only) */}
        {result && isOutreach && emailSettings?.signature_html && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Signature</label>
            <div
              className="rounded-lg border border-border bg-white p-3 text-xs"
              dangerouslySetInnerHTML={{ __html: emailSettings.signature_html }}
            />
          </div>
        )}

        {result && isOutreach && !emailSettings?.signature_html && (
          <p className="text-[10px] text-muted-foreground">
            No email signature configured. Set one up in Settings.
          </p>
        )}

        {/* Action buttons */}
        {result && (
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" /> Done editing
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {isOutreach && (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || sent || !architectEmail || !subject}
                className="gap-1.5"
                title={!architectEmail ? 'No email address for this architect' : ''}
              >
                {sent ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Sent
                  </>
                ) : sending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Send
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
