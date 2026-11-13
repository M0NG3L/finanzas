import type { CompanySettings, IRBracket, TaxParams } from '../types'

export type DividendTaxMode = 'pfu' | 'bareme'

export interface WithdrawalInput {
  /** Resultado del ejercicio ANTES de remuneración del gérant, sus cotizaciones e IS */
  resultBeforeRemuneration: number
  /** Remuneración neta anual del gérant (antes de IR) */
  remunerationNet: number
  /** % del resultado neto después de IS que se distribuye como dividendos (0–1) */
  distributionRate: number
  dividendMode: DividendTaxMode
  company: CompanySettings
  params: TaxParams
}

export interface WithdrawalResult {
  remunerationNet: number
  tnsContributions: number
  isBase: number
  corporateTax: number
  netProfitAfterIS: number
  dividendsGross: number
  retainedEarnings: number
  dividendThreshold: number
  dividendsBelowThreshold: number
  dividendsAboveThreshold: number
  dividendSocialLevies: number
  dividendTns: number
  dividendIncomeTax: number
  salaryIncomeTax: number
  incomeTaxTotal: number
  /** Dinero que acaba en la cuenta personal */
  netInPocket: number
  /** Total de impuestos y cotizaciones pagados (empresa + persona) */
  totalLevies: number
  /** Coste total para la empresa de la remuneración (neto + cotizaciones) */
  remunerationCostToCompany: number
  effectiveRate: number
}

export function corporateTax(base: number, p: TaxParams): number {
  if (base <= 0) return 0
  const reduced = Math.min(base, p.isReducedThreshold) * p.isReducedRate
  const normal = Math.max(0, base - p.isReducedThreshold) * p.isNormalRate
  return reduced + normal
}

export function tnsContributions(remunerationNet: number, p: TaxParams): number {
  if (remunerationNet <= 0) return p.tnsMinimum
  return Math.max(p.tnsMinimum, remunerationNet * p.tnsRate)
}

export function progressiveTax(taxable: number, brackets: IRBracket[]): number {
  let tax = 0
  let lower = 0
  for (const b of brackets) {
    const upper = b.upTo ?? Infinity
    if (taxable <= lower) break
    const slice = Math.min(taxable, upper) - lower
    tax += slice * b.rate
    lower = upper
  }
  return tax
}

export function salaryAllowance(remuneration: number, p: TaxParams): number {
  if (remuneration <= 0) return 0
  const raw = remuneration * p.salaryAllowanceRate
  return Math.min(Math.max(raw, Math.min(p.salaryAllowanceMin, remuneration)), p.salaryAllowanceMax)
}

/** IR del hogar con cociente familiar y décote */
export function householdIncomeTax(taxableIncome: number, parts: number, p: TaxParams): number {
  if (taxableIncome <= 0) return 0
  const perPart = taxableIncome / parts
  let tax = progressiveTax(perPart, p.irBrackets) * parts
  const couple = parts >= 2
  const threshold = couple ? p.decoteThresholdCouple : p.decoteThresholdSingle
  const base = couple ? p.decoteBaseCouple : p.decoteBaseSingle
  if (tax < threshold) {
    const decote = Math.max(0, base - tax * p.decoteRate)
    tax = Math.max(0, tax - decote)
  }
  return tax
}

export function computeWithdrawal(input: WithdrawalInput): WithdrawalResult {
  const { params: p, company } = input
  const result = input.resultBeforeRemuneration
  const rem = Math.max(0, input.remunerationNet)

  const tns = tnsContributions(rem, p)
  const remunerationCostToCompany = rem + tns
  const isBase = result - remunerationCostToCompany
  const is = corporateTax(isBase, p)
  const netProfitAfterIS = isBase - is

  const distributable = Math.max(0, netProfitAfterIS)
  const dividendsGross = distributable * clamp01(input.distributionRate) * (company.ownershipPct / 100)
  const retainedEarnings = netProfitAfterIS - distributable * clamp01(input.distributionRate)

  // Dividendos > 10 % del (capital + primas + CCA) → cotizaciones TNS para el gérant majoritaire
  const dividendThreshold = (company.capitalSocial + company.primesAndCCA) * p.dividendTnsThresholdRate
  const dividendsBelowThreshold = Math.min(dividendsGross, dividendThreshold)
  const dividendsAboveThreshold = Math.max(0, dividendsGross - dividendThreshold)
  const dividendSocialLevies = dividendsBelowThreshold * p.socialLevyRate
  const dividendTns = dividendsAboveThreshold * p.tnsRate

  // IR sobre remuneración (barème) — se calcula con y sin dividendos para aislar cada parte
  const salaryTaxable = Math.max(0, rem - salaryAllowance(rem, p))
  const other = Math.max(0, company.otherHouseholdIncome)
  const taxOtherOnly = householdIncomeTax(other, company.fiscalParts, p)
  const taxWithSalary = householdIncomeTax(other + salaryTaxable, company.fiscalParts, p)
  const salaryIncomeTax = Math.max(0, taxWithSalary - taxOtherOnly)

  let dividendIncomeTax: number
  if (input.dividendMode === 'pfu') {
    dividendIncomeTax = dividendsGross * p.pfuIncomeRate
  } else {
    // Opción barème: abattement 40 %, CSG deducible 6,8 % de la parte sujeta a PS
    const csgDeductible = dividendsBelowThreshold * p.csgDeductibleRate
    const dividendTaxable = Math.max(0, dividendsGross * (1 - p.dividendAllowanceRate) - csgDeductible)
    const taxAll = householdIncomeTax(other + salaryTaxable + dividendTaxable, company.fiscalParts, p)
    dividendIncomeTax = Math.max(0, taxAll - taxWithSalary)
  }

  const incomeTaxTotal = salaryIncomeTax + dividendIncomeTax
  const netInPocket = rem - salaryIncomeTax + dividendsGross - dividendSocialLevies - dividendTns - dividendIncomeTax
  const totalLevies = tns + is + dividendSocialLevies + dividendTns + incomeTaxTotal

  return {
    remunerationNet: rem,
    tnsContributions: tns,
    isBase,
    corporateTax: is,
    netProfitAfterIS,
    dividendsGross,
    retainedEarnings,
    dividendThreshold,
    dividendsBelowThreshold,
    dividendsAboveThreshold,
    dividendSocialLevies,
    dividendTns,
    dividendIncomeTax,
    salaryIncomeTax,
    incomeTaxTotal,
    netInPocket,
    totalLevies,
    remunerationCostToCompany,
    effectiveRate: result > 0 ? totalLevies / result : 0,
  }
}

export interface ScanPoint {
  /** % del resultado destinado a remuneración (coste empresa) */
  share: number
  remunerationNet: number
  netInPocket: number
  totalLevies: number
}

/**
 * Recorre todas las combinaciones remuneración/dividendos y devuelve la curva y el óptimo.
 * `share` es la fracción del resultado que se destina al coste total de la remuneración.
 */
export function scanStrategies(
  base: Omit<WithdrawalInput, 'remunerationNet'>,
  steps = 100,
): { curve: ScanPoint[]; best: ScanPoint } {
  const curve: ScanPoint[] = []
  let best: ScanPoint | null = null
  for (let i = 0; i <= steps; i++) {
    const share = i / steps
    const rem = remunerationForShare(base.resultBeforeRemuneration, share, base.params)
    const r = computeWithdrawal({ ...base, remunerationNet: rem })
    const pt: ScanPoint = { share, remunerationNet: rem, netInPocket: r.netInPocket, totalLevies: r.totalLevies }
    curve.push(pt)
    if (!best || pt.netInPocket > best.netInPocket) best = pt
  }
  return { curve, best: best! }
}

/** Remuneración neta tal que (neto + cotizaciones) = share × resultado */
export function remunerationForShare(result: number, share: number, p: TaxParams): number {
  const budget = Math.max(0, result) * clamp01(share)
  if (budget <= p.tnsMinimum) return 0
  // neto + max(min, neto·rate) = budget
  const withRate = budget / (1 + p.tnsRate)
  if (withRate * p.tnsRate >= p.tnsMinimum) return withRate
  return budget - p.tnsMinimum
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x))
}
