import React from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { useEstatisticas, useModeloAtivo } from '../hooks/useGestantes'
import { Loader2, AlertCircle, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

const RISCO_COLORS = {
  baixo: '#10b981',
  moderado: '#f59e0b',
  alto: '#ef4444',
}

function StatCard({ label, value, sub, color = 'indigo' }: {
  label: string; value: React.ReactNode; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold font-mono ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}

export function RelatoriosPage() {
  const { data: stats, isLoading: loadStats, isError: errStats } = useEstatisticas()
  const { data: modelo, isLoading: loadModelo } = useModeloAtivo()

  const exportarCSV = async () => {
    try {
      const { data } = await supabase.from('gestantes').select('*')
      if (!data) return
      const headers = Object.keys(data[0]).join(',')
      const rows = data.map(r => Object.values(r).map(v => JSON.stringify(v ?? '')).join(',')).join('\n')
      const blob = new Blob([headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `predgest_gestantes_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      toast.success('CSV exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar dados')
    }
  }

  if (loadStats) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (errStats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-300">Erro ao carregar estatísticas</p>
        </div>
      </div>
    )
  }

  const dadosPizza = [
    { name: 'Baixo', value: Number(stats?.risco_baixo ?? 0), color: RISCO_COLORS.baixo },
    { name: 'Moderado', value: Number(stats?.risco_moderado ?? 0), color: RISCO_COLORS.moderado },
    { name: 'Alto', value: Number(stats?.risco_alto ?? 0), color: RISCO_COLORS.alto },
  ].filter(d => d.value > 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4 bg-slate-900/50 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Relatórios & Modelo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Estatísticas da unidade e métricas do modelo preditivo</p>
        </div>
        <button
          onClick={exportarCSV}
          className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 transition-colors"
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Estatísticas gerais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total de Gestantes"
            value={stats?.total_gestantes ?? 0}
            sub="gestantes ativas"
            color="indigo"
          />
          <StatCard
            label="Alertas Abertos"
            value={stats?.alertas_abertos ?? 0}
            sub="aguardando resolução"
            color={Number(stats?.alertas_abertos) > 0 ? 'red' : 'emerald'}
          />
          <StatCard
            label="Total de Avaliações"
            value={stats?.total_avaliacoes ?? 0}
            sub="consultas registradas"
            color="indigo"
          />
          <StatCard
            label="IG Média"
            value={stats?.media_ig != null ? `${Number(stats.media_ig).toFixed(1)}sem` : '—'}
            sub="idade gestacional média"
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Distribuição de risco */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Distribuição por Nível de Risco</h2>

            {dadosPizza.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dadosPizza}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {dadosPizza.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: 'Baixo', count: stats?.risco_baixo ?? 0, color: 'emerald' },
                    { label: 'Moderado', count: stats?.risco_moderado ?? 0, color: 'amber' },
                    { label: 'Alto', count: stats?.risco_alto ?? 0, color: 'red' },
                  ].map(item => (
                    <div key={item.label} className="text-center rounded-lg bg-slate-800/50 py-2">
                      <p className={`text-2xl font-bold font-mono text-${item.color}-400`}>{item.count}</p>
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Sem dados suficientes</p>
            )}
          </div>

          {/* Modelo ML */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Modelo Preditivo Ativo</h2>
            {loadModelo ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : modelo ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    ✓ Ativo
                  </span>
                  <span className="font-mono text-sm text-slate-200">{modelo.versao}</span>
                  <span className="text-xs text-slate-500">{modelo.algoritmo.replace('_', ' ')}</span>
                </div>

                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={[
                      { name: 'AUC', value: Number((modelo.auc ?? 0) * 100) },
                      { name: 'Sensib.', value: Number((modelo.sensibilidade ?? 0) * 100) },
                      { name: 'Especif.', value: Number((modelo.especificidade ?? 0) * 100) },
                    ]}
                    margin={{ top: 5, right: 10, bottom: 5, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#334155" tickFormatter={v => `${v}%`} />
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(1)}%`]}
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                    />
                    <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                    <span className="text-slate-500">AUC</span>
                    <span className="float-right font-mono text-indigo-400">{modelo.auc?.toFixed(3)}</span>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                    <span className="text-slate-500">Sensibilidade</span>
                    <span className="float-right font-mono text-indigo-400">{((modelo.sensibilidade ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                    <span className="text-slate-500">Especificidade</span>
                    <span className="float-right font-mono text-indigo-400">{((modelo.especificidade ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                    <span className="text-slate-500">Amostra treino</span>
                    <span className="float-right font-mono text-indigo-400">{modelo.amostra_treino?.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                  <p className="text-xs text-amber-500/80">
                    ⚕️ Ferramenta de apoio à decisão. Não substitui avaliação médica.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">Nenhum modelo ativo encontrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
