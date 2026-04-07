import { useState, useEffect } from 'react'
import { useEmailSettings } from '@/hooks/useEmailSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Check, Pencil } from 'lucide-react'
import { toast } from 'sonner'

function buildSignatureHtml(name: string, title: string, phone: string, email: string, logoUrl: string): string {
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333333;line-height:1.4">
<tr><td style="padding-bottom:8px">
${logoUrl ? `<img src="${logoUrl}" alt="" height="40" style="height:40px;display:block" />` : ''}
</td></tr>
<tr><td style="font-weight:bold;font-size:14px">${name}</td></tr>
${title ? `<tr><td style="color:#666666">${title}</td></tr>` : ''}
${phone ? `<tr><td style="padding-top:4px">${phone}</td></tr>` : ''}
${email ? `<tr><td><a href="mailto:${email}" style="color:#0F6E56;text-decoration:none">${email}</a></td></tr>` : ''}
</table>`
}

export function EmailSignatureSettings() {
  const { settings, loading, save } = useEmailSettings()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sender identity
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')

  // Signature mode
  const [sigMode, setSigMode] = useState<'html_paste' | 'builder'>('html_paste')
  const [pastedHtml, setPastedHtml] = useState('')

  // Builder fields
  const [bName, setBName] = useState('')
  const [bTitle, setBTitle] = useState('')
  const [bPhone, setBPhone] = useState('')
  const [bEmail, setBEmail] = useState('')
  const [bLogo, setBLogo] = useState('')

  useEffect(() => {
    if (settings) {
      setFromEmail(settings.from_email ?? '')
      setFromName(settings.from_name ?? '')
      setSigMode(settings.signature_type ?? 'html_paste')
      setPastedHtml(settings.signature_html ?? '')
      setBName(settings.builder_name ?? '')
      setBTitle(settings.builder_title ?? '')
      setBPhone(settings.builder_phone ?? '')
      setBEmail(settings.builder_email ?? '')
      setBLogo(settings.builder_logo_url ?? '')
    }
  }, [settings])

  const currentSignatureHtml = sigMode === 'html_paste'
    ? pastedHtml
    : buildSignatureHtml(bName, bTitle, bPhone, bEmail, bLogo)

  async function handleSave() {
    setSaving(true)
    const { error } = await save({
      from_email: fromEmail || undefined,
      from_name: fromName || undefined,
      signature_type: sigMode,
      signature_html: currentSignatureHtml || undefined,
      builder_name: bName || undefined,
      builder_title: bTitle || undefined,
      builder_phone: bPhone || undefined,
      builder_email: bEmail || undefined,
      builder_logo_url: bLogo || undefined,
    })
    setSaving(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Email settings saved')
      setEditing(false)
    }
  }

  if (loading) return null

  return (
    <div className="rounded-xl border border-border bg-white p-5" style={{ borderWidth: '0.5px' }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium">Email settings</h2>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          {/* Sender identity */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">Sender identity</label>
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-[10px] text-muted-foreground">From name</label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Matt Nicosia" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-[10px] text-muted-foreground">From email</label>
                <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="m.nicosia@montanacontracting.com" />
              </div>
            </div>
          </div>

          {/* Signature mode tabs */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">Email signature</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSigMode('html_paste')}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: sigMode === 'html_paste' ? '#0F6E56' : 'transparent',
                  color: sigMode === 'html_paste' ? '#fff' : '#71717a',
                  border: `1px solid ${sigMode === 'html_paste' ? '#0F6E56' : '#e4e4e7'}`,
                }}
              >
                Paste from Outlook
              </button>
              <button
                onClick={() => setSigMode('builder')}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: sigMode === 'builder' ? '#0F6E56' : 'transparent',
                  color: sigMode === 'builder' ? '#fff' : '#71717a',
                  border: `1px solid ${sigMode === 'builder' ? '#0F6E56' : '#e4e4e7'}`,
                }}
              >
                Build signature
              </button>
            </div>
          </div>

          {sigMode === 'html_paste' ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={pastedHtml}
                onChange={(e) => setPastedHtml(e.target.value)}
                placeholder="Paste your Outlook signature HTML here..."
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                In Outlook: File &gt; Options &gt; Mail &gt; Signatures. Select your signature, Ctrl+A, Ctrl+C, paste here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input value={bName} onChange={(e) => setBName(e.target.value)} placeholder="Full name" />
              <Input value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="Title (e.g., VP of Operations)" />
              <Input value={bPhone} onChange={(e) => setBPhone(e.target.value)} placeholder="Phone" />
              <Input value={bEmail} onChange={(e) => setBEmail(e.target.value)} placeholder="Email" />
              <Input value={bLogo} onChange={(e) => setBLogo(e.target.value)} placeholder="Logo URL (optional)" />
            </div>
          )}

          {/* Preview */}
          {currentSignatureHtml && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Preview</label>
              <div
                className="rounded-lg border border-border bg-white p-3"
                dangerouslySetInnerHTML={{ __html: currentSignatureHtml }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {settings?.from_email ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm">{settings.from_name ?? ''} &lt;{settings.from_email}&gt;</p>
              {settings.signature_html && (
                <div className="mt-2 flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Signature</label>
                  <div
                    className="rounded-lg border border-border bg-white p-3"
                    dangerouslySetInnerHTML={{ __html: settings.signature_html }}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No email configured yet. Click Edit to set up your sender identity and signature.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
