import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, AlertTriangle } from 'lucide-react'
import { useCriarAvaliacao, useGestantes } from '../hooks/useGestantes'
import { useAuthContext } from '../contexts/AuthContext'
import { avaliarAlertasClinicosLocais } from '../lib/alertas'
import { calcularPredicao, COEFICIENTES_PADRAO } from '../lib/predict'
import { RiskBadge } from '../components/RiskBadge'
import { BarraRisco } from '../components/BarraRisco'
import type { Gestante } from '../types/supabase'

const schema = z.object({
  gestante_id: z.string().uuid('Selecione uma gestante'),
  idade_gestacional: z.coerce.number().min(16, 'Mínimo 16 semanas').max(42, 'Máximo 42 semanas'),
  pas: z.coerce.number().min(80, 'PAS mínima 80').max(220, 'PAS máxima 220'),
  pad: z.coerce.number().min(40, 'PAD mínima 40').max(150, 'PAD máxima 150'),
  proteinuria: z.coerce.number().min(0).max(3),
  plaquetas: z.coerce.number().min(10000).max(600000).optional().or(z.literal('')),
  creatinina: z.coerce.number().min(0.3).max(10).optional().or(z.literal('')),
  tgo: z.coerce.number().min(5).max(2000).optional().or(z.literal('')),
  tgp: z.coerce.number().min(5).max(2000).optional().or(z.literal('')),
  acido_urico: z.coerce.number().min(1).max(15).optional().or(z.literal('')),
  sflt_plgf: z.coerce.number().min(0).max(1000).optional().or(z.literal('')),
  peso: z.coerce.number().min(30).max(200).optional().or(z.literal('')),
  sintomas: z.array(z.string()).default([]),
  nota: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const SINTOMAS_OPCOES = [
  { value: 'cefaleia', label: 'Cefaleia' },
  { value: 'disturbios_visuais', label: 'Distúrbios visuais' },
  { value: 'dor_epigastrica', label: 'Dor epigástrica' },
  { value: 'edema', label: 'Edema' },
  { value: 'dispneia', label: 'Dispneia' },
  { value: 'nausea', label: 'Náusea/vômitos' },
]

export function NovaConsultaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthContext()
  const { data: gestantes } = useGestantes()
  const criarAvaliacao = useCriarAvaliacao()
  const [previewRisco, setPreviewRisco] = useState<ReturnType<typeof calcularPredicao> | null>(null)
  const [gestanteSelecionada, setGestanteSelecionada] = useState<Gestante | null>(null)

  const {
    register, handleSubmit, control, watch, setValue, getValues,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gestante_id: searchParams.get('gestante') ?? '',
      proteinuria: 0,
      sintomas: [],
    }
  })

  const gestanteId = watch('gestante_id')
  const sintomasWatch = watch('sintomas')

  React.useEffect(() => {
    if (gestanteId && gestantes) {
      const g = gestantes.find(x => x.id === gestanteId) ?? null
      setGestanteSelecionada(g)
    }
  }, [gestanteId, gestantes])

  // Preview local do escore ao mudar campos
  const calcularPreview = () => {
    if (!gestanteSelecionada) return
    const vals = getValues()
    const prev = calcularPredicao(
      {
        pas: Number(vals.pas) || 120,
        pad: Number(vals.pad) || 80,
        proteinuria: Number(vals.proteinuria) || 0,
        plaquetas: vals.plaquetas ? Number(vals.plaquetas) : undefined,
        creatinina: vals.creatinina ? Number(vals.creatinina) : undefined,
        tgo: vals.tgo ? Number(vals.tgo) : undefined,
        acido_urico: vals.acido_urico ? Number(vals.acido_urico) : undefined,
        sflt_plgf: vals.sflt_plgf ? Number(vals.sflt_plgf) : null,
        sintomas: vals.sintomas ?? [],
        idade_gestacional: Number(vals.idade_gestacional) || 20,
      },
      {
        data_nascimento: gestanteSelecionada.data_nascimento,
        imc_pre_gestacional: gestanteSelecionada.imc_pre_gestacional,
        pe_gestacao_anterior: gestanteSelecionada.pe_gestacao_anterior,
        hipertensao_cronica: gestanteSelecionada.hipertensao_cronica,
        nuliparidade: gestanteSelecionada.nuliparidade,
        diabetes: gestanteSelecionada.diabetes,
        gestacao_multipla: gestanteSelecionada.gestacao_multipla,
      },
      COEFICIENTES_PADRAO
    )
    setPreviewRisco(prev)
  }

  const onSubmit = async (data: FormData) => {
    try {
      const avaliacao = await criarAvaliacao.mutateAsync({
        gestante_id: data.gestante_id,
        data: new Date().toISOString(),
        idade_gestacional: data.idade_gestacional,
        pas: data.pas,
        pad: data.pad,
        proteinuria: data.proteinuria,
        plaquetas: data.plaquetas ? Number(data.plaquetas) : undefined,
        creatinina: data.creatinina ? Number(data.creatinina) : undefined,
        tgo: data.tgo ? Number(data.tgo) : undefined,
        tgp: data.tgp ? Number(data.tgp) : undefined,
        acido_urico: data.acido_urico ? Number(data.acido_urico) : undefined,
        sflt_plgf: data.sflt_plgf ? Number(data.sflt_plgf) : null,
        peso: data.peso ? Number(data.peso) : undefined,
        sintomas: data.sintomas ?? [],
        nota: data.nota,
        registrado_por: user?.id,
      })
      toast.success('Consulta registrada! Predição e alertas gerados automaticamente.')
      navigate(`/gestantes/${avaliacao.gestante_id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar consulta'
      toast.error(msg)
    }
  }

  // Alertas locais como preview
  const alertasLocais = previewRisco && (() => {
    const vals = getValues()
    return avaliarAlertasClinicosLocais({
      pas: Number(vals.pas) || 120,
      pad: Number(vals.pad) || 80,
      proteinuria: Number(vals.proteinuria) || 0,
      plaquetas: vals.plaquetas ? Number(vals.plaquetas) : undefined,
      creatinina: vals.creatinina ? Number(vals.creatinina) : undefined,
      tgo: vals.tgo ? Number(vals.tgo) : undefined,
      sintomas: vals.sintomas ?? [],
    })
  })()

  const inputClass = "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 font-mono placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
  const labelClass = "block text-xs font-medium text-slate-400 mb-1"
  const errorClass = "mt-1 text-xs text-red-400"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-900/50 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-100">Nova Consulta</h1>
        <p className="text-sm text-slate-500 mt-0.5">Registre os dados da avaliação — predição e alertas são gerados automaticamente</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} onChange={calcularPreview} className="max-w-4xl mx-auto px-6 py-4 space-y-4">

          {/* Seleção de gestante */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Gestante</h2>
            <div>
              <label className={labelClass}>Selecione a gestante *</label>
              <select
                {...register('gestante_id')}
                className={inputClass}
              >
                <option value="">-- Selecione --</option>
                {gestantes?.map(g => (
                  <option key={g.id} value={g.id}>{g.nome} — {g.prontuario}</option>
                ))}
              </select>
              {errors.gestante_id && <p className={errorClass}>{errors.gestante_id.message}</p>}
            </div>
          </div>

          {/* Dados hemodinâmicos */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Dados Hemodinâmicos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>IG (semanas) *</label>
                <input {...register('idade_gestacional')} type="number" step="0.1" placeholder="28.0" className={inputClass} />
                {errors.idade_gestacional && <p className={errorClass}>{errors.idade_gestacional.message}</p>}
              </div>
              <div>
                <label className={labelClass}>PAS (mmHg) *</label>
                <input {...register('pas')} type="number" placeholder="120" className={inputClass} />
                {errors.pas && <p className={errorClass}>{errors.pas.message}</p>}
              </div>
              <div>
                <label className={labelClass}>PAD (mmHg) *</label>
                <input {...register('pad')} type="number" placeholder="80" className={inputClass} />
                {errors.pad && <p className={errorClass}>{errors.pad.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Peso (kg)</label>
                <input {...register('peso')} type="number" step="0.1" placeholder="70.0" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Exames laboratoriais */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Exames Laboratoriais</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Proteinúria * (0–3+)</label>
                <select {...register('proteinuria')} className={inputClass}>
                  {[0,1,2,3].map(v => <option key={v} value={v}>{v === 0 ? 'Negativa' : `${v}+`}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Plaquetas (/µL)</label>
                <input {...register('plaquetas')} type="number" placeholder="180000" className={inputClass} />
                {errors.plaquetas && <p className={errorClass}>{String(errors.plaquetas.message)}</p>}
              </div>
              <div>
                <label className={labelClass}>Creatinina (mg/dL)</label>
                <input {...register('creatinina')} type="number" step="0.01" placeholder="0.80" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>TGO / AST (U/L)</label>
                <input {...register('tgo')} type="number" placeholder="25" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>TGP / ALT (U/L)</label>
                <input {...register('tgp')} type="number" placeholder="20" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ácido Úrico (mg/dL)</label>
                <input {...register('acido_urico')} type="number" step="0.1" placeholder="4.0" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>sFlt-1/PlGF</label>
                <input {...register('sflt_plgf')} type="number" step="0.1" placeholder="—" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Sintomas */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Sintomas Relatados</h2>
            <Controller
              name="sintomas"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SINTOMAS_OPCOES.map(s => {
                    const checked = (field.value ?? []).includes(s.value)
                    const isGrave = ['cefaleia','disturbios_visuais','dor_epigastrica'].includes(s.value)
                    return (
                      <label
                        key={s.value}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors text-sm
                          ${checked
                            ? isGrave
                              ? 'border-red-500/40 bg-red-500/10 text-red-300'
                              : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                            : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...(field.value ?? []), s.value]
                              : (field.value ?? []).filter((v: string) => v !== s.value)
                            field.onChange(next)
                            setTimeout(calcularPreview, 0)
                          }}
                          className="hidden"
                        />
                        <span className={`h-4 w-4 rounded flex items-center justify-center border flex-shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                          {checked && <span className="text-white text-xs">✓</span>}
                        </span>
                        {s.label}
                        {isGrave && <span className="ml-auto text-xs text-red-500">⚠</span>}
                      </label>
                    )
                  })}
                </div>
              )}
            />
          </div>

          {/* Nota clínica */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Nota Clínica</h2>
            <textarea
              {...register('nota')}
              rows={3}
              placeholder="Observações clínicas relevantes..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Preview do escore */}
          {previewRisco && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
              <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-4">
                Prévia do Escore (estimativa local)
              </h2>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-3xl font-bold font-mono text-slate-100">
                  {Math.round(previewRisco.probabilidade * 100)}%
                </span>
                <RiskBadge nivel={previewRisco.nivel} size="md" />
              </div>
              <BarraRisco
                probabilidade={previewRisco.probabilidade}
                nivel={previewRisco.nivel}
                height="h-2.5"
              />
              <p className="text-xs text-slate-600 mt-2">
                * O escore final é calculado pelo servidor e pode diferir levemente.
              </p>

              {/* Alertas locais preview */}
              {alertasLocais && alertasLocais.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Alertas que serão gerados:</p>
                  {alertasLocais.map((a, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs
                      ${a.severidade === 'grave' ? 'border-red-500/30 bg-red-500/5 text-red-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-300'}`}>
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      {a.descricao}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criarAvaliacao.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
            >
              {criarAvaliacao.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                : <><Save className="h-4 w-4" /> Registrar Consulta</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
