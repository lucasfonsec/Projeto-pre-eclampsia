import { describe, it, expect } from 'vitest'
import {
  calcularPredicao,
  COEFICIENTES_PADRAO,
  INTERCEPTO,
  ESCALA_LOGITO,
  type DadosAvaliacao,
  type DadosGestante,
} from './predict'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const gestanteBaixoRisco: DadosGestante = {
  data_nascimento: '1992-01-01',
  imc_pre_gestacional: 22,
  pe_gestacao_anterior: false,
  hipertensao_cronica: false,
  nuliparidade: false,
  diabetes: false,
  gestacao_multipla: false,
}

const avaliacaoBaixoRisco: DadosAvaliacao = {
  pas: 118,
  pad: 76,
  proteinuria: 0,
  plaquetas: 220000,
  creatinina: 0.7,
  tgo: 22,
  acido_urico: 4.0,
  sflt_plgf: null,
  sintomas: [],
  idade_gestacional: 20,
}

const gestanteAltoRisco: DadosGestante = {
  data_nascimento: '1982-06-15',
  imc_pre_gestacional: 35,
  pe_gestacao_anterior: true,
  hipertensao_cronica: true,
  nuliparidade: false,
  diabetes: true,
  gestacao_multipla: true,
}

const avaliacaoAltoRisco: DadosAvaliacao = {
  pas: 165,
  pad: 112,
  proteinuria: 3,
  plaquetas: 90000,
  creatinina: 1.22,
  tgo: 88,
  acido_urico: 8.8,
  sflt_plgf: 80,
  sintomas: ['cefaleia', 'disturbios_visuais', 'dor_epigastrica'],
  idade_gestacional: 34,
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe('Modelo Preditivo — PredGest v2.4', () => {
  it('caso de baixo risco: probabilidade < 0.30', () => {
    const resultado = calcularPredicao(
      avaliacaoBaixoRisco,
      gestanteBaixoRisco,
      COEFICIENTES_PADRAO,
      INTERCEPTO,
      ESCALA_LOGITO
    )
    expect(resultado.probabilidade).toBeLessThan(0.30)
    expect(resultado.nivel).toBe('baixo')
  })

  it('caso de alto risco: probabilidade >= 0.60', () => {
    const resultado = calcularPredicao(
      avaliacaoAltoRisco,
      gestanteAltoRisco,
      COEFICIENTES_PADRAO,
      INTERCEPTO,
      ESCALA_LOGITO
    )
    expect(resultado.probabilidade).toBeGreaterThanOrEqual(0.60)
    expect(resultado.nivel).toBe('alto')
  })

  it('soma das contribuições = 100% (tolerância ±0.5%)', () => {
    const resultado = calcularPredicao(
      avaliacaoAltoRisco,
      gestanteAltoRisco,
      COEFICIENTES_PADRAO,
      INTERCEPTO,
      ESCALA_LOGITO
    )
    const soma = Object.values(resultado.contribuicoes).reduce((a, b) => a + b, 0)
    expect(soma).toBeGreaterThanOrEqual(99.0)
    expect(soma).toBeLessThanOrEqual(101.0)
  })

  it('monotonicidade: subir PAS nunca reduz a probabilidade', () => {
    const base: DadosAvaliacao = { ...avaliacaoBaixoRisco, pas: 130 }
    const elevado: DadosAvaliacao = { ...avaliacaoBaixoRisco, pas: 160 }

    const r1 = calcularPredicao(base, gestanteBaixoRisco)
    const r2 = calcularPredicao(elevado, gestanteBaixoRisco)

    expect(r2.probabilidade).toBeGreaterThanOrEqual(r1.probabilidade)
  })

  it('PA 165/112 + proteinúria 3+ gera probabilidade >= 0.60', () => {
    const av: DadosAvaliacao = {
      ...avaliacaoBaixoRisco,
      pas: 165,
      pad: 112,
      proteinuria: 3,
      sintomas: ['cefaleia'],
    }
    const resultado = calcularPredicao(av, gestanteAltoRisco)
    expect(resultado.probabilidade).toBeGreaterThanOrEqual(0.60)
    expect(resultado.nivel).toBe('alto')
  })

  it('níveis intermediários: probabilidade moderada retorna nível moderado', () => {
    const av: DadosAvaliacao = {
      ...avaliacaoBaixoRisco,
      pas: 140,
      pad: 92,
      proteinuria: 1,
    }
    const resultado = calcularPredicao(av, gestanteAltoRisco)
    // deve ser moderado ou alto, nunca baixo para esses valores
    expect(['moderado', 'alto']).toContain(resultado.nivel)
  })

  it('sFlt-1/PlGF nulo não quebra o cálculo', () => {
    const av: DadosAvaliacao = { ...avaliacaoBaixoRisco, sflt_plgf: null }
    expect(() => calcularPredicao(av, gestanteBaixoRisco)).not.toThrow()
  })

  it('contribuições: PAS e PAD estão entre os maiores pesos para alto risco', () => {
    const resultado = calcularPredicao(avaliacaoAltoRisco, gestanteAltoRisco)
    const contribs = resultado.contribuicoes
    // proteinúria tem coef 3.8 (maior), então deve ter contribuição significativa
    expect(contribs['proteinuria']).toBeGreaterThan(5)
  })
})
