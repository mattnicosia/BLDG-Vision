import { useState, useEffect, useMemo } from 'react'
import { useEmailSettings } from '@/hooks/useEmailSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Check, Pencil, ArrowUp, ArrowDown, Plus, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

interface SignatureItem {
  id: string
  type: 'logo' | 'name' | 'title' | 'phone' | 'email' | 'website' | 'custom_link' | 'divider' | 'text'
  label: string
  value: string
  url?: string
  logoHeight?: number
}

const ITEM_TYPES = [
  { type: 'logo', label: 'Logo' },
  { type: 'name', label: 'Name' },
  { type: 'title', label: 'Title' },
  { type: 'phone', label: 'Phone' },
  { type: 'email', label: 'Email' },
  { type: 'website', label: 'Website' },
  { type: 'custom_link', label: 'Custom link' },
  { type: 'divider', label: 'Divider line' },
  { type: 'text', label: 'Custom text' },
] as const

function generateId() {
  return Math.random().toString(36).slice(2, 8)
}

function buildSignatureHtmlFromItems(items: SignatureItem[]): string {
  const rows = items.map((item) => {
    switch (item.type) {
      case 'logo':
        if (!item.value) return ''
        const h = item.logoHeight || 40
        return `<tr><td style="padding-bottom:8px"><img src="${item.value}" alt="" height="${h}" style="height:${h}px;display:block" /></td></tr>`
      case 'name':
        if (!item.value) return ''
        return `<tr><td style="font-weight:bold;font-size:14px;padding-top:2px">${item.value}</td></tr>`
      case 'title':
        if (!item.value) return ''
        return `<tr><td style="color:#666666">${item.value}</td></tr>`
      case 'phone':
        if (!item.value) return ''
        return `<tr><td style="padding-top:2px"><a href="tel:${item.value.replace(/[^0-9+]/g, '')}" style="color:#333333;text-decoration:none">${item.value}</a></td></tr>`
      case 'email':
        if (!item.value) return ''
        return `<tr><td><a href="mailto:${item.value}" style="color:#0F6E56;text-decoration:none">${item.value}</a></td></tr>`
      case 'website':
        if (!item.value) return ''
        const href = item.value.startsWith('http') ? item.value : `https://${item.value}`
        const display = item.value.replace(/^https?:\/\//, '').replace(/\/$/, '')
        return `<tr><td><a href="${href}" style="color:#0F6E56;text-decoration:none">${display}</a></td></tr>`
      case 'custom_link':
        if (!item.value || !item.url) return ''
        const linkHref = item.url.startsWith('http') ? item.url : `https://${item.url}`
        return `<tr><td><a href="${linkHref}" style="color:#0F6E56;text-decoration:none">${item.value}</a></td></tr>`
      case 'divider':
        return `<tr><td style="padding:6px 0"><hr style="border:none;border-top:1px solid #e4e4e7;margin:0" /></td></tr>`
      case 'text':
        if (!item.value) return ''
        return `<tr><td style="color:#999999;font-size:11px">${item.value}</td></tr>`
      default:
        return ''
    }
  }).filter(Boolean)

  if (rows.length === 0) return ''
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333333;line-height:1.5">\n${rows.join('\n')}\n</table>`
}

function defaultItems(): SignatureItem[] {
  return [
    { id: generateId(), type: 'logo', label: 'Logo', value: '', logoHeight: 40 },
    { id: generateId(), type: 'name', label: 'Name', value: '' },
    { id: generateId(), type: 'title', label: 'Title', value: '' },
    { id: generateId(), type: 'phone', label: 'Phone', value: '' },
    { id: generateId(), type: 'email', label: 'Email', value: '' },
  ]
}

export function EmailSignatureSettings() {
  const { settings, loading, save } = useEmailSettings()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [sigMode, setSigMode] = useState<'html_paste' | 'builder'>('html_paste')
  const [pastedHtml, setPastedHtml] = useState('')
  const [items, setItems] = useState<SignatureItem[]>(defaultItems())

  useEffect(() => {
    if (settings) {
      setFromEmail(settings.from_email ?? '')
      setFromName(settings.from_name ?? '')
      setSigMode(settings.signature_type ?? 'html_paste')
      setPastedHtml(settings.signature_html ?? '')
      // Rebuild items from saved fields
      const saved: SignatureItem[] = []
      if (settings.builder_logo_url) saved.push({ id: generateId(), type: 'logo', label: 'Logo', value: settings.builder_logo_url, logoHeight: 40 })
      if (settings.builder_name) saved.push({ id: generateId(), type: 'name', label: 'Name', value: settings.builder_name })
      if (settings.builder_title) saved.push({ id: generateId(), type: 'title', label: 'Title', value: settings.builder_title })
      if (settings.builder_phone) saved.push({ id: generateId(), type: 'phone', label: 'Phone', value: settings.builder_phone })
      if (settings.builder_email) saved.push({ id: generateId(), type: 'email', label: 'Email', value: settings.builder_email })
      if (saved.length > 0) setItems(saved)
    }
  }, [settings])

  const currentSignatureHtml = useMemo(() => {
    return sigMode === 'html_paste' ? pastedHtml : buildSignatureHtmlFromItems(items)
  }, [sigMode, pastedHtml, items])

  function moveItem(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return
    const next = [...items]
    ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
    setItems(next)
  }

  function updateItem(id: string, updates: Partial<SignatureItem>) {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  function removeItem(id: string) {
    setItems(items.filter((item) => item.id !== id))
  }

  function addItem(type: SignatureItem['type']) {
    const labels: Record<string, string> = {
      logo: 'Logo', name: 'Name', title: 'Title', phone: 'Phone', email: 'Email',
      website: 'Website', custom_link: 'Link', divider: 'Divider', text: 'Text',
    }
    setItems([...items, {
      id: generateId(),
      type,
      label: labels[type] || type,
      value: type === 'divider' ? '' : '',
      url: type === 'custom_link' ? '' : undefined,
      logoHeight: type === 'logo' ? 40 : undefined,
    }])
  }

  async function handleSave() {
    setSaving(true)
    const nameItem = items.find((i) => i.type === 'name')
    const titleItem = items.find((i) => i.type === 'title')
    const phoneItem = items.find((i) => i.type === 'phone')
    const emailItem = items.find((i) => i.type === 'email')
    const logoItem = items.find((i) => i.type === 'logo')

    const { error } = await save({
      from_email: fromEmail || undefined,
      from_name: fromName || undefined,
      signature_type: sigMode,
      signature_html: currentSignatureHtml || undefined,
      builder_name: nameItem?.value || undefined,
      builder_title: titleItem?.value || undefined,
      builder_phone: phoneItem?.value || undefined,
      builder_email: emailItem?.value || undefined,
      builder_logo_url: logoItem?.value || undefined,
    })
    setSaving(false)
    if (error) toast.error(error)
    else { toast.success('Email settings saved'); setEditing(false) }
  }

  if (loading) return null

  return (
    <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
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
              <button onClick={() => setSigMode('html_paste')} className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: sigMode === 'html_paste' ? '#0F6E56' : 'transparent', color: sigMode === 'html_paste' ? '#fff' : '#71717a', border: `1px solid ${sigMode === 'html_paste' ? '#0F6E56' : '#e4e4e7'}` }}>
                Paste from Outlook
              </button>
              <button onClick={() => setSigMode('builder')} className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: sigMode === 'builder' ? '#0F6E56' : 'transparent', color: sigMode === 'builder' ? '#fff' : '#71717a', border: `1px solid ${sigMode === 'builder' ? '#0F6E56' : '#e4e4e7'}` }}>
                Build signature
              </button>
            </div>
          </div>

          {sigMode === 'html_paste' ? (
            <div className="flex flex-col gap-2">
              <Textarea value={pastedHtml} onChange={(e) => setPastedHtml(e.target.value)} placeholder="Paste your Outlook signature HTML here..." rows={6} className="font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground">
                In Outlook: File &gt; Options &gt; Mail &gt; Signatures. Select your signature, Ctrl+A, Ctrl+C, paste here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Signature items - reorderable */}
              <div className="flex flex-col gap-1.5">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-2" style={{ borderWidth: '0.5px' }}>
                    {/* Reorder controls */}
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="text-muted-foreground hover:text-[#E8E8F0] disabled:opacity-20">
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} className="text-muted-foreground hover:text-[#E8E8F0] disabled:opacity-20">
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Item content */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">{item.label}</span>

                      {item.type === 'divider' ? (
                        <hr className="border-border" />
                      ) : item.type === 'logo' ? (
                        <div className="flex flex-col gap-1">
                          <Input value={item.value} onChange={(e) => updateItem(item.id, { value: e.target.value })} placeholder="Logo image URL" className="text-xs" />
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] text-muted-foreground">Height (px):</label>
                            <Input type="number" value={item.logoHeight ?? 40} onChange={(e) => updateItem(item.id, { logoHeight: parseInt(e.target.value) || 40 })} className="w-20 text-xs" min={16} max={120} />
                          </div>
                        </div>
                      ) : item.type === 'custom_link' ? (
                        <div className="flex flex-col gap-1">
                          <Input value={item.value} onChange={(e) => updateItem(item.id, { value: e.target.value })} placeholder="Link text (e.g., Listen to our podcast)" className="text-xs" />
                          <Input value={item.url ?? ''} onChange={(e) => updateItem(item.id, { url: e.target.value })} placeholder="URL (e.g., https://podcast.example.com)" className="text-xs" />
                        </div>
                      ) : (
                        <Input value={item.value} onChange={(e) => updateItem(item.id, { value: e.target.value })} placeholder={item.label} className="text-xs" />
                      )}
                    </div>

                    {/* Remove button */}
                    <button onClick={() => removeItem(item.id)} className="pt-1 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item */}
              <div className="flex flex-wrap gap-1">
                <span className="self-center text-[10px] text-muted-foreground mr-1">Add:</span>
                {ITEM_TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => addItem(t.type)}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-[#E8E8F0]"
                  >
                    + {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {currentSignatureHtml && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Preview</label>
              <div className="rounded-lg border border-border bg-[#1C1C1C] p-3" dangerouslySetInnerHTML={{ __html: currentSignatureHtml }} />
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
                  <div className="rounded-lg border border-border bg-[#1C1C1C] p-3" dangerouslySetInnerHTML={{ __html: settings.signature_html }} />
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
