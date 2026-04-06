import { Radar } from 'lucide-react'

export function RadarIndex() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Regional Radar</h1>
        <p className="text-sm text-muted-foreground">
          Discover architects in your service territory
        </p>
      </div>
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
        <Radar className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Google Places integration coming in Sprint 2
        </p>
      </div>
    </div>
  )
}
