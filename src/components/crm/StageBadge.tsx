import type { ArchitectStage } from '@/types'
import { STAGE_STYLES } from '@/types'

export function StageBadge({ stage }: { stage: ArchitectStage }) {
  const style = STAGE_STYLES[stage]
  return (
    <span
      className="inline-flex items-center rounded-full px-[7px] py-[2px] text-[10px] font-medium"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {stage}
    </span>
  )
}
