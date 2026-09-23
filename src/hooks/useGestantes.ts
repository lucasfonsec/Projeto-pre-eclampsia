import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  Gestante, Avaliacao, Alerta, Conduta,
  VwRiscoAtual, VwEstatisticas, ModeloML,
  Predicao,
} from '../types/supabase'

// ── Query Keys ────────────────────────────────────────────────────────────────

export const queryKeys = {
  triagem: (filtros?: object) => ['triagem', filtros] as const,
  gestante: (id: string) => ['gestante', id] as const,
  gestantes: () => ['gestantes'] as const,
  avaliacoes: (gestanteId: string) => ['avaliacoes', gestanteId] as const,
  predicao: (avaliacaoId: string) => ['predicao', avaliacaoId] as const,
  alertas: (filtros?: object) => ['alertas', filtros] as const,
  alertasGestante: (gestanteId: string) => ['alertas', 'gestante', gestanteId] as const,
  condutas: (gestanteId: string) => ['condutas', gestanteId] as const,
  estatisticas: () => ['estatisticas'] as const,
  modelo: () => ['modelo'] as const,
  unidades: () => ['unidades'] as const,
  profiles: () => ['profiles'] as const,
}

// ── Triagem (vw_risco_atual) ──────────────────────────────────────────────────

export function useTriagem(filtros?: {
  nivel?: string
  unidade_id?: number
  busca?: string
}) {
  return useQuery({
    queryKey: queryKeys.triagem(filtros),
    queryFn: async () => {
      let query = supabase
        .from('vw_risco_atual')
        .select('*')
        .eq('ativa', true)
        .order('probabilidade', { ascending: false, nullsFirst: false })

      if (filtros?.nivel && filtros.nivel !== 'todos') {
        query = query.eq('nivel', filtros.nivel)
      }
      if (filtros?.unidade_id) {
        query = query.eq('unidade_id', filtros.unidade_id)
      }
      if (filtros?.busca) {
        query = query.or(
          `nome.ilike.%${filtros.busca}%,prontuario.ilike.%${filtros.busca}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data as VwRiscoAtual[]
    },
    staleTime: 30_000,
  })
}

// ── Gestante individual ────────────────────────────────────────────────────────

export function useGestante(id: string) {
  return useQuery({
    queryKey: queryKeys.gestante(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestantes')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Gestante
    },
    enabled: !!id,
  })
}

export function useGestantes() {
  return useQuery({
    queryKey: queryKeys.gestantes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestantes')
        .select('*')
        .order('nome')
      if (error) throw error
      return data as Gestante[]
    },
  })
}

// ── Avaliações ─────────────────────────────────────────────────────────────────

export function useAvaliacoes(gestanteId: string) {
  return useQuery({
    queryKey: queryKeys.avaliacoes(gestanteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('gestante_id', gestanteId)
        .order('data', { ascending: false })
      if (error) throw error
      return data as Avaliacao[]
    },
    enabled: !!gestanteId,
  })
}

// ── Predições ─────────────────────────────────────────────────────────────────

export function usePredicao(avaliacaoId: string) {
  return useQuery({
    queryKey: queryKeys.predicao(avaliacaoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predicoes')
        .select('*')
        .eq('avaliacao_id', avaliacaoId)
        .single()
      if (error) throw error
      return data as Predicao
    },
    enabled: !!avaliacaoId,
  })
}

// ── Alertas ────────────────────────────────────────────────────────────────────

export function useAlertas(filtros?: { somenteAbertos?: boolean }) {
  return useQuery({
    queryKey: queryKeys.alertas(filtros),
    queryFn: async () => {
      let query = supabase
        .from('alertas')
        .select('*')
        .order('criado_em', { ascending: false })

      if (filtros?.somenteAbertos) {
        query = query.eq('resolvido', false)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Alerta[]
    },
    staleTime: 15_000,
  })
}

export function useAlertasGestante(gestanteId: string) {
  return useQuery({
    queryKey: queryKeys.alertasGestante(gestanteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alertas')
        .select('*')
        .eq('gestante_id', gestanteId)
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data as Alerta[]
    },
    enabled: !!gestanteId,
  })
}

// ── Condutas ───────────────────────────────────────────────────────────────────

export function useCondutas(gestanteId: string) {
  return useQuery({
    queryKey: queryKeys.condutas(gestanteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condutas')
        .select('*, profiles(nome)')
        .eq('gestante_id', gestanteId)
        .order('data', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!gestanteId,
  })
}

// ── Estatísticas ───────────────────────────────────────────────────────────────

export function useEstatisticas() {
  return useQuery({
    queryKey: queryKeys.estatisticas(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_estatisticas')
        .select('*')
        .single()
      if (error) throw error
      return data as VwEstatisticas
    },
    staleTime: 60_000,
  })
}

// ── Modelo ML ativo ────────────────────────────────────────────────────────────

export function useModeloAtivo() {
  return useQuery({
    queryKey: queryKeys.modelo(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modelos_ml')
        .select('*')
        .eq('ativo', true)
        .single()
      if (error) throw error
      return data as ModeloML
    },
    staleTime: 5 * 60_000,
  })
}

// ── Unidades ───────────────────────────────────────────────────────────────────

export function useUnidades() {
  return useQuery({
    queryKey: queryKeys.unidades(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .order('nome')
      if (error) throw error
      return data
    },
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCriarGestante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (gestante: Omit<Gestante, 'id' | 'criado_em' | 'atualizado_em'>) => {
      const { data, error } = await supabase.from('gestantes').insert(gestante).select().single()
      if (error) throw error
      return data as Gestante
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gestantes() })
      qc.invalidateQueries({ queryKey: queryKeys.triagem() })
    },
  })
}

export function useAtualizarGestante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<Gestante> }) => {
      const { data, error } = await supabase
        .from('gestantes').update(dados).eq('id', id).select().single()
      if (error) throw error
      return data as Gestante
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.gestante(data.id) })
      qc.invalidateQueries({ queryKey: queryKeys.triagem() })
    },
  })
}

export function useCriarAvaliacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (avaliacao: Omit<Avaliacao, 'id' | 'criado_em'>) => {
      const { data, error } = await supabase
        .from('avaliacoes').insert(avaliacao).select().single()
      if (error) throw error
      return data as Avaliacao
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.avaliacoes(data.gestante_id) })
      qc.invalidateQueries({ queryKey: queryKeys.triagem() })
      qc.invalidateQueries({ queryKey: queryKeys.alertas() })
      qc.invalidateQueries({ queryKey: queryKeys.alertasGestante(data.gestante_id) })
      qc.invalidateQueries({ queryKey: queryKeys.estatisticas() })
    },
  })
}

export function useResolverAlerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data, error } = await supabase
        .from('alertas')
        .update({ resolvido: true, resolvido_por: userId, resolvido_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Alerta
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.alertas() })
      qc.invalidateQueries({ queryKey: queryKeys.triagem() })
    },
  })
}

export function useCriarConduta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (conduta: Omit<Conduta, 'id' | 'criado_em' | 'atualizado_em'>) => {
      const { data, error } = await supabase
        .from('condutas').insert(conduta).select().single()
      if (error) throw error
      return data as Conduta
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.condutas(data.gestante_id) })
    },
  })
}
