import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCompetitorDetail } from '@/hooks/useCompetitors'
import { LinkArchitectDialog } from '@/components/competitors/LinkArchitectDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getInitials, getAvatarColor } from '@/types'
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Globe,
  MapPin,
  Trash2,
  Plus,
  Users,
  Star,
  Instagram,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

function getDisplacementColor(score: number): string {
  if (score >= 70) return '#EF4444'
  if (score >= 40) return '#F59E0B'
  return '#06B6D4'
}

export function CompetitorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    competitor,
    links,
    loading,
    updateCompetitor,
    addLink,
    removeLink,
  } = useCompetitorDetail(id ?? '')
  const [editing, setEditing] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)

  // Edit state
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editScore, setEditScore] = useState('')
  const [editStrengths, setEditStrengths] = useState('')
  const [editWeaknesses, setEditWeaknesses] = useState('')
  const [editIntel, setEditIntel] = useState('')
  const [editOpening, setEditOpening] = useState('')

  function startEditing() {
    if (!competitor) return
    setEditName(competitor.name)
    setEditLocation(competitor.location ?? '')
    setEditWebsite(competitor.website ?? '')
    setEditScore(competitor.displacement_score.toString())
    setEditStrengths(competitor.strengths?.join(', ') ?? '')
    setEditWeaknesses(competitor.weaknesses?.join(', ') ?? '')
    setEditIntel(competitor.intel ?? '')
    setEditOpening(competitor.opening ?? '')
    setEditing(true)
  }

  async function saveEdits() {
    await updateCompetitor({
      name: editName,
      location: editLocation || undefined,
      website: editWebsite || undefined,
      displacement_score: parseInt(editScore) || 50,
      strengths: editStrengths ? editStrengths.split(',').map((s) => s.trim()).filter(Boolean) : [],
      weaknesses: editWeaknesses ? editWeaknesses.split(',').map((s) => s.trim()).filter(Boolean) : [],
      intel: editIntel || undefined,
      opening: editOpening || undefined,
    })
    setEditing(false)
  }

  async function handleDelete() {
    if (!competitor) return
    if (!confirm(`Delete ${competitor.name}?`)) return
    await supabase.from('competitors').delete().eq('id', competitor.id)
    navigate('/competitors')
  }

  if (loading || !competitor) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          {loading ? 'Loading...' : 'Competitor not found'}
        </p>
      </div>
    )
  }

  const colors = getAvatarColor(competitor.name)
  const dColor = getDisplacementColor(competitor.displacement_score)

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/competitors"
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-[#E8E8F0]"
      >
        <ArrowLeft className="h-4 w-4" /> Competitors
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {getInitials(competitor.name)}
          </div>
          <div>
            <h1 className="text-lg font-medium">{competitor.name}</h1>
            {competitor.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" /> {competitor.location}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${competitor.displacement_score}%`, backgroundColor: dColor }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: dColor }}>
                {competitor.displacement_score} displacement
              </span>
            </div>
            {competitor.google_rating && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3" style={{ color: '#F59E0B' }} />
                {competitor.google_rating} rating
                {competitor.google_review_count && ` (${competitor.google_review_count} reviews)`}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={saveEdits} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Main panel */}
        <div className="col-span-2 flex flex-col gap-4">
          {editing ? (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Location</label>
                  <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Website</label>
                  <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
                </div>
                <div className="flex w-32 flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Displacement (0-100)</label>
                  <Input type="number" min={0} max={100} value={editScore} onChange={(e) => setEditScore(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Strengths (comma-separated)</label>
                <Input value={editStrengths} onChange={(e) => setEditStrengths(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Weaknesses (comma-separated)</label>
                <Input value={editWeaknesses} onChange={(e) => setEditWeaknesses(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Intel</label>
                <Textarea value={editIntel} onChange={(e) => setEditIntel(e.target.value)} rows={3} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Your opening</label>
                <Textarea value={editOpening} onChange={(e) => setEditOpening(e.target.value)} rows={2} />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-1 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
              {/* Links */}
              {(competitor.website || competitor.instagram_handle) && (
                <div className="flex flex-wrap gap-2">
                  {competitor.website && (
                    <a
                      href={competitor.website.startsWith('http') ? competitor.website : `https://${competitor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-[#141414] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-[#E8E8F0]"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {competitor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                  {competitor.instagram_handle && (
                    <a
                      href={`https://instagram.com/${competitor.instagram_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-[#141414] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-[#E8E8F0]"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      @{competitor.instagram_handle.replace('@', '')}
                    </a>
                  )}
                </div>
              )}
              {competitor.strengths?.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Strengths</p>
                  <div className="flex flex-wrap gap-1.5">
                    {competitor.strengths.map((s, i) => (
                      <span key={i} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#E1F5EE', color: '#085041' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {competitor.weaknesses?.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Weaknesses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {competitor.weaknesses.map((w, i) => (
                      <span key={i} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {competitor.intel && (
                <div>
                  <p className="text-xs text-muted-foreground">Intel</p>
                  <p className="mt-1 text-sm">{competitor.intel}</p>
                </div>
              )}
              {competitor.opening && (
                <div>
                  <p className="text-xs text-muted-foreground">Your opening</p>
                  <p className="mt-1 text-sm">{competitor.opening}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Linked architects */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-[#1C1C1C] p-4" style={{ borderWidth: '0.5px' }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Linked architects</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowLinkDialog(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {links.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No architects linked yet
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg bg-[#141414] p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <Link
                        to={`/relationships/${link.architect_id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {link.architect_name ?? 'Unknown'}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {link.projects_count} proj
                      </span>
                      <button
                        onClick={() => removeLink(link.id)}
                        className="text-muted-foreground hover:text-[#E8E8F0]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showLinkDialog && (
        <LinkArchitectDialog
          competitorId={competitor.id}
          existingArchitectIds={links.map((l) => l.architect_id)}
          onClose={() => setShowLinkDialog(false)}
          onLink={addLink}
        />
      )}
    </div>
  )
}
