import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { useCriarGestante, useUnidades } from '../hooks/useGestantes'

const schema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  prontuario: z.string().min(1, 'Prontuário obrigatório'),
  data_nascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  imc_pre_gestacional: z.coerce.number().min(14).max(60).optional().or(z.literal('')),
  gesta: z.coerce.number().min(1).max(20).default(1),
  para: z.coerce.number().min(0).max(20).default(0),
  nuliparidade: z.boolean().default(false),
  pe_gestacao_anterior: z.boolean().default(false),
  hipertensao_cronica: z.boolean().default(false),
  diabetes: z.boolean().default(false),
  gestacao_multipla: z.boolean().default(false),
  dum: z.string().optional(),
  dpp: z.string().optional(),
  unidade_id: z.coerce.number().positive('Selecione uma unidade'),
})

type FormData = z.infer<typeof schema>

export function CadastroGestantePage() {
  const navigate = useNavigate()
  const { data: unidades } = useUnidades()
  const criarGestante = useCriarGestante()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gesta: 1, para: 0 },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const gestante = await criarGestante.mutateAsync({
        nome: data.nome,
        prontuario: data.prontuario,
        data_nascimento: data.data_nascimento,
        imc_pre_gestacional: data.imc_pre_gestacional ? Number(data.imc_pre_gestacional) : undefined,
        gesta: data.gesta,
        para: data.para,
        nuliparidade: data.nuliparidade,
        pe_gestacao_anterior: data.pe_gestacao_anterior,
        hipertensao_cronica: data.hipertensao_cronica,
        diabetes: data.diabetes,
        gestacao_multipla: data.gestacao_multipla,
        dum: data.dum || undefined,
        dpp: data.dpp || undefined,
        unidade_id: data.unidade_id,
        ativa: true,
      })
      toast.success('Gestante cadastrada com sucesso!')
      navigate(`/gestantes/${gestante.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar gestante'
      if (msg.includes('prontuario')) {
        toast.error('Prontuário já cadastrado. Use um número diferente.')
      } else {
        toast.error(msg)
      }
    }
  }

  const inputClass = "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
  const labelClass = "block text-xs font-medium text-slate-400 mb-1"
  const errorClass = "mt-1 text-xs text-red-400"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-900/50 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-100">Cadastrar Gestante</h1>
        <p className="text-sm text-slate-500 mt-0.5">Preencha os dados basais e fatores de risco</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto px-6 py-4 space-y-4">

          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Identificação</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Nome completo *</label>
                <input {...register('nome')} type="text" placeholder="Nome da paciente" className={inputClass} />
                {errors.nome && <p className={errorClass}>{errors.nome.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Nº Prontuário *</label>
                <input {...register('prontuario')} type="text" placeholder="PRN-0001" className={`${inputClass} font-mono`} />
                {errors.prontuario && <p className={errorClass}>{errors.prontuario.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Data de Nascimento *</label>
                <input {...register('data_nascimento')} type="date" className={inputClass} />
                {errors.data_nascimento && <p className={errorClass}>{errors.data_nascimento.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Unidade *</label>
                <select {...register('unidade_id')} className={inputClass}>
                  <option value="">-- Selecione --</option>
                  {unidades?.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
                {errors.unidade_id && <p className={errorClass}>{errors.unidade_id.message}</p>}
              </div>
              <div>
                <label className={labelClass}>IMC Pré-gestacional (kg/m²)</label>
                <input {...register('imc_pre_gestacional')} type="number" step="0.1" placeholder="22.5" className={`${inputClass} font-mono`} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Dados Obstétricos</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gestações anteriores (G)</label>
                <input {...register('gesta')} type="number" min="1" max="20" className={`${inputClass} font-mono`} />
              </div>
              <div>
                <label className={labelClass}>Partos anteriores (P)</label>
                <input {...register('para')} type="number" min="0" max="20" className={`${inputClass} font-mono`} />
              </div>
              <div>
                <label className={labelClass}>DUM</label>
                <input {...register('dum')} type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>DPP</label>
                <input {...register('dpp')} type="date" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Fatores de Risco</h2>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: 'nuliparidade' as const, label: 'Nuliparidade (primeira gestação)' },
                { name: 'pe_gestacao_anterior' as const, label: 'PE em gestação anterior' },
                { name: 'hipertensao_cronica' as const, label: 'Hipertensão arterial crônica' },
                { name: 'diabetes' as const, label: 'Diabetes mellitus pré-existente' },
                { name: 'gestacao_multipla' as const, label: 'Gestação múltipla (gemelar ou mais)' },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center gap-3 rounded-lg border border-slate-700/30 bg-slate-800/30 px-4 py-3 cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    {...register(name)}
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

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
              disabled={criarGestante.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
            >
              {criarGestante.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                : <><Save className="h-4 w-4" /> Cadastrar Gestante</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
