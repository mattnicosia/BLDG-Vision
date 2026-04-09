import type { GooglePlaceResult } from '@/types'
import { getAvatarColor, getInitials } from '@/types'
import { Button } from '@/components/ui/button'
import { Star, Globe, Check, Plus } from 'lucide-react'

interface RadarCardProps {
  place: GooglePlaceResult
  onAdd: (place: GooglePlaceResult) => void
  alreadyAdded: boolean
}

export function RadarCard({ place, onAdd, alreadyAdded }: RadarCardProps) {
  const name = place.displayName.text
  const colors = getAvatarColor(name)

  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-border bg-[#1C1C1C] p-4"
      style={{ borderWidth: '0.5px' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-medium"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {getInitials(name)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-[#E8E8F0]">
          {name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {place.formattedAddress}
        </span>
        <div className="flex items-center gap-3">
          {place.rating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" style={{ color: '#F59E0B' }} />
              <span>{place.rating}</span>
              {place.userRatingCount && (
                <span>({place.userRatingCount})</span>
              )}
            </div>
          )}
          {place.websiteUri && (
            <a
              href={place.websiteUri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
        </div>
      </div>

      {alreadyAdded ? (
        <Button variant="outline" size="sm" disabled className="gap-1.5">
          <Check className="h-3.5 w-3.5" /> Added
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAdd(place)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add to CRM
        </Button>
      )}
    </div>
  )
}
