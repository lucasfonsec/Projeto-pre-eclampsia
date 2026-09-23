import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { useAvaliacoes, useGestantes } from '../hooks/useGestantes'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { RiskBadge } from '../components/RiskBadge'
import { Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PontoEvolutivo {
  ig: number
  data: string
  probabilidade: number | null
  pas: number
  pad: number
  nivel: string | null
}

function useEvolucaoGestante(gestanteId: string) {
  return useQuery({
    queryKey: ['evolucao', gestanteId],
    queryFn: async () => {
      const { data: avaliacoes, error } = await supabase
        .from('avaliacoes')
        .select('id, data, idade_gestacional, pas, pad, proteinuria')
        .eq('gestante_id', gestanteId)
        .order('data', { ascending: true })
      if (error) throw error

      // Buscar predições para essas avaliações
      const ids = avaliacoes.map(a => a.id)
      const { data: predicoes } = ids.length > 0
        ? await supabase.from('predicoes').select('avaliacao_id, probabilidade, nivel').in('avaliacao_id', ids)
        : { data: [] }

      const predMap = new Map((predicoes ?? []).map(p => [p.avaliacao_id, p]))

      return avaliacoes.map<PontoEvolutivo>(av => {
        const pred = predMap.get(av.id)
        return {
          ig: av.idade_gestacional,
          data: format(new Date(av.data), 'dd/MM/yy', { locale: ptBR }),
          probabilidade: pred?.probabilidade != null ? Number((pred.probabilidade * 100).toFixed(1)) : null,
          pas: av.pas,
          pad: av.pad,
          nivel: pred?.nivel ?? null,
        }
      })
    },
    enabled: !!gestanteId,
  })
}

const CORES = ['#818cf8', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#a78bfa']

export function EvolucaoPage() {
  const navigate = useNavigate()
  const { data: gestantes } = useGestantes()
  const [selecionadas, setSelecionadas] = useState<string[]>([])

  const toggleGestante = (id: string) => {
    setSelecionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev.slice(-2), id] // máx 3
    )
  }

  // Dados da primeira gestante selecionada para o gráfico principal
  const gestantePrimaria = selecionadas[0]
  const { data: evolucao, isLoading, isError } = useEvolucaoGestante(gestantePrimaria ?? '')

  const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
    if (!active || !(payload as unknown[])?.length) return null
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs shadow-xl">
        <p className="font-medium text-slate-300 mb-2">IG: {String(label)} semanas</p>
        {(payload as Array<{name: string; value: number; color: string}>).map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-mono text-slate-200">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-900/50 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-100">Evolução de Risco</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gráfico de probabilidade de progressão por idade gestacional
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Seleção de gestantes */}
          <div className="xl:col-span-1">
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Selecionar Gestantes
              </h2>
              <p className="text-xs text-slate-600 mb-3">Selecione até 3 para comparar</p>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {gestantes?.map((g, i) => {
                  const selected = selecionadas.includes(g.id)
                  const cor = CORES[selecionadas.indexOf(g.id)] ?? '#64748b'
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGestante(g.id)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs transition-all
                        ${selected
                          ? 'border bg-slate-800'
                          : 'border border-transparent hover:bg-slate-800/50 text-slate-400'
                        }`}
                      style={selected ? { borderColor: cor + '50', color: cor } : {}}
                    >
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0 border-2"
                        style={{ borderColor: selected ? cor : '#475569', backgroundColor: selected ? cor : 'transparent' }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{g.nome}</p>
                        <p className="text-slate-600 font-mono">{g.prontuario}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="xl:col-span-3 space-y-4">
            {selecionadas.length === 0 && (
              <div className="flex h-64 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/60">
                <p className="text-slate-500 text-sm">Selecione uma ou mais gestantes para visualizar a evolução</p>
              </div>
            )}

            {gestantePrimaria && (
              <>
                {isLoading && (
                  <div className="flex h-64 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/60">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                )}

                {isError && (
                  <div className="flex h-64 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/60">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Erro ao carregar evolução</p>
                    </div>
                  </div>
                )}

                {!isLoading && !isError && evolucao && (
                  <>
                    {/* Gráfico de probabilidade */}
                    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
                      <h3 className="text-sm font-semibold text-slate-300 mb-4">
                        Probabilidade de Progressão para PE (%)
                      </h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={evolucao} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis
                            dataKey="ig"
                            stroke="#64748b"
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            label={{ value: 'Idade Gestacional (sem)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }}
                          />
                          <YAxis
                            stroke="#64748b"
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            domain={[0, 100]}
                            tickFormatter={v => `${v}%`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <ReferenceLine y={30} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: 'Moderado', fill: '#fbbf24', fontSize: 10 }} />
                          <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Alto', fill: '#ef4444', fontSize: 10 }} />
                          <Line
                            type="monotone"
                            dataKey="probabilidade"
                            name="Prob. PE (%)"
                            stroke="#818cf8"
                            strokeWidth={2.5}
                            dot={{ fill: '#818cf8', r: 4 }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Gráfico de PA */}
                    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
                      <h3 className="text-sm font-semibold text-slate-300 mb-4">
                        Pressão Arterial (mmHg)
                      </h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={evolucao} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="ig" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[60, 180]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                          <ReferenceLine y={140} stroke="#fbbf24" strokeDasharray="3 3" />
                          <ReferenceLine y={160} stroke="#ef4444" strokeDasharray="3 3" />
                          <Line
                            type="monotone"
                            dataKey="pas"
                            name="PAS (mmHg)"
                            stroke="#f87171"
                            strokeWidth={2}
                            dot={{ fill: '#f87171', r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="pad"
                            name="PAD (mmHg)"
                            stroke="#fb923c"
                            strokeWidth={2}
                            dot={{ fill: '#fb923c', r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Pontos em tabela */}
                    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Dados por Avaliação</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-700/50">
                              <th className="py-2 px-3 text-left text-slate-500">Data</th>
                              <th className="py-2 px-3 text-left text-slate-500">IG (sem)</th>
                              <th className="py-2 px-3 text-left text-slate-500">PA</th>
                              <th className="py-2 px-3 text-left text-slate-500">Prob. PE</th>
                              <th className="py-2 px-3 text-left text-slate-500">Nível</th>
                              <th className="py-2 px-3 text-left text-slate-500">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evolucao.map((ponto, i) => (
                              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                <td className="py-2 px-3">{ponto.data}</td>
                                <td className="py-2 px-3 font-mono">{ponto.ig.toFixed(1)}</td>
                                <td className={`py-2 px-3 font-mono ${ponto.pas >= 160 ? 'text-red-400' : ponto.pas >= 140 ? 'text-amber-400' : ''}`}>
                                  {ponto.pas}/{ponto.pad}
                                </td>
                                <td className="py-2 px-3 font-mono">
                                  {ponto.probabilidade != null ? `${ponto.probabilidade}%` : '—'}
                                </td>
                                <td className="py-2 px-3">
                                  <RiskBadge nivel={ponto.nivel as 'baixo' | 'moderado' | 'alto' | null} size="sm" />
                                </td>
                                <td className="py-2 px-3">
                                  <button
                                    onClick={() => navigate(`/gestantes/${gestantePrimaria}`)}
                                    className="text-indigo-400 hover:text-indigo-300"
                                  >
                                    Ver ficha →
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
