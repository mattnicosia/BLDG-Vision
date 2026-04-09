import { useState, useMemo } from 'react'
import { US_STATES, getCountiesForState, type CountyData } from '@/data/counties'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Search, MapPin } from 'lucide-react'

interface CountyPickerProps {
  selected: CountyData[]
  onChange: (counties: CountyData[]) => void
}

export function CountyPicker({ selected, onChange }: CountyPickerProps) {
  const [selectedStates, setSelectedStates] = useState<string[]>(
    () => [...new Set(selected.map((c) => c.state))]
  )
  const [search, setSearch] = useState('')

  const availableCounties = useMemo(() => {
    if (selectedStates.length === 0) return []
    const all = selectedStates.flatMap(getCountiesForState)
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter((c) => c.name.toLowerCase().includes(q))
  }, [selectedStates, search])

  const selectedFips = new Set(selected.map((c) => c.fips))

  function toggleState(abbr: string) {
    if (selectedStates.includes(abbr)) {
      setSelectedStates(selectedStates.filter((s) => s !== abbr))
      // Remove counties from deselected state
      onChange(selected.filter((c) => c.state !== abbr))
    } else {
      setSelectedStates([...selectedStates, abbr])
    }
    setSearch('')
  }

  function toggleCounty(county: CountyData) {
    if (selectedFips.has(county.fips)) {
      onChange(selected.filter((c) => c.fips !== county.fips))
    } else {
      onChange([...selected, county])
    }
  }

  function selectAllVisible() {
    const newCounties = availableCounties.filter((c) => !selectedFips.has(c.fips))
    onChange([...selected, ...newCounties])
  }

  function removeCounty(fips: string) {
    onChange(selected.filter((c) => c.fips !== fips))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selected counties display */}
      {selected.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selected.length} count{selected.length !== 1 ? 'ies' : 'y'} selected
            </span>
            <button
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-[#E8E8F0]"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((c) => (
              <span
                key={c.fips}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: '#E1F5EE', color: '#085041' }}
              >
                <MapPin className="h-2.5 w-2.5" />
                {c.name}, {c.state}
                <button
                  onClick={() => removeCounty(c.fips)}
                  className="ml-0.5 hover:opacity-70"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* State selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">
          Select states where you work
        </label>
        <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
          {US_STATES.map((s) => {
            const isActive = selectedStates.includes(s.abbr)
            const countyCount = selected.filter((c) => c.state === s.abbr).length
            return (
              <button
                key={s.abbr}
                onClick={() => toggleState(s.abbr)}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? '#06B6D4' : 'transparent',
                  color: isActive ? '#ffffff' : '#7C7C7C',
                  border: `1px solid ${isActive ? '#06B6D4' : '#2A2A2A'}`,
                }}
              >
                {s.abbr}
                {countyCount > 0 && ` (${countyCount})`}
              </button>
            )
          })}
        </div>
      </div>

      {/* County picker */}
      {selectedStates.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search counties..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllVisible}
              className="text-xs"
            >
              Select all
            </Button>
          </div>
          <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border p-2">
            {availableCounties.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                {search ? 'No counties match your search' : 'Select a state above'}
              </p>
            ) : (
              availableCounties.map((county) => {
                const isSelected = selectedFips.has(county.fips)
                return (
                  <button
                    key={county.fips}
                    onClick={() => toggleCounty(county)}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted"
                  >
                    <div
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border"
                      style={{
                        backgroundColor: isSelected ? '#06B6D4' : 'transparent',
                        borderColor: isSelected ? '#06B6D4' : '#d4d4d8',
                      }}
                    >
                      {isSelected && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={isSelected ? 'font-medium text-[#E8E8F0]' : 'text-muted-foreground'}>
                      {county.name}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {county.state}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
