import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { useTriagem, useUnidades } from '../hooks/useGestantes'
import { RiskBadge } from '../components/RiskBadge'
import { BarraRisco } from '../components/BarraRisco'
import type { NivelRisco } from '../types/supabase'
import { differenceInYears, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const NIVEIS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos os níveis' },
  { value: 'alto', label: 'Alto risco' },
  { value: 'moderado', label: 'Risco moderado' },
  { value: 'baixo', label: 'Baixo risco' },
]

function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('')
}

export function TriagemPage() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [nivelFiltro, setNivelFiltro] = useState('todos')
  const [unidadeFiltro, setUnidadeFiltro] = useState<number | undefined>()

  const { data: unidades } = useUnidades()
  const {
    data: gestantes,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useTriagem({
    busca: busca || undefined,
    nivel: nivelFiltro !== 'todos' ? nivelFiltro as NivelRisco : undefined,
    unidade_id: unidadeFiltro,
  })

  const handleVerFicha = (gestanteId: string) => {
    navigate(`/gestantes/${gestanteId}`)
  }

  const handleNovaConsulta = (gestanteId: string) => {
    navigate(`/nova-consulta?gestante=${gestanteId}`)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4 bg-slate-900/50 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Triagem — Fila de Risco</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestantes ordenadas por probabilidade de progressão para pré-eclâmpsia
          </p>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-700/30 px-6 py-3 bg-slate-900/30 flex-shrink-0">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou prontuário..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={nivelFiltro}
            onChange={e => setNivelFiltro(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>

          {unidades && unidades.length > 0 && (
            <select
              value={unidadeFiltro ?? ''}
              onChange={e => setUnidadeFiltro(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Todas as unidades</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          )}
        </div>

        {gestantes && (
          <span className="ml-auto text-xs text-slate-500">
            {gestantes.length} gestante{gestantes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-400">Carregando dados das gestantes...</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-slate-300 font-medium">Erro ao carregar dados</p>
              <p className="text-sm text-slate-500">Verifique sua conexão e tente novamente.</p>
              <button
                onClick={() => refetch()}
                className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 text-sm text-indigo-400 hover:bg-indigo-600/30 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && gestantes?.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <p className="text-slate-400 font-medium">Nenhuma gestante encontrada</p>
              <p className="text-sm text-slate-600 mt-1">Ajuste os filtros ou cadastre uma nova gestante.</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && gestantes && gestantes.length > 0 && (
          <div className="space-y-2">
            {gestantes.map(g => {
              const idadeAnos = g.data_nascimento
                ? differenceInYears(new Date(), new Date(g.data_nascimento))
                : null
              const dataAval = g.data_avaliacao
                ? format(new Date(g.data_avaliacao), "dd/MM/yy 'às' HH:mm", { locale: ptBR })
                : null

              return (
                <div
                  key={g.gestante_id}
                  className="group rounded-xl border border-slate-700/50 bg-slate-900/60 hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-200 p-4 cursor-pointer"
                  onClick={() => handleVerFicha(g.gestante_id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold
                      ${g.nivel === 'alto' ? 'bg-red-500/20 text-red-400' :
                        g.nivel === 'moderado' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'}`}
                    >
                      {iniciais(g.nome)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-100 truncate">{g.nome}</span>
                        <span className="text-xs text-slate-500 font-mono">{g.prontuario}</span>
                        <RiskBadge nivel={g.nivel} size="sm" />
                        {g.alertas_abertos > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs text-red-400">
                            🔔 {g.alertas_abertos} alerta{g.alertas_abertos > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-2">
                        {idadeAnos != null && <span>{idadeAnos} anos</span>}
                        {g.idade_gestacional && (
                          <span className="font-mono">
                            <strong className="text-slate-300">{g.idade_gestacional.toFixed(1)}</strong> sem IG
                          </span>
                        )}
                        {g.pas != null && g.pad != null && (
                          <span className="font-mono">
                            PA <strong className={`${(g.pas >= 160 || g.pad >= 110) ? 'text-red-400' : (g.pas >= 140 || g.pad >= 90) ? 'text-amber-400' : 'text-slate-300'}`}>
                              {g.pas}/{g.pad}
                            </strong> mmHg
                          </span>
                        )}
                        {g.proteinuria != null && g.proteinuria > 0 && (
                          <span className="font-mono">
                            Prot. <strong className="text-amber-400">{g.proteinuria}+</strong>
                          </span>
                        )}
                        {dataAval && <span>Última: {dataAval}</span>}
                      </div>

                      <BarraRisco
                        probabilidade={g.probabilidade}
                        nivel={g.nivel}
                        height="h-1.5"
                        className="max-w-xs"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleNovaConsulta(g.gestante_id) }}
                        className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-600/30 transition-colors whitespace-nowrap"
                      >
                        + Consulta
                      </button>
                    </div>
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
