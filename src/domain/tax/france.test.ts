import { describe, expect, it } from 'vitest'
import { DEFAULT_COMPANY, DEFAULT_TAX_PARAMS } from './defaults'
import {
  computeWithdrawal,
  corporateTax,
  householdIncomeTax,
  progressiveTax,
  remunerationForShare,
  scanStrategies,
} from './france'

const p = DEFAULT_TAX_PARAMS
const c = DEFAULT_COMPANY

describe('IS', () => {
  it('aplica 15 % hasta 42 500 y 25 % después', () => {
    expect(corporateTax(42_500, p)).toBeCloseTo(6_375)
    expect(corporateTax(100_000, p)).toBeCloseTo(6_375 + 57_500 * 0.25)
    expect(corporateTax(-5_000, p)).toBe(0)
  })
})

describe('IR', () => {
  it('barème progresivo', () => {
    expect(progressiveTax(10_000, p.irBrackets)).toBe(0)
    expect(progressiveTax(29_315, p.irBrackets)).toBeCloseTo((29_315 - 11_497) * 0.11)
  })
  it('décote reduce impuestos bajos', () => {
    const t = householdIncomeTax(20_000, 1, p)
    const raw = progressiveTax(20_000, p.irBrackets)
    expect(t).toBeLessThan(raw)
    expect(t).toBeGreaterThanOrEqual(0)
  })
})

describe('computeWithdrawal', () => {
  it('todo dividendos: IS + PFU + TNS sobre exceso del 10 % del capital', () => {
    const r = computeWithdrawal({
      resultBeforeRemuneration: 50_000,
      remunerationNet: 0,
      distributionRate: 1,
      dividendMode: 'pfu',
      company: c,
      params: p,
    })
    expect(r.tnsContributions).toBe(p.tnsMinimum)
    expect(r.isBase).toBeCloseTo(50_000 - p.tnsMinimum)
    expect(r.dividendThreshold).toBe(100)
    expect(r.dividendsAboveThreshold).toBeCloseTo(r.dividendsGross - 100)
    expect(r.netInPocket).toBeGreaterThan(0)
    expect(r.netInPocket).toBeLessThan(50_000)
  })
  it('todo remuneración: sin dividendos ni IS', () => {
    const rem = remunerationForShare(50_000, 1, p)
    const r = computeWithdrawal({
      resultBeforeRemuneration: 50_000,
      remunerationNet: rem,
      distributionRate: 1,
      dividendMode: 'pfu',
      company: c,
      params: p,
    })
    expect(r.remunerationCostToCompany).toBeCloseTo(50_000)
    expect(r.corporateTax).toBe(0)
    expect(r.dividendsGross).toBe(0)
    expect(r.netInPocket).toBeCloseTo(rem - r.salaryIncomeTax)
  })
  it('la curva tiene un óptimo y es coherente', () => {
    const { curve, best } = scanStrategies({
      resultBeforeRemuneration: 80_000,
      distributionRate: 1,
      dividendMode: 'pfu',
      company: c,
      params: p,
    })
    expect(curve).toHaveLength(101)
    for (const pt of curve) expect(pt.netInPocket).toBeLessThanOrEqual(best.netInPocket + 1e-9)
  })
})
