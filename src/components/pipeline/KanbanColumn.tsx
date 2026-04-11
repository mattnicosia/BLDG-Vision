import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { usePipelineStages } from '@/hooks/usePipelineStages'

interface KanbanColumnProps {
  stage: string
  count: number
  value: number
  children: ReactNode
}

export function KanbanColumn({ stage, count, value, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const { labelMap, styleMap } = usePipelineStages()
  const stageStyle = styleMap[stage] ?? { bg: 'rgba(124,124,150,0.15)', text: '#7C7C7C' }

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: stageStyle.bg, color: stageStyle.text }}
          >
            {labelMap[stage] ?? stage}
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
