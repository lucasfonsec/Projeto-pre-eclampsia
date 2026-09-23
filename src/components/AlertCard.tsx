import React from 'react'
import type { Severidade } from '../types/supabase'
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react'

interface AlertCardProps {
  severidade: Severidade
  tipo: string
  descricao: string
  timestamp?: string
  onResolve?: () => void
  onViewPatient?: () => void
  resolvido?: boolean
}

const sevConfig: Record<Severidade, {
  icon: React.ReactNode
  classes: string
  badgeClasses: string
  label: string
}> = {
  grave: {
    icon: <ShieldAlert className="h-5 w-5" />,
    classes: 'border-red-500/30 bg-red-500/5',
    badgeClasses: 'bg-red-500/20 text-red-400 border border-red-500/30',
    label: 'Grave',
  },
  atencao: {
    icon: <AlertTriangle className="h-5 w-5" />,
    classes: 'border-amber-500/30 bg-amber-500/5',
    badgeClasses: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    label: 'Atenção',
  },
  informativo: {
    icon: <Info className="h-5 w-5" />,
    classes: 'border-blue-500/30 bg-blue-500/5',
    badgeClasses: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    label: 'Informativo',
  },
}

const tipoLabels: Record<string, string> = {
  hipertensao_grave:     'Hipertensão Grave',
  hipertensao_confirmada: 'Hipertensão Confirmada',
  proteinuria_elevada:   'Proteinúria Elevada',
  trombocitopenia_grave: 'Trombocitopenia Grave',
  disfuncao_renal:       'Disfunção Renal',
  disfuncao_hepatica:    'Disfunção Hepática',
  iminencia_eclampsia:   'Iminência de Eclâmpsia',
}

export function AlertCard({
  severidade,
  tipo,
  descricao,
  timestamp,
  onResolve,
  onViewPatient,
  resolvido,
}: AlertCardProps) {
  const cfg = sevConfig[severidade]

  return (
    <div className={`rounded-xl border p-4 transition-all ${cfg.classes} ${resolvido ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 rounded-lg p-1.5 ${cfg.badgeClasses}`}>
          {cfg.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${cfg.badgeClasses}`}>
              {cfg.label}
            </span>
            <span className="text-sm font-semibold text-slate-200">
              {tipoLabels[tipo] ?? tipo}
            </span>
            {resolvido && (
              <span className="text-xs text-emerald-400 font-medium">✓ Resolvido</span>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-snug">{descricao}</p>
          {timestamp && (
            <p className="text-xs text-slate-500 mt-1">
              {new Date(timestamp).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      </div>
      {!resolvido && (onResolve || onViewPatient) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
          {onViewPatient && (
            <button
              onClick={onViewPatient}
              className="flex-1 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Ver Ficha
            </button>
          )}
          {onResolve && (
            <button
              onClick={onResolve}
              className="flex-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600/30 transition-colors font-medium"
            >
              Marcar como Resolvido
            </button>
          )}
        </div>
      )}
    </div>
  )
}
