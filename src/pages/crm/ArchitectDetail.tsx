import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useArchitectDetail } from '@/hooks/useArchitects'
import { StageBadge } from '@/components/crm/StageBadge'
import { PulseBar } from '@/components/crm/PulseBar'
import { TouchpointLog } from '@/components/crm/TouchpointLog'
import { AIModal } from '@/components/ai/AIModal'
import { EmailSeriesModal } from '@/components/ai/EmailSeriesModal'
import { useKBProjects } from '@/hooks/useKB'
import { OpportunityPanel } from '@/components/crm/OpportunityPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getInitials, getAvatarColor, STAGE_STYLES } from '@/types'
import type { ArchitectStage } from '@/types'
import {
  ArrowLeft,
  Sparkles,
  Mail,
  Pencil,
  Check,
  X,
  Phone,
  Globe,
  MapPin,
  Trash2,
  Instagram,
  Users,
  Star,
  RefreshCw,
  Linkedin,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ArchitectContact } from '@/types'

export function ArchitectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { architect, touchpoints, loading, refetch, updateArchitect } =
    useArchitectDetail(id ?? '')
  const { projects: allProjects } = useKBProjects()
  const linkedProjects = allProjects.filter(
    (p) => p.architect_id === id || (p.architect_name && architect?.name && p.architect_name.toLowerCase() === architect.name.toLowerCase())
  )
  const [showAI, setShowAI] = useState(false)
  const [showEmailSeries, setShowEmailSeries] = useState(false)
  const [editing, setEditing] = useState(false)

  // People/contacts at this firm
  const [contacts, setContacts] = useState<ArchitectContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)

  // Fetch contacts when architect loads
  useEffect(() => {
    if (!id) return
    supabase
      .from('architect_contacts')
      .select('*')
      .eq('architect_id', id)
      .order('is_decision_maker', { ascending: false })
      .then(({ data }) => { if (data) setContacts(data) })
  }, [id])

  async function enrichPeople() {
    if (!id) return
    setEnriching(true)
    try {
      const { data, error } = await supabase.functions.invoke('enrich-people', {
        body: { architect_id: id },
      })
      if (error) throw error
      // Refetch contacts
      const { data: updated } = await supabase
        .from('architect_contacts')
        .select('*')
        .eq('architect_id', id)
        .order('is_decision_maker', { ascending: false })
      if (updated) setContacts(updated)
      // Refetch architect in case email was updated
      refetch()
    } catch (err) {
      console.error('Enrich people error:', err)
    }
    setEnriching(false)
  }

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editFirm, setEditFirm] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editStage, setEditStage] = useState<ArchitectStage>('Warm')
  const [editNotes, setEditNotes] = useState('')
  const [editNextAction, setEditNextAction] = useState('')
  const [editProjectsTogether, setEditProjectsTogether] = useState('0')
  const [editActiveLead, setEditActiveLead] = useState('')

  function startEditing() {
    if (!architect) return
    setEditName(architect.name)
    setEditFirm(architect.firm ?? '')
    setEditEmail(architect.email ?? '')
    setEditPhone(architect.phone ?? '')
    setEditLocation(architect.location ?? '')
    setEditWebsite(architect.website ?? '')
    setEditStage(architect.stage)
    setEditNotes(architect.notes ?? '')
    setEditNextAction(architect.next_action ?? '')
    setEditProjectsTogether(architect.projects_together.toString())
    setEditActiveLead(architect.active_lead ?? '')
    setEditing(true)
  }

  async function saveEdits() {
    await updateArchitect({
      name: editName,
      firm: editFirm || undefined,
      email: editEmail || undefined,
      phone: editPhone || undefined,
      location: editLocation || undefined,
      website: editWebsite || undefined,
      stage: editStage,
      notes: editNotes || undefined,
      next_action: editNextAction || undefined,
      projects_together: parseInt(editProjectsTogether) || 0,
      active_lead: editActiveLead || undefined,
      last_contact_date: new Date().toISOString(),
    })
    setEditing(false)
  }

  async function handleDelete() {
    if (!architect) return
    if (!confirm(`Delete ${architect.name}? This cannot be undone.`)) return
    await supabase.from('architects').delete().eq('id', architect.id)
    navigate('/crm')
  }

  if (loading || !architect) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          {loading ? 'Loading...' : 'Architect not found'}
        </p>
      </div>
    )
  }

  const colors = getAvatarColor(architect.name)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/crm"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#E8E8F0]"
        >
          <ArrowLeft className="h-4 w-4" /> Architects
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {getInitials(architect.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium">{architect.name}</h1>
              <StageBadge stage={architect.stage} />
            </div>
            {architect.firm && (
              <p className="text-sm text-muted-foreground">{architect.firm}</p>
            )}
            <div className="mt-1">
              <PulseBar score={architect.pulse_score} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAI(true)}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI
          </Button>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={saveEdits} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Detail panel */}
        <div className="col-span-2 flex flex-col gap-4">
          {editing ? (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Firm</label>
                  <Input value={editFirm} onChange={(e) => setEditFirm(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Location</label>
                  <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Website</label>
                  <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Stage</label>
                <div className="flex gap-2">
                  {(Object.keys(STAGE_STYLES) as ArchitectStage[]).map((s) => {
                    const style = STAGE_STYLES[s]
                    return (
                      <button
                        key={s}
                        onClick={() => setEditStage(s)}
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: editStage === s ? style.bg : 'transparent',
                          color: editStage === s ? style.text : '#7C7C7C',
                          border: `1px solid ${editStage === s ? style.border : '#2A2A2A'}`,
                        }}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Projects together</label>
                  <Input
                    type="number"
                    value={editProjectsTogether}
                    onChange={(e) => setEditProjectsTogether(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Active lead</label>
                  <Input value={editActiveLead} onChange={(e) => setEditActiveLead(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Next action</label>
                <Input value={editNextAction} onChange={(e) => setEditNextAction(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="gap-1 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete architect
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
              <div className="grid grid-cols-2 gap-4">
                {architect.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{architect.email}</span>
                  </div>
                )}
                {architect.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{architect.phone}</span>
                  </div>
                )}
                {architect.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{architect.location}</span>
                  </div>
                )}
                {architect.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <a
                      href={architect.website.startsWith('http') ? architect.website : `https://${architect.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {architect.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}
              </div>

              {/* Social links */}
              {(architect.instagram_handle || architect.linkedin_url || architect.houzz_url) && (
                <div className="flex flex-wrap gap-2">
                  {architect.instagram_handle && (
                    <a
                      href={`https://instagram.com/${architect.instagram_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-[#141414] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-[#E8E8F0]"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      @{architect.instagram_handle.replace('@', '')}
                    </a>
                  )}
                  {architect.linkedin_url && (
                    <a
                      href={architect.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-[#141414] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-[#E8E8F0]"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn
                    </a>
                  )}
                  {architect.houzz_url && (
                    <a
                      href={architect.houzz_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-[#141414] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-[#E8E8F0]"
                    >
                      Houzz
                    </a>
                  )}
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[#141414] p-3">
                  <p className="text-xs text-muted-foreground">Projects together</p>
                  <p className="text-lg font-medium">{architect.projects_together}</p>
                </div>
                <div className="rounded-lg bg-[#141414] p-3">
                  <p className="text-xs text-muted-foreground">Referral value</p>
                  <p className="text-lg font-medium">
                    ${(architect.referral_value / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className="rounded-lg bg-[#141414] p-3">
                  <p className="text-xs text-muted-foreground">Tier</p>
                  <p className="text-lg font-medium">{architect.tier}</p>
                </div>
              </div>

              {architect.next_action && (
                <div className="rounded-lg border border-border p-3" style={{ borderWidth: '0.5px', borderColor: '#FAC775' }}>
                  <p className="text-xs text-muted-foreground">Next action</p>
                  <p className="text-sm">{architect.next_action}</p>
                </div>
              )}

              {architect.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm">{architect.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Touchpoint log */}
          <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
            <TouchpointLog
              architectId={architect.id}
              touchpoints={touchpoints}
              onAdd={refetch}
            />
          </div>
        </div>

        {/* Sidebar quick info */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-[#1C1C1C] p-4" style={{ borderWidth: '0.5px' }}>
            <h3 className="mb-3 text-sm font-medium">Quick actions</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setShowAI(true)
                }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Draft outreach
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setShowAI(true)
                }}
              >
                <Sparkles className="h-3.5 w-3.5" /> Generate brief
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setShowEmailSeries(true)}
              >
                <Mail className="h-3.5 w-3.5" /> Email series
              </Button>
            </div>
          </div>

          {/* Relationship Intelligence */}
          <div className="rounded-xl border border-border bg-[#1C1C1C] p-4" style={{ borderWidth: '0.5px' }}>
            <h3 className="mb-3 text-sm font-medium">Relationship intelligence</h3>
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Tone</label>
                <select
                  value={architect.tone || 'professional'}
                  onChange={async (e) => {
                    await updateArchitect({ tone: e.target.value })
                  }}
                  className="mt-0.5 w-full rounded-md border px-2 py-1.5 text-[12px]"
                  style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
                >
                  <option value="casual">Casual (first name, informal)</option>
                  <option value="friendly">Friendly (warm, personable)</option>
                  <option value="professional">Professional (polished, clear)</option>
                  <option value="formal">Formal (structured, credentials)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Cadence</label>
                <select
                  value={architect.cadence || 'quarterly'}
                  onChange={async (e) => {
                    await updateArchitect({ cadence: e.target.value })
                  }}
                  className="mt-0.5 w-full rounded-md border px-2 py-1.5 text-[12px]"
                  style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="biannual">Twice a year</option>
                  <option value="annual">Annually</option>
                  <option value="event_driven">Only when relevant</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Contact type</label>
                <select
                  value={architect.contact_type || 'architect'}
                  onChange={async (e) => {
                    await updateArchitect({ contact_type: e.target.value })
                  }}
                  className="mt-0.5 w-full rounded-md border px-2 py-1.5 text-[12px]"
                  style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
                >
                  <option value="architect">Architect</option>
                  <option value="attorney">Land Use Attorney</option>
                  <option value="developer">Developer</option>
                  <option value="engineer">Engineer</option>
                  <option value="owner">Property Owner</option>
                  <option value="realtor">Realtor</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Communication notes</label>
                <textarea
                  defaultValue={architect.communication_notes || ''}
                  onBlur={async (e) => {
                    if (e.target.value !== (architect.communication_notes || '')) {
                      await updateArchitect({ communication_notes: e.target.value })
                    }
                  }}
                  placeholder="e.g., Prefers text over email, assistant screens calls, calls me Matt..."
                  className="mt-0.5 w-full rounded-md border px-2 py-1.5 text-[11px]"
                  style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0', minHeight: '48px', resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Outreach context</label>
                <textarea
                  defaultValue={architect.outreach_context || ''}
                  onBlur={async (e) => {
                    if (e.target.value !== (architect.outreach_context || '')) {
                      await updateArchitect({ outreach_context: e.target.value })
                    }
                  }}
                  placeholder="e.g., Met at AIA gala, loves modernist design, kids in same school..."
                  className="mt-0.5 w-full rounded-md border px-2 py-1.5 text-[11px]"
                  style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0', minHeight: '48px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <OpportunityPanel architectId={architect.id} architectName={architect.name} />

          {/* People at this firm */}
          <div className="rounded-xl border border-border bg-[#1C1C1C] p-4" style={{ borderWidth: '0.5px' }}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                People at this firm
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px]"
                onClick={enrichPeople}
                disabled={enriching || !architect.website}
              >
                <RefreshCw className={`h-3 w-3 ${enriching ? 'animate-spin' : ''}`} />
                {enriching ? 'Finding...' : contacts.length > 0 ? 'Refresh' : 'Find people'}
              </Button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {architect.website
                  ? 'Click "Find people" to discover team members from their website'
                  : 'Add a website to discover team members'}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {contacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg bg-[#141414] p-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium">{contact.name}</p>
                      {contact.is_decision_maker && (
                        <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    {contact.title && (
                      <p className="text-[10px] text-muted-foreground">{contact.title}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-0.5 text-[10px] text-primary hover:underline">
                          <Mail className="h-2.5 w-2.5" />{contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-[#E8E8F0]">
                          <Phone className="h-2.5 w-2.5" />{contact.phone}
                        </a>
                      )}
                      {contact.linkedin_url && (
                        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-[#E8E8F0]">
                          <Linkedin className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {architect.style && (
            <div className="rounded-xl border border-border bg-[#1C1C1C] p-4" style={{ borderWidth: '0.5px' }}>
              <p className="text-xs text-muted-foreground">Design style</p>
              <p className="mt-1 text-sm">{architect.style}</p>
            </div>
          )}

          {architect.awards && (
            <div className="rounded-xl border border-border bg-[#1C1C1C] p-4" style={{ borderWidth: '0.5px' }}>
              <p className="text-xs text-muted-foreground">Awards</p>
              <p className="mt-1 text-sm">{architect.awards}</p>
            </div>
          )}

          {/* Linked projects */}
          <div className="rounded-xl border border-border bg-[#1C1C1C] p-4" style={{ borderWidth: '0.5px' }}>
            <h3 className="mb-2 text-sm font-medium">
              Projects {linkedProjects.length > 0 && `(${linkedProjects.length})`}
            </h3>
            {linkedProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No projects linked yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {linkedProjects.map((p) => (
                  <div key={p.id} className="rounded-lg bg-[#141414] p-2">
                    <p className="text-xs font-medium">{p.name}</p>
                    {p.location && (
                      <p className="text-[10px] text-muted-foreground">{p.location}</p>
                    )}
                    {p.budget_value ? (
                      <p className="text-[10px] text-muted-foreground">
                        ${(p.budget_value / 1000000).toFixed(1)}M
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <Link
              to="/kb/projects/new"
              className="mt-2 block text-xs text-primary hover:underline"
            >
              + Add project
            </Link>
          </div>
        </div>
      </div>

      <AIModal
        architectId={architect.id}
        architectName={architect.name}
        architectEmail={architect.email}
        open={showAI}
        onClose={() => setShowAI(false)}
        onSent={refetch}
      />

      <EmailSeriesModal
        architectId={architect.id}
        architectName={architect.name}
        architectEmail={architect.email}
        open={showEmailSeries}
        onClose={() => setShowEmailSeries(false)}
        onScheduled={refetch}
      />
    </div>
  )
}
