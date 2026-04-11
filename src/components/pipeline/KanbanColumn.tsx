import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import type { LeadStatus } from '@/types'
import { LEAD_STAGE_LABELS, LEAD_STAGE_STYLES } from '@/types'

interface KanbanColumnProps {
  stage: LeadStatus
  count: number
  value: number
  children: ReactNode
}

export function KanbanColumn({ stage, count, value, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const stageStyle = LEAD_STAGE_STYLES[stage]

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: stageStyle.bg, color: stageStyle.text }}
          >
            {LEAD_STAGE_LABELS[stage]}
          </span>
          <span className="text-[10px] text-muted-foreground">{count}</span>
        </div>
        {value > 0 && (
          <span className="text-[10px] text-muted-foreground">
            ${(value / 1000000).toFixed(1)}M
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className="flex flex-col gap-1.5 rounded-lg p-1.5 transition-colors"
        style={{
          minHeight: 200,
          backgroundColor: isOver ? '#1A1A2E' : '#0F0F0F',
          border: isOver ? '1px dashed rgba(99, 102, 241, 0.4)' : '1px solid transparent',
        }}
      >
        {children}
      </div>
    </div>
  )
}
