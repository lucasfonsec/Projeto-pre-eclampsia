// ============================================================
// PredGest — Modelo Preditivo de Regressão Logística
// Determinístico, explicável, com contribuições relativas
// ============================================================

export interface DadosAvaliacao {
  pas: number
  pad: number
  proteinuria: number       // 0-3
  plaquetas?: number        // células/µL
  creatinina?: number       // mg/dL
  tgo?: number              // U/L
  acido_urico?: number      // mg/dL
  sflt_plgf?: number | null // ratio
  sintomas: string[]
  idade_gestacional: number  // semanas
}

export interface DadosGestante {
  data_nascimento: string    // ISO date
  imc_pre_gestacional?: number
  pe_gestacao_anterior: boolean
  hipertensao_cronica: boolean
  nuliparidade: boolean
  diabetes: boolean
  gestacao_multipla: boolean
}

export interface ResultadoPredicao {
  probabilidade: number    // 0 a 1
  nivel: 'baixo' | 'moderado' | 'alto'
  logito: number
  contribuicoes: Record<string, number>   // % de cada fator (soma = 100)
}

export interface CoeficientesModelo {
  pas: number
  pad: number
  proteinuria: number
  plaquetas: number
  creatinina: number
  tgo: number
  acido_urico: number
  idade_gestacional: number
  imc_pre_gestacional: number
  idade_materna: number
  pe_anterior: number
  hipertensao_cronica: number
  nuliparidade: number
  diabetes: number
  gestacao_multipla: number
  sintomas: number
  sflt_plgf: number
}

// Coeficientes padrão do modelo v2.4
export const COEFICIENTES_PADRAO: CoeficientesModelo = {
  pas: 3.4,
  pad: 2.9,
  proteinuria: 3.8,
  plaquetas: 2.1,
  creatinina: 2.0,
  tgo: 1.6,
  acido_urico: 1.5,
  idade_gestacional: 1.1,
  imc_pre_gestacional: 1.0,
  idade_materna: 0.8,
  pe_anterior: 1.4,
  hipertensao_cronica: 1.2,
  nuliparidade: 0.7,
  diabetes: 0.6,
  gestacao_multipla: 0.9,
  sintomas: 1.7,
  sflt_plgf: 2.4,
}

// Parâmetros do modelo
export const INTERCEPTO = -3.6
export const ESCALA_LOGITO = 0.35

// Faixas de risco
export const LIMIAR_BAIXO = 0.30
export const LIMIAR_ALTO = 0.60

/** clamp01: normaliza valor entre min e max para [0, 1] */
function escala(v: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (v - min) / (max - min)))
}

/** Calcula idade em anos a partir de data de nascimento ISO */
function calcularIdadeAnos(dataNascimento: string): number {
  const nasc = new Date(dataNascimento)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--
  }
  return idade
}

/** Sintomas graves (cefaleia, distúrbios visuais, dor epigástrica) */
const SINTOMAS_GRAVES = ['cefaleia', 'disturbios_visuais', 'dor_epigastrica']

function contarSintomasGraves(sintomas: string[]): number {
  return sintomas.filter(s => SINTOMAS_GRAVES.includes(s)).length
}

/**
 * Normaliza todas as variáveis para [0, 1]
 */
function normalizarVariaveis(
  av: DadosAvaliacao,
  gest: DadosGestante
): Record<keyof CoeficientesModelo, number> {
  const idadeAnos = calcularIdadeAnos(gest.data_nascimento)
  const sintomasGraves = contarSintomasGraves(av.sintomas)

  return {
    pas:                 escala(av.pas, 120, 175),
    pad:                 escala(av.pad, 75, 115),
    proteinuria:         av.proteinuria / 3,
    plaquetas:           1 - escala(av.plaquetas ?? 150, 90, 220),
    creatinina:          escala(av.creatinina ?? 0.7, 0.6, 1.4),
    tgo:                 escala(av.tgo ?? 25, 20, 90),
    acido_urico:         escala(av.acido_urico ?? 4.0, 3.5, 9),
    idade_gestacional:   escala(av.idade_gestacional, 20, 38),
    imc_pre_gestacional: escala(gest.imc_pre_gestacional ?? 22, 20, 38),
    idade_materna:       escala(idadeAnos, 20, 42),
    pe_anterior:         gest.pe_gestacao_anterior ? 1 : 0,
    hipertensao_cronica: gest.hipertensao_cronica ? 1 : 0,
    nuliparidade:        gest.nuliparidade ? 1 : 0,
    diabetes:            gest.diabetes ? 1 : 0,
    gestacao_multipla:   gest.gestacao_multipla ? 1 : 0,
    sintomas:            Math.max(0, Math.min(1, sintomasGraves / 2)),
    sflt_plgf:           av.sflt_plgf != null ? escala(av.sflt_plgf, 10, 85) : 0,
  }
}

/**
 * Função principal de predição.
 * Retorna probabilidade, nível de risco e contribuições relativas (soma = 100%).
 */
export function calcularPredicao(
  avaliacao: DadosAvaliacao,
  gestante: DadosGestante,
  coeficientes: CoeficientesModelo = COEFICIENTES_PADRAO,
  intercepto = INTERCEPTO,
  escalaLogito = ESCALA_LOGITO
): ResultadoPredicao {
  const norm = normalizarVariaveis(avaliacao, gestante)

  // Contribuições brutas (coef × valor normalizado)
  const contribs: Record<keyof CoeficientesModelo, number> = {} as Record<keyof CoeficientesModelo, number>
  let somaContribs = 0
  let somaLogito = 0

  for (const key of Object.keys(coeficientes) as Array<keyof CoeficientesModelo>) {
    const c = coeficientes[key] * norm[key]
    contribs[key] = c
    // sFlt-1/PlGF só entra se coletado
    if (key === 'sflt_plgf' && avaliacao.sflt_plgf == null) continue
    somaLogito += c
    somaContribs += c
  }

  const logito = intercepto + escalaLogito * somaLogito
  const probabilidade = 1 / (1 + Math.exp(-logito))

  // Determinar nível
  const nivel = probabilidade >= LIMIAR_ALTO
    ? 'alto'
    : probabilidade >= LIMIAR_BAIXO
      ? 'moderado'
      : 'baixo'

  // Calcular contribuições relativas em % (apenas fatores com coef > 0)
  const soma = Math.max(somaContribs, 0.0001)
  const contribuicoes: Record<string, number> = {}

  for (const key of Object.keys(coeficientes) as Array<keyof CoeficientesModelo>) {
    if (key === 'sflt_plgf' && avaliacao.sflt_plgf == null) {
      contribuicoes[key] = 0
      continue
    }
    contribuicoes[key] = parseFloat(((contribs[key] / soma) * 100).toFixed(1))
  }

  return { probabilidade, nivel, logito, contribuicoes }
}

/** Label em português para cada fator */
export const LABEL_FATORES: Record<string, string> = {
  pas:                 'Pressão Arterial Sistólica',
  pad:                 'Pressão Arterial Diastólica',
  proteinuria:         'Proteinúria',
  plaquetas:           'Plaquetas',
  creatinina:          'Creatinina',
  tgo:                 'TGO (AST)',
  acido_urico:         'Ácido Úrico',
  idade_gestacional:   'Idade Gestacional',
  imc_pre_gestacional: 'IMC Pré-gestacional',
  idade_materna:       'Idade Materna',
  pe_anterior:         'PE em Gestação Anterior',
  hipertensao_cronica: 'Hipertensão Crônica',
  nuliparidade:        'Nuliparidade',
  diabetes:            'Diabetes',
  gestacao_multipla:   'Gestação Múltipla',
  sintomas:            'Sintomas de Alerta',
  sflt_plgf:           'sFlt-1/PlGF',
}
