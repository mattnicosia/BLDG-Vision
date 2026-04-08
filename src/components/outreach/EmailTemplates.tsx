import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, FileText, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { EmailTemplate, TemplateCategory } from '@/types'
import { TEMPLATE_CATEGORY_LABELS } from '@/types'

const CATEGORY_STYLES: Record<TemplateCategory, { bg: string; text: string }> = {
  introduction: { bg: '#E1F5EE', text: '#085041' },
  follow_up: { bg: '#FAEEDA', text: '#854F0B' },
  project_showcase: { bg: '#EEEDFE', text: '#3C3489' },
  ve_case_study: { bg: '#F1EFE8', text: '#5F5E5A' },
  custom: { bg: '#F1EFE8', text: '#5F5E5A' },
}

interface EmailTemplatesProps {
  templates: EmailTemplate[]
  onUseTemplate: (template: EmailTemplate) => void
  onRefresh: () => void
}

export function EmailTemplates({ templates, onUseTemplate, onRefresh }: EmailTemplatesProps) {
  const { org } = useOrg()
  const [showAdd, setShowAdd] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('introduction')
  const [subjectTemplate, setSubjectTemplate] = useState('')
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = templates.filter((t) => categoryFilter === 'all' || t.category === categoryFilter)

  async function handleSave() {
    if (!org || !name || !bodyTemplate) return
    setSaving(true)
    const { error } = await supabase.from('email_templates').insert({
      org_id: org.id,
      name,
      category,
      subject_template: subjectTemplate || null,
      body_template: bodyTemplate,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Template saved')
      setName('')
      setSubjectTemplate('')
      setBodyTemplate('')
      setShowAdd(false)
      onRefresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    await supabase.from('email_templates').delete().eq('id', id)
    toast.success('Template deleted')
    onRefresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['all', 'introduction', 'follow_up', 'project_showcase', 've_case_study', 'custom'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors"
              style={{
                backgroundColor: categoryFilter === cat ? '#0F6E56' : 'transparent',
                color: categoryFilter === cat ? '#fff' : '#71717a',
                border: `1px solid ${categoryFilter === cat ? '#0F6E56' : '#e4e4e7'}`,
              }}
            >
              {cat === 'all' ? 'All' : TEMPLATE_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New template
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {templates.length === 0 ? 'No templates yet. Save one to reuse across contacts.' : 'No templates match this filter.'}
          </p>
        </div>
      ) : (
        filtered.map((template) => {
          const catStyle = CATEGORY_STYLES[template.category] ?? CATEGORY_STYLES.custom
          return (
            <div
              key={template.id}
              className="flex items-start justify-between rounded-xl border border-border bg-[#1A1A24] p-4"
              style={{ borderWidth: '0.5px' }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{template.name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                  >
                    {TEMPLATE_CATEGORY_LABELS[template.category]}
                  </span>
                </div>
                {template.subject_template && (
                  <p className="mt-0.5 text-xs text-muted-foreground">Subject: {template.subject_template}</p>
                )}
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.body_template}</p>
              </div>
              <div className="ml-3 flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUseTemplate(template)}
                  className="gap-1"
                >
                  <Send className="h-3 w-3" /> Use
                </Button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* Add template dialog */}
      {showAdd && (
        <Dialog open onOpenChange={() => setShowAdd(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New template</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                className="rounded-md border border-border bg-[#1A1A24] px-3 py-2 text-sm"
              >
                {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <Input value={subjectTemplate} onChange={(e) => setSubjectTemplate(e.target.value)} placeholder="Subject line (optional)" />
              <Textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)} placeholder="Email body template..." rows={6} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={!name || !bodyTemplate || saving}>
                  {saving ? 'Saving...' : 'Save template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
