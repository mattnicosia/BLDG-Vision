import { useState } from 'react'
import { usePipelineStages } from '@/hooks/usePipelineStages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Pencil, Trash2, Lock, GripVertical,
  ChevronUp, ChevronDown, Check, X,
} from 'lucide-react'
import type { PipelineStageConfig } from '@/types'

const COLOR_PALETTE = [
  '#7C7C7C', '#F59E0B', '#818CF8', '#06B6D4', '#A855F7',
  '#FBBF24', '#22C55E', '#EF4444', '#A3A3A3', '#D97706',
  '#6B7280', '#EC4899', '#14B8A6', '#F97316', '#8B5CF6',
]

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function PipelineStagesManager() {
  const {
    pipelineStages,
    endStates,
    loading,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  } = usePipelineStages()

  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState<'pipeline' | 'end_state'>('pipeline')
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#7C7C7C')
  const [newProb, setNewProb] = useState(10)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editProb, setEditProb] = useState(0)

  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleAdd() {
    setSaving(true)
    await createStage({
      label: newLabel,
      color: newColor,
      probability: newProb,
      stage_type: addType,
    })
    setNewLabel('')
    setNewColor('#7C7C7C')
    setNewProb(10)
    setShowAdd(false)
    setSaving(false)
  }

  function startEdit(stage: PipelineStageConfig) {
    setEditingId(stage.id)
    setEditLabel(stage.label)
    setEditColor(stage.color)
    setEditProb(stage.probability)
  }

  async function saveEdit() {
    if (!editingId) return
    await updateStage(editingId, {
      label: editLabel,
      color: editColor,
      probability: editProb,
    })
    setEditingId(null)
  }

  async function handleDelete(stage: PipelineStageConfig) {
    setDeleteError(null)
    const result = await deleteStage(stage.id)
    if (!result.ok) {
      setDeleteError(result.reason ?? 'Failed to delete')
      setTimeout(() => setDeleteError(null), 4000)
    }
  }

  async function moveUp(stage: PipelineStageConfig) {
    const group = stage.stage_type === 'pipeline' ? pipelineStages : endStates
    const idx = group.findIndex((s) => s.id === stage.id)
    if (idx <= 0) return
    const ids = group.map((s) => s.id)
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    await reorderStages(stage.stage_type, ids)
  }

  async function moveDown(stage: PipelineStageConfig) {
    const group = stage.stage_type === 'pipeline' ? pipelineStages : endStates
    const idx = group.findIndex((s) => s.id === stage.id)
    if (idx < 0 || idx >= group.length - 1) return
    const ids = group.map((s) => s.id)
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    await reorderStages(stage.stage_type, ids)
  }

  function renderStageRow(stage: PipelineStageConfig, group: PipelineStageConfig[]) {
    const isEditing = editingId === stage.id
    const idx = group.findIndex((s) => s.id === stage.id)
    const isFirst = idx === 0
    const isLast = idx === group.length - 1

    if (isEditing) {
      return (
        <div key={stage.id} className="flex items-center gap-2 rounded-lg bg-[#141414] p-2.5">
          <Input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="h-8 flex-1 text-sm"
            autoFocus
          />
          <div className="flex gap-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setEditColor(c)}
                className="h-5 w-5 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  border: editColor === c ? '2px solid #E8E8F0' : '2px solid transparent',
                  transform: editColor === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={editProb}
              onChange={(e) => setEditProb(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="h-8 w-16 text-center text-sm"
              min={0}
              max={100}
            />
            <span className="text-[10px] text-muted-foreground">%</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={saveEdit} disabled={!editLabel}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }

    return (
      <div
        key={stage.id}
        className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-[#141414]"
      >
        {/* Reorder buttons */}
        <div className="flex flex-col">
          <button
            onClick={() => moveUp(stage)}
            disabled={isFirst}
            className="text-muted-foreground hover:text-[#E8E8F0] disabled:opacity-20"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => moveDown(stage)}
            disabled={isLast}
            className="text-muted-foreground hover:text-[#E8E8F0] disabled:opacity-20"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Color swatch */}
        <div
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: stage.color }}
        />

        {/* Label */}
        <span
          className="flex-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: hexToRgba(stage.color, 0.15), color: stage.color }}
        >
          {stage.label}
        </span>

        {/* Probability */}
        <span className="text-[11px] text-muted-foreground w-10 text-right">
          {stage.probability}%
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {stage.is_protected && (
            <Lock className="h-3 w-3 text-muted-foreground" title="Protected stage" />
          )}
          <button
            onClick={() => startEdit(stage)}
            className="p-1 text-muted-foreground hover:text-[#E8E8F0]"
          >
            <Pencil className="h-3 w-3" />
          </button>
          {!stage.is_protected && (
            <button
              onClick={() => handleDelete(stage)}
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    )
  }

  if (loading) return null

  return (
    <div className="rounded-xl border border-border bg-[#1C1C1C] p-5" style={{ borderWidth: '0.5px' }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Pipeline stages</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Configure your lead pipeline stages and end states
          </p>
        </div>
      </div>

      {/* Error toast */}
      {deleteError && (
        <div
          className="mb-3 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
        >
          {deleteError}
        </div>
      )}

      {/* Pipeline stages */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>
            Pipeline stages
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAddType('pipeline'); setShowAdd(true) }}
            className="h-6 gap-1 px-2 text-[10px]"
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        <div className="flex flex-col gap-0.5">
          {pipelineStages.map((s) => renderStageRow(s, pipelineStages))}
        </div>
      </div>

      {/* End states */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>
            End states
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAddType('end_state'); setShowAdd(true) }}
            className="h-6 gap-1 px-2 text-[10px]"
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        <div className="flex flex-col gap-0.5">
          {endStates.map((s) => renderStageRow(s, endStates))}
        </div>
      </div>

      {/* Add dialog */}
      {showAdd && (
        <Dialog open onOpenChange={() => setShowAdd(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                Add {addType === 'pipeline' ? 'pipeline stage' : 'end state'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Stage name"
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className="h-6 w-6 rounded-full transition-transform"
                      style={{
                        backgroundColor: c,
                        border: newColor === c ? '2px solid #E8E8F0' : '2px solid transparent',
                        transform: newColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>
                  Default probability (%)
                </label>
                <Input
                  type="number"
                  value={newProb}
                  onChange={(e) => setNewProb(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={100}
                />
              </div>
              {/* Preview */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Preview:</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: hexToRgba(newColor, 0.15), color: newColor }}
                >
                  {newLabel || 'Stage name'}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAdd} disabled={!newLabel || saving}>
                  {saving ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
