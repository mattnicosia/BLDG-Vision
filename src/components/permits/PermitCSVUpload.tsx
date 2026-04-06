import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePermits } from '@/hooks/usePermits'
import { useArchitects } from '@/hooks/useArchitects'
import { Upload, FileText, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'

const PERMIT_FIELDS = [
  { key: 'skip', label: '(Skip)' },
  { key: 'project_address', label: 'Address' },
  { key: 'permit_number', label: 'Permit Number' },
  { key: 'filed_date', label: 'Filed Date' },
  { key: 'architect_name', label: 'Architect Name' },
  { key: 'contractor_name', label: 'Contractor Name' },
  { key: 'estimated_value', label: 'Estimated Value' },
  { key: 'permit_type', label: 'Permit Type' },
  { key: 'status', label: 'Status' },
  { key: 'county', label: 'County' },
  { key: 'town', label: 'Town' },
  { key: 'scope_description', label: 'Scope' },
]

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

function autoDetectMapping(header: string): string {
  const h = header.toLowerCase()
  if (h.includes('address') || h.includes('location')) return 'project_address'
  if (h.includes('permit') && h.includes('num')) return 'permit_number'
  if (h.includes('date') || h.includes('filed')) return 'filed_date'
  if (h.includes('architect')) return 'architect_name'
  if (h.includes('contractor') || h.includes('builder')) return 'contractor_name'
  if (h.includes('value') || h.includes('cost') || h.includes('amount')) return 'estimated_value'
  if (h.includes('type')) return 'permit_type'
  if (h.includes('status')) return 'status'
  if (h.includes('county')) return 'county'
  if (h.includes('town') || h.includes('city') || h.includes('municipality')) return 'town'
  if (h.includes('scope') || h.includes('description') || h.includes('work')) return 'scope_description'
  return 'skip'
}

interface Props {
  open: boolean
  onClose: () => void
}

export function PermitCSVUpload({ open, onClose }: Props) {
  const { bulkInsertPermits } = usePermits()
  const { architects } = useArchitects()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.headers.length === 0) {
        toast.error('Could not parse CSV. Check the file format.')
        return
      }
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setMapping(parsed.headers.map(autoDetectMapping))
      setStep('map')
    }
    reader.readAsText(file)
  }

  function updateMapping(index: number, value: string) {
    setMapping((prev) => prev.map((m, i) => (i === index ? value : m)))
  }

  function buildPermitRows() {
    return rows
      .map((row) => {
        const permit: Record<string, unknown> = {}
        mapping.forEach((field, i) => {
          if (field !== 'skip' && row[i]) {
            if (field === 'estimated_value') {
              const num = parseInt(row[i].replace(/[^0-9]/g, ''))
              if (!isNaN(num)) permit[field] = num
            } else {
              permit[field] = row[i]
            }
          }
        })
        if (!permit.project_address) return null

        // Match architect
        const archName = (permit.architect_name as string)?.toLowerCase()
        if (archName) {
          const match = architects.find((a) =>
            a.name.toLowerCase().includes(archName) ||
            archName.includes(a.name.toLowerCase())
          )
          if (match) permit.architect_id = match.id
        }

        return permit
      })
      .filter(Boolean) as Record<string, unknown>[]
  }

  async function handleImport() {
    setImporting(true)
    const permitRows = buildPermitRows()
    const { inserted, error } = await bulkInsertPermits(permitRows)
    setImporting(false)

    if (error) {
      toast.error(`Import failed: ${error}`)
    } else {
      toast.success(`${inserted} permit${inserted !== 1 ? 's' : ''} imported`)
      onClose()
    }
  }

  const permitRows = step === 'review' ? buildPermitRows() : []
  const matchedCount = permitRows.filter((r) => r.architect_id).length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import permits from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Upload a CSV file exported from your county permit database
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileRef.current?.click()} className="gap-2">
              <FileText className="h-4 w-4" /> Choose file
            </Button>
          </div>
        )}

        {step === 'map' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns to permit fields. {rows.length} rows found.
            </p>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-xs text-muted-foreground">CSV Column</th>
                    <th className="pb-2 text-left text-xs text-muted-foreground">Maps to</th>
                    <th className="pb-2 text-left text-xs text-muted-foreground">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 pr-3 font-medium">{header}</td>
                      <td className="py-2 pr-3">
                        <select
                          value={mapping[i]}
                          onChange={(e) => updateMapping(i, e.target.value)}
                          className="rounded border border-border px-2 py-1 text-xs"
                        >
                          {PERMIT_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {rows[0]?.[i] ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={() => setStep('review')} className="gap-1.5">
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Permits to import</p>
                <p className="text-lg font-medium">{permitRows.length}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Matched to architects</p>
                <p className="text-lg font-medium">{matchedCount}</p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3">
              {permitRows.slice(0, 5).map((row, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-border py-1.5 last:border-0">
                  <span className="text-xs">{row.project_address as string}</span>
                  {row.architect_name && (
                    <span className="text-xs text-muted-foreground">
                      / {row.architect_name as string}
                    </span>
                  )}
                  {row.architect_id && (
                    <Check className="h-3 w-3" style={{ color: '#0F6E56' }} />
                  )}
                </div>
              ))}
              {permitRows.length > 5 && (
                <p className="pt-1 text-xs text-muted-foreground">
                  ...and {permitRows.length - 5} more
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep('map')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing || permitRows.length === 0}>
                {importing ? 'Importing...' : `Import ${permitRows.length} permits`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
