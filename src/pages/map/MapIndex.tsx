import { Map } from 'lucide-react'

export function MapIndex() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Territory Map</h1>
        <p className="text-sm text-muted-foreground">
          Architect offices and project locations
        </p>
      </div>
      <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
        <Map className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Google Maps integration coming in Sprint 2
        </p>
      </div>
    </div>
  )
}
