import React from 'react'
import type { NivelRisco } from '../types/supabase'

interface BarraRiscoProps {
  probabilidade?: number | null
  nivel?: NivelRisco | null
  showPercentage?: boolean
  height?: string
  className?: string
}

export function BarraRisco({
  probabilidade,
  nivel,
  showPercentage = true,
  height = 'h-2',
  className = '',
}: BarraRiscoProps) {
  const pct = probabilidade != null ? Math.round(probabilidade * 100) : null

  const barColor =
    nivel === 'alto'
      ? 'from-amber-500 to-red-500'
      : nivel === 'moderado'
        ? 'from-yellow-400 to-amber-500'
        : 'from-emerald-500 to-teal-400'

  const bgGlow =
    nivel === 'alto'
      ? 'shadow-red-500/40'
      : nivel === 'moderado'
        ? 'shadow-amber-500/30'
        : 'shadow-emerald-500/30'

  if (pct == null) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex-1 rounded-full bg-slate-700 ${height}`} />
        {showPercentage && <span className="font-mono text-xs text-slate-500 w-8">—</span>}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 rounded-full bg-slate-700/80 ${height} overflow-hidden`}>
        <div
          className={`${height} rounded-full bg-gradient-to-r ${barColor} shadow-sm ${bgGlow} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showPercentage && (
        <span className="font-mono text-xs text-slate-300 w-8 text-right tabular-nums">
          {pct}%
        </span>
      )}
    </div>
  )
}
