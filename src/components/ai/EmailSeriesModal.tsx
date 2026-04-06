import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Mail, RefreshCw } from 'lucide-react'
import { generateEmailSeries } from '@/lib/ai'

const SERIES_TYPES = [
  'Introduction',
  'Re-engagement',
  'Post-meeting follow-up',
  'VE showcase',
  'Project update',
  'Seasonal check-in',
]

interface Props {
  architectId?: string
  architectName?: string
  open: boolean
  onClose: () => void
}

function parseEmails(text: string): string[] {
  // Try splitting on "Email 1", "Email 2", "Email 3" patterns
  const byNumber = text.split(/(?=Email\s+\d)/i).filter((s) => s.trim())
  if (byNumber.length >= 3) return byNumber

  // Try splitting on "---" separators
  const byDash = text.split(/\n-{3,}\n/).filter((s) => s.trim())
  if (byDash.length >= 3) return byDash

  // Fallback: return as single block
  return [text]
}

export function EmailSeriesModal({ architectName, open, onClose }: Props) {
  const [seriesType, setSeriesType] = useState(SERIES_TYPES[0])
  const [topic, setTopic] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setEmails([])

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
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                {SERIES_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
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

            {error && (
              <p className="text-sm" style={{ color: '#A32D2D' }}>
                {error}
              </p>
            )}

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
                className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4"
                style={{ borderWidth: '0.5px' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Email {i + 1} of {emails.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(i)}
                    className="gap-1"
                  >
                    {copiedIndex === i ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {email.trim()}
                </p>
              </div>
            ))}

            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                className="gap-1.5"
              >
                {copiedIndex === -1 ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied all
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy all
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
