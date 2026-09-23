import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle, AlertTriangle, ShieldAlert, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAlertas, useResolverAlerta, useGestantes } from '../hooks/useGestantes'
import { AlertCard } from '../components/AlertCard'
import { useAuthContext } from '../contexts/AuthContext'
import { toast } from 'sonner'
import type { Severidade } from '../types/supabase'

const TABS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'abertos', label: 'Alertas Abertos', icon: <Bell className="h-4 w-4" /> },
  { value: 'resolvidos', label: 'Resolvidos', icon: <CheckCircle className="h-4 w-4" /> },
]

const SEV_ORDER: Severidade[] = ['grave', 'atencao', 'informativo']

export function AlertasPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [tab, setTab] = useState('abertos')
  const resolverAlerta = useResolverAlerta()

  const { data: alertas, isLoading, isError, refetch, isFetching } = useAlertas()
  const { data: gestantes } = useGestantes()

  const gestanteNome = (id: string) => gestantes?.find(g => g.id === id)?.nome ?? id

  const alertasExibidos = alertas?.filter(a =>
    tab === 'abertos' ? !a.resolvido : a.resolvido
  ) ?? []

  // Agrupar por severidade
  const porSeveridade = SEV_ORDER.reduce<Record<string, typeof alertasExibidos>>(
    (acc, sev) => {
      acc[sev] = alertasExibidos.filter(a => a.severidade === sev)
      return acc
    },
    {}
  )

  const handleResolve = async (id: string) => {
    if (!user) return
    try {
      await resolverAlerta.mutateAsync({ id, userId: user.id })
      toast.success('Alerta resolvido')
    } catch {
      toast.error('Erro ao resolver alerta')
    }
  }

  const counts = {
    abertos: alertas?.filter(a => !a.resolvido).length ?? 0,
    graves: alertas?.filter(a => !a.resolvido && a.severidade === 'grave').length ?? 0,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4 bg-slate-900/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-100">Central de Alertas</h1>
          {counts.abertos > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
              {counts.abertos}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      {counts.graves > 0 && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-6 py-2 flex-shrink-0">
          <ShieldAlert className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">
            <strong>{counts.graves}</strong> alerta{counts.graves > 1 ? 's' : ''} grave{counts.graves > 1 ? 's' : ''} requer{counts.graves > 1 ? 'em' : ''} atenção imediata
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 px-6 bg-slate-900/30 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${tab === t.value
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
          >
            {t.icon} {t.label}
            {t.value === 'abertos' && counts.abertos > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 text-xs text-red-400 px-1">
                {counts.abertos}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-slate-300">Erro ao carregar alertas</p>
            <button onClick={() => refetch()} className="text-sm text-indigo-400">Tentar novamente</button>
          </div>
        )}

        {!isLoading && !isError && alertasExibidos.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 opacity-50" />
            <p className="text-slate-300 font-medium">
              {tab === 'abertos' ? 'Nenhum alerta aberto!' : 'Nenhum alerta resolvido'}
            </p>
            <p className="text-sm text-slate-500">
              {tab === 'abertos' ? 'Todas as gestantes estão dentro dos parâmetros normais.' : ''}
            </p>
          </div>
        )}

        {!isLoading && !isError && alertasExibidos.length > 0 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {SEV_ORDER.map(sev => {
              const lista = porSeveridade[sev]
              if (!lista.length) return null
              const label = sev === 'grave' ? 'Graves' : sev === 'atencao' ? 'Atenção' : 'Informativos'
              const color = sev === 'grave' ? 'text-red-400' : sev === 'atencao' ? 'text-amber-400' : 'text-blue-400'
              return (
                <div key={sev}>
                  <div className="flex items-center gap-2 mb-3">
                    {sev === 'grave' && <ShieldAlert className={`h-4 w-4 ${color}`} />}
                    {sev === 'atencao' && <AlertTriangle className={`h-4 w-4 ${color}`} />}
                    <h3 className={`text-sm font-semibold uppercase tracking-wide ${color}`}>
                      {label} ({lista.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {lista.map(alerta => (
                      <div key={alerta.id} className="space-y-2">
                        <p className="text-xs text-slate-500 px-1">
                          Gestante: <span className="text-slate-300">{gestanteNome(alerta.gestante_id)}</span>
                        </p>
                        <AlertCard
                          severidade={alerta.severidade}
                          tipo={alerta.tipo}
                          descricao={alerta.descricao}
                          timestamp={alerta.criado_em}
                          resolvido={alerta.resolvido}
                          onResolve={tab === 'abertos' ? () => handleResolve(alerta.id) : undefined}
                          onViewPatient={() => navigate(`/gestantes/${alerta.gestante_id}`)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
