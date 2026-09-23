import React, { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, AlertCircle, Loader2, FilePlus,
  Calendar, User, Activity,
} from 'lucide-react'
import {
  useGestante, useAvaliacoes, useAlertasGestante, useCondutas,
} from '../hooks/useGestantes'
import { RiskBadge } from '../components/RiskBadge'
import { BarraRisco } from '../components/BarraRisco'
import { AlertCard } from '../components/AlertCard'
import { useResolverAlerta } from '../hooks/useGestantes'
import { useAuthContext } from '../contexts/AuthContext'
import { differenceInYears, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LABEL_FATORES } from '../lib/predict'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

function useRiscoAtualGestante(gestanteId: string) {
  return useQuery({
    queryKey: ['risco_atual', gestanteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_risco_atual')
        .select('*')
        .eq('gestante_id', gestanteId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!gestanteId,
  })
}

export function FichaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const resolverAlerta = useResolverAlerta()

  const { data: gestante, isLoading: loadGestante, isError: errGestante } = useGestante(id!)
  const { data: avaliacoes, isLoading: loadAv } = useAvaliacoes(id!)
  const { data: alertas, isLoading: loadAlerts } = useAlertasGestante(id!)
  const { data: condutas } = useCondutas(id!)
  const { data: riscoAtual } = useRiscoAtualGestante(id!)

  const loading = loadGestante || loadAv || loadAlerts

  const contribuicoes = useMemo(() => {
    if (!riscoAtual?.contribuicoes) return []
    return Object.entries(riscoAtual.contribuicoes)
      .map(([key, value]) => ({
        key,
        label: LABEL_FATORES[key] ?? key,
        pct: Number(value),
      }))
      .filter(c => c.pct > 0)
      .sort((a, b) => b.pct - a.pct)
  }, [riscoAtual])

  const handleResolve = async (alertaId: string) => {
    if (!user) return
    try {
      await resolverAlerta.mutateAsync({ id: alertaId, userId: user.id })
      toast.success('Alerta marcado como resolvido')
    } catch {
      toast.error('Erro ao resolver alerta')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (errGestante || !gestante) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-300">Gestante não encontrada</p>
          <button onClick={() => navigate('/triagem')} className="mt-3 text-sm text-indigo-400">
            ← Voltar à triagem
          </button>
        </div>
      </div>
    )
  }

  const idade = differenceInYears(new Date(), new Date(gestante.data_nascimento))
  const ultimaAv = avaliacoes?.[0]
  const alertasAbertos = alertas?.filter(a => !a.resolvido) ?? []
  const alertasResolvidos = alertas?.filter(a => a.resolvido) ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-700/50 px-6 py-4 bg-slate-900/50 flex-shrink-0">
        <button
          onClick={() => navigate('/triagem')}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Triagem
        </button>
        <span className="text-slate-600">/</span>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-lg font-bold text-slate-100">{gestante.nome}</h1>
          <span className="font-mono text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
            {gestante.prontuario}
          </span>
          <RiskBadge nivel={riscoAtual?.nivel} />
        </div>
        <button
          onClick={() => navigate(`/nova-consulta?gestante=${id}`)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <FilePlus className="h-4 w-4" /> Nova Consulta
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Col 1: Dados basais */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Dados Basais</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Idade</span>
                  <span className="font-mono text-slate-200">{idade} anos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IMC pré-gestacional</span>
                  <span className="font-mono text-slate-200">
                    {gestante.imc_pre_gestacional?.toFixed(1) ?? '—'} kg/m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gesta / Para</span>
                  <span className="font-mono text-slate-200">G{gestante.gesta}P{gestante.para}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DUM</span>
                  <span className="font-mono text-slate-200">
                    {gestante.dum ? format(new Date(gestante.dum), 'dd/MM/yyyy') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DPP</span>
                  <span className="font-mono text-slate-200">
                    {gestante.dpp ? format(new Date(gestante.dpp), 'dd/MM/yyyy') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fatores de risco */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Fatores de Risco</h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Nuliparidade', value: gestante.nuliparidade },
                  { label: 'PE em gestação anterior', value: gestante.pe_gestacao_anterior },
                  { label: 'Hipertensão crônica', value: gestante.hipertensao_cronica },
                  { label: 'Diabetes', value: gestante.diabetes },
                  { label: 'Gestação múltipla', value: gestante.gestacao_multipla },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between">
                    <span className="text-slate-500">{f.label}</span>
                    <span className={`font-medium ${f.value ? 'text-amber-400' : 'text-slate-600'}`}>
                      {f.value ? 'Sim' : 'Não'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Escore atual */}
            {riscoAtual && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Escore de Risco Atual</h2>
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold font-mono text-slate-100">
                    {riscoAtual.probabilidade != null
                      ? `${Math.round(riscoAtual.probabilidade * 100)}%`
                      : '—'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">probabilidade de progressão para PE</p>
                </div>
                <BarraRisco
                  probabilidade={riscoAtual.probabilidade}
                  nivel={riscoAtual.nivel}
                  height="h-3"
                />
                <p className="text-xs text-slate-600 mt-3 text-center">
                  Janela de predição: 4 semanas
                </p>
              </div>
            )}
          </div>

          {/* Col 2: Contribuições + Última avaliação */}
          <div className="space-y-4">
            {/* Contribuições relativas */}
            {contribuicoes.length > 0 && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Fatores Contribuintes
                  <span className="ml-2 text-xs font-normal text-slate-600">(% de cada fator)</span>
                </h2>
                <div className="space-y-2.5">
                  {contribuicoes.slice(0, 10).map(c => (
                    <div key={c.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{c.label}</span>
                        <span className="text-xs font-mono text-slate-300 tabular-nums">{c.pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Última avaliação */}
            {ultimaAv && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Última Avaliação
                  <span className="ml-2 text-xs font-normal text-slate-600">
                    {format(new Date(ultimaAv.data), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'IG', value: `${ultimaAv.idade_gestacional.toFixed(1)} sem`, mono: true },
                    { label: 'PA', value: `${ultimaAv.pas}/${ultimaAv.pad} mmHg`, mono: true,
                      highlight: ultimaAv.pas >= 160 || ultimaAv.pad >= 110 ? 'red' : ultimaAv.pas >= 140 || ultimaAv.pad >= 90 ? 'amber' : undefined },
                    { label: 'Proteinúria', value: `${ultimaAv.proteinuria}+`, mono: true,
                      highlight: ultimaAv.proteinuria >= 2 ? 'amber' : undefined },
                    { label: 'Plaquetas', value: ultimaAv.plaquetas ? `${Math.round(ultimaAv.plaquetas / 1000)}k/µL` : '—', mono: true,
                      highlight: ultimaAv.plaquetas && ultimaAv.plaquetas < 100000 ? 'red' : undefined },
                    { label: 'Creatinina', value: ultimaAv.creatinina ? `${ultimaAv.creatinina.toFixed(2)} mg/dL` : '—', mono: true,
                      highlight: ultimaAv.creatinina && ultimaAv.creatinina > 1.1 ? 'red' : undefined },
                    { label: 'TGO', value: ultimaAv.tgo ? `${ultimaAv.tgo} U/L` : '—', mono: true,
                      highlight: ultimaAv.tgo && ultimaAv.tgo > 70 ? 'red' : undefined },
                    { label: 'Ácido Úrico', value: ultimaAv.acido_urico ? `${ultimaAv.acido_urico.toFixed(1)} mg/dL` : '—', mono: true },
                    { label: 'sFlt-1/PlGF', value: ultimaAv.sflt_plgf != null ? `${ultimaAv.sflt_plgf.toFixed(1)}` : '—', mono: true },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-slate-800/50 px-3 py-2.5">
                      <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                      <p className={`font-semibold ${item.mono ? 'font-mono' : ''} ${
                        item.highlight === 'red' ? 'text-red-400' :
                        item.highlight === 'amber' ? 'text-amber-400' :
                        'text-slate-200'
                      }`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
                {ultimaAv.sintomas && ultimaAv.sintomas.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-1.5">Sintomas relatados:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ultimaAv.sintomas.map(s => (
                        <span key={s} className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs text-red-400">
                          {s.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Col 3: Alertas + Histórico + Condutas */}
          <div className="space-y-4">
            {/* Alertas abertos */}
            {alertasAbertos.length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/3 p-5">
                <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3">
                  Alertas Ativos ({alertasAbertos.length})
                </h2>
                <div className="space-y-2">
                  {alertasAbertos.map(a => (
                    <AlertCard
                      key={a.id}
                      severidade={a.severidade}
                      tipo={a.tipo}
                      descricao={a.descricao}
                      timestamp={a.criado_em}
                      onResolve={() => handleResolve(a.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de avaliações */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Histórico de Avaliações
              </h2>
              {loadAv ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                </div>
              ) : avaliacoes && avaliacoes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {avaliacoes.map(av => (
                    <div key={av.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-400">{format(new Date(av.data), 'dd/MM/yy', { locale: ptBR })}</span>
                        <span className="font-mono text-slate-300">{av.idade_gestacional.toFixed(1)}sem</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`${(av.pas >= 140 || av.pad >= 90) ? 'text-amber-400' : 'text-slate-300'}`}>
                          {av.pas}/{av.pad}
                        </span>
                        <span className="text-slate-500">|</span>
                        <span className={`${av.proteinuria >= 2 ? 'text-amber-400' : 'text-slate-400'}`}>
                          P{av.proteinuria}+
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 text-center py-4">Nenhuma avaliação registrada</p>
              )}
            </div>

            {/* Condutas */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Condutas Registradas
              </h2>
              {condutas && condutas.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {condutas.map((c: Record<string, unknown>) => (
                    <div key={c.id as string} className="rounded-lg border border-slate-700/30 bg-slate-800/30 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-indigo-400 capitalize">{(c.tipo as string)?.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-600">
                          {format(new Date(c.data as string), 'dd/MM/yy', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{c.descricao as string}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 text-center py-4">Nenhuma conduta registrada</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabela completa de avaliações */}
        {avaliacoes && avaliacoes.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Todas as Avaliações
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['Data', 'IG (sem)', 'PAS', 'PAD', 'Prot.', 'Plaq. (k)', 'Creat.', 'TGO', 'Ác. Úrico', 'Peso (kg)'].map(h => (
                      <th key={h} className="py-2 px-3 text-left font-medium text-slate-500 tabular-nums">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {avaliacoes.map(av => (
                    <tr key={av.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="py-2 px-3">{format(new Date(av.data), 'dd/MM/yy', { locale: ptBR })}</td>
                      <td className="py-2 px-3 font-mono">{av.idade_gestacional.toFixed(1)}</td>
                      <td className={`py-2 px-3 font-mono ${av.pas >= 160 ? 'text-red-400' : av.pas >= 140 ? 'text-amber-400' : ''}`}>{av.pas}</td>
                      <td className={`py-2 px-3 font-mono ${av.pad >= 110 ? 'text-red-400' : av.pad >= 90 ? 'text-amber-400' : ''}`}>{av.pad}</td>
                      <td className={`py-2 px-3 font-mono ${av.proteinuria >= 2 ? 'text-amber-400' : ''}`}>{av.proteinuria}+</td>
                      <td className={`py-2 px-3 font-mono ${av.plaquetas && av.plaquetas < 100000 ? 'text-red-400' : ''}`}>
                        {av.plaquetas ? Math.round(av.plaquetas / 1000) : '—'}
                      </td>
                      <td className={`py-2 px-3 font-mono ${av.creatinina && av.creatinina > 1.1 ? 'text-red-400' : ''}`}>
                        {av.creatinina?.toFixed(2) ?? '—'}
                      </td>
                      <td className={`py-2 px-3 font-mono ${av.tgo && av.tgo > 70 ? 'text-red-400' : ''}`}>
                        {av.tgo ?? '—'}
                      </td>
                      <td className="py-2 px-3 font-mono">{av.acido_urico?.toFixed(1) ?? '—'}</td>
                      <td className="py-2 px-3 font-mono">{av.peso?.toFixed(1) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
