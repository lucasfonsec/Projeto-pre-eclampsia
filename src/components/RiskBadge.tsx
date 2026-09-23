import React from 'react'
import type { NivelRisco } from '../types/supabase'

interface RiskBadgeProps {
  nivel?: NivelRisco | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const config: Record<NivelRisco, { label: string; classes: string; dot: string }> = {
  baixo: {
    label: 'Baixo',
    classes: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  moderado: {
    label: 'Moderado',
    classes: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
    dot: 'bg-amber-400',
  },
  alto: {
    label: 'Alto',
    classes: 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse-subtle',
    dot: 'bg-red-400',
  },
}

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

export function RiskBadge({ nivel, size = 'md', showLabel = true }: RiskBadgeProps) {
  if (!nivel) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizes[size]} bg-slate-700 text-slate-400 border border-slate-600`}>
        <span className="h-2 w-2 rounded-full bg-slate-500" />
        {showLabel && 'Sem avaliação'}
      </span>
    )
  }

  const c = config[nivel]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizes[size]} ${c.classes}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {showLabel && c.label}
    </span>
  )
}
