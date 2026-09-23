// ============================================================
// PredGest — Regras Clínicas ISSHP/FEBRASGO
// Geração determinística de alertas com base em parâmetros clínicos
// ============================================================

export type SeveridadeAlerta = 'informativo' | 'atencao' | 'grave'

export interface AlertaClinico {
  tipo: string
  descricao: string
  severidade: SeveridadeAlerta
}

export interface DadosParaAlertas {
  pas: number
  pad: number
  proteinuria: number  // 0-3
  plaquetas?: number   // células/µL
  creatinina?: number  // mg/dL
  tgo?: number         // U/L
  sintomas: string[]
}

const SINTOMAS_GRAVES = ['cefaleia', 'disturbios_visuais', 'dor_epigastrica']

const LABEL_SINTOMAS: Record<string, string> = {
  cefaleia: 'cefaleia',
  disturbios_visuais: 'distúrbios visuais',
  dor_epigastrica: 'dor epigástrica',
  edema: 'edema',
  dispneia: 'dispneia',
  nausea: 'náusea',
}

/**
 * Avalia dados de uma consulta e retorna lista de alertas clínicos.
 * Os alertas são gerados de forma determinística seguindo as diretrizes
 * ISSHP/FEBRASGO para hipertensão na gestação.
 */
export function avaliarAlertasClinicosLocais(dados: DadosParaAlertas): AlertaClinico[] {
  const alertas: AlertaClinico[] = []

  // ── Pressão Arterial ───────────────────────────────────────────────────────

  // PAS >= 160 OU PAD >= 110 → GRAVE
  if (dados.pas >= 160 || dados.pad >= 110) {
    alertas.push({
      tipo: 'hipertensao_grave',
      descricao: `Hipertensão grave confirmada (PA ${dados.pas}/${dados.pad} ≥ 160/110 mmHg). Risco iminente de eclâmpsia. Conduta de urgência necessária.`,
      severidade: 'grave',
    })
  }
  // PAS >= 140 OU PAD >= 90 → ATENÇÃO (apenas se não é grave)
  else if (dados.pas >= 140 || dados.pad >= 90) {
    alertas.push({
      tipo: 'hipertensao_confirmada',
      descricao: `Hipertensão confirmada (PA ${dados.pas}/${dados.pad} ≥ 140/90 mmHg). Monitoramento intensivo e avaliação clínica indicados.`,
      severidade: 'atencao',
    })
  }

  // ── Proteinúria ────────────────────────────────────────────────────────────

  if (dados.proteinuria >= 2) {
    alertas.push({
      tipo: 'proteinuria_elevada',
      descricao: `Proteinúria ${dados.proteinuria}+. Investigar disfunção renal. Coleta de urina de 24h e avaliação laboratorial recomendadas.`,
      severidade: 'atencao',
    })
  }

  // ── Plaquetas ──────────────────────────────────────────────────────────────

  if (dados.plaquetas != null && dados.plaquetas < 100000) {
    alertas.push({
      tipo: 'trombocitopenia_grave',
      descricao: `Trombocitopenia grave (plaquetas ${Math.round(dados.plaquetas / 1000)} mil/µL < 100 mil). Suspeita de síndrome HELLP. Avaliação hematológica urgente.`,
      severidade: 'grave',
    })
  }

  // ── Creatinina ─────────────────────────────────────────────────────────────

  if (dados.creatinina != null && dados.creatinina > 1.1) {
    alertas.push({
      tipo: 'disfuncao_renal',
      descricao: `Disfunção renal (creatinina ${dados.creatinina.toFixed(2)} mg/dL > 1,1 mg/dL). Avaliação nefrológica urgente. Risco de lesão renal aguda.`,
      severidade: 'grave',
    })
  }

  // ── TGO ────────────────────────────────────────────────────────────────────

  if (dados.tgo != null && dados.tgo > 70) {
    alertas.push({
      tipo: 'disfuncao_hepatica',
      descricao: `Disfunção hepática (TGO ${dados.tgo} U/L > 70 U/L). Suspeita de síndrome HELLP. Avaliação hepática urgente necessária.`,
      severidade: 'grave',
    })
  }

  // ── Sintomas de Iminência de Eclâmpsia ─────────────────────────────────────

  const sintomasGravesPresentes = dados.sintomas.filter(s =>
    SINTOMAS_GRAVES.includes(s)
  )

  if (sintomasGravesPresentes.length > 0) {
    const labels = sintomasGravesPresentes
      .map(s => LABEL_SINTOMAS[s] ?? s)
      .join(', ')
    alertas.push({
      tipo: 'iminencia_eclampsia',
      descricao: `Sintomas de iminência de eclâmpsia: ${labels}. Conduta imediata necessária. Considerar internação hospitalar.`,
      severidade: 'grave',
    })
  }

  return alertas
}

/**
 * Verifica se uma avaliação tem alertas graves
 */
export function temAlertaGrave(alertas: AlertaClinico[]): boolean {
  return alertas.some(a => a.severidade === 'grave')
}

/**
 * Conta alertas por severidade
 */
export function contarPorSeveridade(alertas: AlertaClinico[]): {
  grave: number
  atencao: number
  informativo: number
} {
  return {
    grave: alertas.filter(a => a.severidade === 'grave').length,
    atencao: alertas.filter(a => a.severidade === 'atencao').length,
    informativo: alertas.filter(a => a.severidade === 'informativo').length,
  }
}
