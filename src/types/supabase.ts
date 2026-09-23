// ============================================================
// Types Supabase — gerados do schema
// ============================================================

export type AppRole = 'admin' | 'obstetra' | 'enfermagem' | 'pesquisa'
export type NivelRisco = 'baixo' | 'moderado' | 'alto'
export type Severidade = 'informativo' | 'atencao' | 'grave'
export type TipoConduta = 'observacao' | 'medicacao' | 'internacao' | 'encaminhamento' | 'retorno'
export type TipoUnidade = 'alto_risco' | 'rotina'

export interface Profile {
  id: string
  nome: string
  email: string
  registro_conselho?: string
  telefone?: string
  criado_em: string
  atualizado_em: string
}

export interface UserRole {
  id: number
  user_id: string
  role: AppRole
}

export interface Unidade {
  id: number
  nome: string
  tipo: TipoUnidade
  municipio: string
  uf: string
  criado_em: string
  atualizado_em: string
}

export interface UnidadeMembro {
  id: number
  unidade_id: number
  user_id: string
}

export interface Gestante {
  id: string
  nome: string
  prontuario: string
  data_nascimento: string
  imc_pre_gestacional?: number
  gesta: number
  para: number
  nuliparidade: boolean
  pe_gestacao_anterior: boolean
  hipertensao_cronica: boolean
  diabetes: boolean
  gestacao_multipla: boolean
  dum?: string
  dpp?: string
  unidade_id: number
  responsavel_id?: string
  ativa: boolean
  criado_em: string
  atualizado_em: string
}

export interface Avaliacao {
  id: string
  gestante_id: string
  data: string
  idade_gestacional: number
  pas: number
  pad: number
  proteinuria: number
  plaquetas?: number
  creatinina?: number
  tgo?: number
  tgp?: number
  acido_urico?: number
  sflt_plgf?: number | null
  sintomas: string[]
  peso?: number
  nota?: string
  registrado_por?: string
  criado_em: string
}

export interface ModeloML {
  id: number
  versao: string
  algoritmo: string
  auc?: number
  sensibilidade?: number
  especificidade?: number
  amostra_treino?: number
  intercepto: number
  escala_logito: number
  coeficientes: Record<string, number>
  ativo: boolean
  criado_em: string
}

export interface Predicao {
  id: string
  avaliacao_id: string
  modelo_id?: number
  probabilidade: number
  nivel: NivelRisco
  contribuicoes: Record<string, number>
  gerado_em: string
}

export interface Alerta {
  id: string
  avaliacao_id?: string
  gestante_id: string
  tipo: string
  descricao: string
  severidade: Severidade
  resolvido: boolean
  resolvido_por?: string
  resolvido_em?: string
  criado_em: string
}

export interface Conduta {
  id: string
  gestante_id: string
  avaliacao_id?: string
  descricao: string
  tipo: TipoConduta
  autor_id?: string
  data: string
  criado_em: string
  atualizado_em: string
}

export interface Auditoria {
  id: number
  usuario_id?: string
  acao: string
  tabela: string
  registro_id?: string
  dados?: Record<string, unknown>
  ip?: string
  criado_em: string
}

// ── Views ──────────────────────────────────────────────────────────────────

export interface VwRiscoAtual {
  gestante_id: string
  nome: string
  prontuario: string
  data_nascimento: string
  nuliparidade: boolean
  pe_gestacao_anterior: boolean
  hipertensao_cronica: boolean
  diabetes: boolean
  gestacao_multipla: boolean
  unidade_id: number
  responsavel_id?: string
  ativa: boolean
  avaliacao_id?: string
  data_avaliacao?: string
  idade_gestacional?: number
  pas?: number
  pad?: number
  proteinuria?: number
  plaquetas?: number
  creatinina?: number
  tgo?: number
  acido_urico?: number
  sflt_plgf?: number | null
  sintomas?: string[]
  probabilidade?: number
  nivel?: NivelRisco
  contribuicoes?: Record<string, number>
  alertas_abertos: number
}

export interface VwEstatisticas {
  total_gestantes: number
  risco_baixo: number
  risco_moderado: number
  risco_alto: number
  alertas_abertos: number
  total_avaliacoes: number
  media_ig?: number
}

// ── Supabase Database type para o cliente tipado ───────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'criado_em' | 'atualizado_em'>; Update: Partial<Profile> }
      user_roles: { Row: UserRole; Insert: Omit<UserRole, 'id'>; Update: Partial<UserRole> }
      unidades: { Row: Unidade; Insert: Omit<Unidade, 'id' | 'criado_em' | 'atualizado_em'>; Update: Partial<Unidade> }
      unidade_membros: { Row: UnidadeMembro; Insert: Omit<UnidadeMembro, 'id'>; Update: Partial<UnidadeMembro> }
      gestantes: { Row: Gestante; Insert: Omit<Gestante, 'id' | 'criado_em' | 'atualizado_em'>; Update: Partial<Gestante> }
      avaliacoes: { Row: Avaliacao; Insert: Omit<Avaliacao, 'id' | 'criado_em'>; Update: Partial<Avaliacao> }
      modelos_ml: { Row: ModeloML; Insert: Omit<ModeloML, 'id' | 'criado_em'>; Update: Partial<ModeloML> }
      predicoes: { Row: Predicao; Insert: Omit<Predicao, 'id' | 'gerado_em'>; Update: Partial<Predicao> }
      alertas: { Row: Alerta; Insert: Omit<Alerta, 'id' | 'criado_em'>; Update: Partial<Alerta> }
      condutas: { Row: Conduta; Insert: Omit<Conduta, 'id' | 'criado_em' | 'atualizado_em'>; Update: Partial<Conduta> }
      auditoria: { Row: Auditoria; Insert: Omit<Auditoria, 'id' | 'criado_em'>; Update: never }
    }
    Views: {
      vw_risco_atual: { Row: VwRiscoAtual }
      vw_estatisticas: { Row: VwEstatisticas }
    }
    Functions: {
      has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean }
      calcular_predicao: { Args: { p_avaliacao_id: string }; Returns: string }
      gerar_alertas: { Args: { p_avaliacao_id: string }; Returns: void }
    }
    Enums: {
      app_role: AppRole
      nivel_risco: NivelRisco
      severidade: Severidade
    }
  }
}
