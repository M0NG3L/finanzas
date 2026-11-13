import { describe, expect, it } from 'vitest'
import { DEFAULT_COMPANY, DEFAULT_TAX_PARAMS } from './defaults'
import { communalBusinessTax, computeWithdrawal, corporateIncomeTax, householdIncomeTax, progressiveTax, scanStrategies, socialBase } from './luxembourg'

const p = DEFAULT_TAX_PARAMS
const c = DEFAULT_COMPANY

describe('IRC e ICC', () => {
  it('14 % hasta 175 000, tramo intermedio, 16 % por encima de 200 000', () => {
    expect(corporateIncomeTax(100_000, p)).toBeCloseTo(14_000)
    expect(corporateIncomeTax(175_000, p)).toBeCloseTo(24_500)
    expect(corporateIncomeTax(190_000, p)).toBeCloseTo(24_500 + 15_000 * 0.3)
    expect(corporateIncomeTax(300_000, p)).toBeCloseTo(48_000)
    expect(corporateIncomeTax(-1, p)).toBe(0)
  })
  it('ICC con exención de 17 500', () => {
    expect(communalBusinessTax(17_500, p)).toBe(0)
    expect(communalBusinessTax(117_500, p)).toBeCloseTo(6_750)
  })
  it('tipo agregado Luxembourg-Ville ≈ 23,87 % para bases altas', () => {
    const base = 1_000_000
    const total = corporateIncomeTax(base, p) * 1.07 + communalBusinessTax(base, p)
    expect(total / base).toBeCloseTo(0.2387, 2)
  })
})

describe('Cotizaciones', () => {
  it('base mínima y techo', () => {
    expect(socialBase(0, p)).toBe(p.socialMinBase)
    expect(socialBase(10_000, p)).toBe(p.socialMinBase)
    expect(socialBase(60_000, p)).toBe(60_000)
    expect(socialBase(1_000_000, p)).toBe(p.socialMaxBase)
    expect(socialBase(0, { ...p, socialMinimumAlways: false })).toBe(0)
  })
})

describe('IR', () => {
  it('barème clase 1', () => {
    expect(progressiveTax(13_230, p.irBrackets)).toBe(0)
    expect(progressiveTax(15_435, p.irBrackets)).toBeCloseTo(2_205 * 0.08)
  })
  it('clase 2 reparte la renta y aplica el fondo de empleo', () => {
    const t1 = householdIncomeTax(60_000, 1, p)
    const t2 = householdIncomeTax(60_000, 2, p)
    expect(t2).toBeLessThan(t1)
    expect(t2).toBeCloseTo(2 * progressiveTax(30_000, p.irBrackets) * 1.07)
  })
  it('recargo del 9 % por encima de 150 000 en clase 1', () => {
    expect(householdIncomeTax(200_000, 1, p)).toBeCloseTo(progressiveTax(200_000, p.irBrackets) * 1.09)
  })
})

describe('computeWithdrawal', () => {
  const base = { resultBeforeRemuneration: 100_000, distributionRate: 1, company: c, params: p }
  it('todo dividendos: impuestos de sociedad + IR sobre el 50 % + dependencia', () => {
    const r = computeWithdrawal({ ...base, remunerationGross: 0 })
    expect(r.corporateBase).toBe(100_000)
    expect(r.irc).toBeCloseTo(14_000)
    expect(r.icc).toBeCloseTo((100_000 - 17_500) * 0.0675)
    expect(r.socialContributions).toBeCloseTo(p.socialMinBase * p.socialRate)
    expect(r.dividendsGross).toBeCloseTo(100_000 - 14_000 * 1.07 - r.icc - 535)
    expect(r.dividendTaxable).toBeCloseTo(r.dividendsGross * 0.5 - 1_500)
    expect(r.dividendDependency).toBeCloseTo(r.dividendsGross * 0.014)
    expect(r.netInPocket).toBeGreaterThan(50_000)
    expect(r.netInPocket).toBeLessThan(100_000)
  })
  it('todo remuneración: sin IRC ni ICC, IF mínimo y cotizaciones sobre la remuneración', () => {
    const r = computeWithdrawal({ ...base, remunerationGross: 100_000 })
    expect(r.irc).toBe(0)
    expect(r.icc).toBe(0)
    expect(r.wealthTax).toBe(535)
    expect(r.socialBase).toBe(100_000)
    expect(r.dividendsGross).toBe(0)
    expect(r.netInPocket).toBeCloseTo(100_000 - r.socialContributions - r.dependencySalary - r.salaryIncomeTax)
  })
  it('la curva tiene un óptimo y es coherente', () => {
    const { curve, best } = scanStrategies(base)
    expect(curve).toHaveLength(101)
    for (const pt of curve) expect(pt.netInPocket).toBeLessThanOrEqual(best.netInPocket + 1e-9)
  })
})
