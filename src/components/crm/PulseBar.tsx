import { getPulseColor } from '@/lib/pulse'

interface PulseBarProps {
  score: number
  showLabel?: boolean
}

export function PulseBar({ score, showLabel = true }: PulseBarProps) {
  const color = getPulseColor(score)

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${score}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color }}>
          {score}
        </span>
      )}
    </div>
  )
}
