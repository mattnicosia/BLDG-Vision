import { DollarSign, Target, TrendingUp, BarChart3, Trophy } from 'lucide-react'

interface PipelineMetricsProps {
  pipelineValue: number
  weightedValue: number
  pipelineCount: number
  winRate: number
  avgDealSize: number
  awardedCount?: number
}

function formatValue(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

export function PipelineMetrics({ pipelineValue, weightedValue, pipelineCount, winRate, avgDealSize, awardedCount }: PipelineMetricsProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      <div className="rounded-lg bg-[#1C1C1C] border border-border p-3" style={{ borderWidth: '0.5px' }}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" /> Pipeline
        </div>
        <p className="mt-1 text-lg font-medium">{formatValue(pipelineValue)}</p>
      </div>
      <div className="rounded-lg bg-[#1C1C1C] border border-border p-3" style={{ borderWidth: '0.5px' }}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> Weighted
        </div>
        <p className="mt-1 text-lg font-medium">{formatValue(weightedValue)}</p>
      </div>
      <div className="rounded-lg bg-[#1C1C1C] border border-border p-3" style={{ borderWidth: '0.5px' }}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BarChart3 className="h-3 w-3" /> Active leads
        </div>
        <p className="mt-1 text-lg font-medium">{pipelineCount}</p>
      </div>
      <div className="rounded-lg bg-[#1C1C1C] border border-border p-3" style={{ borderWidth: '0.5px' }}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trophy className="h-3 w-3" /> Win rate
        </div>
        <p className="mt-1 text-lg font-medium">{winRate}%</p>
      </div>
      <div className="rounded-lg bg-[#1C1C1C] border border-border p-3" style={{ borderWidth: '0.5px' }}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" /> Avg deal
        </div>
        <p className="mt-1 text-lg font-medium">{formatValue(avgDealSize)}</p>
      </div>
    </div>
  )
}
