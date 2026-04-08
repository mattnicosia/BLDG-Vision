import type { EnerGovPermitPreview, EnerGovContact } from '@/types'
import { MapPin, Calendar, DollarSign, ExternalLink, User, Building2, Briefcase, Ruler } from 'lucide-react'
import { categorizePermit, CONSTRUCTION_TYPE_STYLES, RELEVANCE_STYLES } from '@/lib/permitCategories'

const CONTACT_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  Contractor: { bg: '#FEE2E2', text: '#A32D2D' },
  'Authorized Representative': { bg: '#FAEEDA', text: '#854F0B' },
  'Property Owner/Builder': { bg: '#EEEDFE', text: '#3C3489' },
  Architect: { bg: '#E1F5EE', text: '#085041' },
}

function getContactStyle(type: string) {
  return CONTACT_TYPE_STYLES[type] || { bg: '#F1EFE8', text: '#5F5E5A' }
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(v: number): string {
  if (!v) return ''
  return '$' + v.toLocaleString()
}

interface PermitPreviewCardProps {
  permit: EnerGovPermitPreview
  selected: boolean
  onToggle: () => void
}

export function PermitPreviewCard({ permit, selected, onToggle }: PermitPreviewCardProps) {
  const { constructionType, relevance } = categorizePermit(permit.permitType, permit.description)
  const ctStyle = CONSTRUCTION_TYPE_STYLES[constructionType]
  const relStyle = RELEVANCE_STYLES[relevance]

  return (
    <div
      className="rounded-xl border bg-[#1A1A24] p-4 transition-colors"
      style={{
        borderWidth: '0.5px',
        borderColor: selected ? '#0F6E56' : '#e4e4e7',
        backgroundColor: selected ? '#fafffe' : '#ffffff',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <button
            onClick={onToggle}
            className="flex h-4 w-4 items-center justify-center rounded border"
            style={{
              backgroundColor: selected ? '#0F6E56' : 'transparent',
              borderColor: selected ? '#0F6E56' : '#d4d4d8',
            }}
          >
            {selected && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{permit.permitNumber}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: ctStyle.bg, color: ctStyle.text }}
                >
                  {constructionType}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                  style={{ backgroundColor: relStyle.bg, color: relStyle.text }}
                >
                  {relevance}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: permit.status === 'Approved' ? '#E1F5EE' : permit.status === 'Submitted - Online' ? '#FAEEDA' : '#F1EFE8',
                    color: permit.status === 'Approved' ? '#085041' : permit.status === 'Submitted - Online' ? '#854F0B' : '#5F5E5A',
                  }}
                >
                  {permit.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{permit.permitType}</p>
            </div>
            <a
              href={permit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View
            </a>
          </div>

          {/* Details row */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {permit.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {permit.address}
              </span>
            )}
            {permit.applyDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDate(permit.applyDate)}
              </span>
            )}
            {permit.value > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> {formatCurrency(permit.value)}
              </span>
            )}
            {permit.sqft > 0 && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" /> {permit.sqft.toLocaleString()} SF
              </span>
            )}
          </div>

          {/* Description */}
          {permit.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{permit.description}</p>
          )}

          {/* Contacts */}
          {permit.contacts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {permit.contacts.map((contact, i) => {
                const style = getContactStyle(contact.type)
                const name = contact.company || `${contact.firstName} ${contact.lastName}`.trim()
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                    style={{ backgroundColor: style.bg }}
                  >
                    {contact.type === 'Contractor' && <Briefcase className="h-3 w-3" style={{ color: style.text }} />}
                    {contact.type === 'Property Owner/Builder' && <Building2 className="h-3 w-3" style={{ color: style.text }} />}
                    {contact.type?.includes('Architect') && <User className="h-3 w-3" style={{ color: style.text }} />}
                    {contact.type === 'Authorized Representative' && <User className="h-3 w-3" style={{ color: style.text }} />}
                    <span className="text-[10px] font-medium" style={{ color: style.text }}>
                      {contact.type}:
                    </span>
                    <span className="text-[10px]" style={{ color: style.text }}>
                      {name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
