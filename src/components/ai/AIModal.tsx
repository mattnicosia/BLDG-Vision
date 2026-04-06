import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { generateOutreach, generateBrief } from '@/lib/ai'
import { Copy, Check, Sparkles, FileText } from 'lucide-react'
import type { AIDraftMode } from '@/types'

interface AIModalProps {
  architectId: string
  architectName: string
  open: boolean
  onClose: () => void
}

export function AIModal({ architectId, architectName, open, onClose }: AIModalProps) {
  const [mode, setMode] = useState<AIDraftMode>('outreach')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function generate(selectedMode: AIDraftMode) {
    setMode(selectedMode)
    setResult('')
    setError('')
    setLoading(true)

    const fn = selectedMode === 'outreach' ? generateOutreach : generateBrief
    const { text, error: err } = await fn(architectId)

    if (err) {
      setError(err)
    } else {
      setResult(text)
    }
    setLoading(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
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

        <div className="min-h-[200px] rounded-lg bg-muted/50 p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Generating...</p>
            </div>
          ) : error ? (
            <p className="text-sm" style={{ color: '#A32D2D' }}>
              {error}
            </p>
          ) : result ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {result}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose an action above to generate content for {architectName}.
            </p>
          )}
        </div>

        {result && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
