import type { CompanySettings, IRBracket, TaxClass, TaxParams } from '../types'

export interface WithdrawalInput {
  /** Resultado del ejercicio ANTES de remuneración del gérant e impuestos de sociedades */
  resultBeforeRemuneration: number
  /** Remuneración bruta anual del gérant */
  remunerationGross: number
  /** % del beneficio neto después de impuestos que se distribuye como dividendos (0–1) */
  distributionRate: number
  company: CompanySettings
  params: TaxParams
}

export interface WithdrawalResult {
  remunerationGross: number
  /** Base sobre la que se calculan las cotizaciones (mínimo / techo aplicados) */
  socialBase: number
  socialContributions: number
  dependencySalary: number
  corporateBase: number
  irc: number
  ircEmploymentFund: number
  icc: number
  wealthTax: number
  /** IRC + fondo de empleo + ICC + IF */
  corporateTaxTotal: number
  netProfitAfterTax: number
  dividendsGross: number
  retainedEarnings: number
  dividendTaxable: number
  dividendIncomeTax: number
  dividendDependency: number
  salaryTaxable: number
  salaryIncomeTax: number
  incomeTaxTotal: number
  /** Dinero que acaba en la cuenta personal */
  netInPocket: number
  /** Total de impuestos y cotizaciones pagados (empresa + persona) */
  totalLevies: number
  effectiveRate: number
}

/** IRC con los tres tramos luxemburgueses */
export function corporateIncomeTax(base: number, p: TaxParams): number {
  if (base <= 0) return 0
  if (base <= p.ircLowThreshold) return base * p.ircLowRate
  if (base <= p.ircHighThreshold) return p.ircMidBase + (base - p.ircLowThreshold) * p.ircMidRate
  return base * p.ircHighRate
}

export function communalBusinessTax(base: number, p: TaxParams): number {
  return Math.max(0, base - p.iccAllowance) * p.iccRate
}

export function socialBase(remuneration: number, p: TaxParams): number {
  if (remuneration <= 0 && !p.socialMinimumAlways) return 0
  return Math.min(p.socialMaxBase, Math.max(p.socialMinBase, remuneration))
}

export function progressiveTax(taxable: number, brackets: IRBracket[]): number {
  let tax = 0
  let lower = 0
  for (const b of brackets) {
    const upper = b.upTo ?? Infinity
    if (taxable <= lower) break
    tax += (Math.min(taxable, upper) - lower) * b.rate
    lower = upper
  }
  return tax
}

/** IR del hogar según clase de impuesto (clase 2 = splitting) con recargo del fondo de empleo */
export function householdIncomeTax(taxableIncome: number, taxClass: TaxClass, p: TaxParams): number {
  if (taxableIncome <= 0) return 0
  const base = taxClass === 2 ? 2 * progressiveTax(taxableIncome / 2, p.irBrackets) : progressiveTax(taxableIncome, p.irBrackets)
  const threshold = taxClass === 2 ? p.irEmploymentFundThresholdClass2 : p.irEmploymentFundThresholdClass1
  const fund = taxableIncome > threshold ? p.irEmploymentFundHighRate : p.irEmploymentFundRate
  return base * (1 + fund)
}

export function computeWithdrawal(input: WithdrawalInput): WithdrawalResult {
  const { params: p, company } = input
  const result = input.resultBeforeRemuneration
  const rem = Math.max(0, input.remunerationGross)
  const taxClass = company.taxClass

  // Persona: cotizaciones CCSS (deducibles) y dependencia (no deducible)
  const sBase = socialBase(rem, p)
  const social = sBase * p.socialRate
  const dependencySalary = rem * p.dependencyRate

  // Empresa: la remuneración es deducible; las cotizaciones del independiente las paga el gérant
  const corporateBase = result - rem
  const irc = corporateIncomeTax(corporateBase, p)
  const ircFund = irc * p.ircEmploymentFundRate
  const icc = communalBusinessTax(corporateBase, p)
  const wealthTax = p.minimumWealthTax
  const corporateTaxTotal = irc + ircFund + icc + wealthTax
  const netProfitAfterTax = corporateBase - corporateTaxTotal

  const distributable = Math.max(0, netProfitAfterTax)
  const dist = clamp01(input.distributionRate)
  const dividendsGross = distributable * dist * (company.ownershipPct / 100)
  const retainedEarnings = netProfitAfterTax - distributable * dist

  // IR sobre remuneración: bruto − cotizaciones deducibles − forfaits
  const salaryTaxable = Math.max(0, rem - social - p.salaryDeductions)
  const other = Math.max(0, company.otherHouseholdIncome)
  const taxOther = householdIncomeTax(other, taxClass, p)
  const taxWithSalary = householdIncomeTax(other + salaryTaxable, taxClass, p)
  const salaryIncomeTax = Math.max(0, taxWithSalary - taxOther)

  // Dividendos: 50 % exentos, exención de rentas de capital, resto al barème; dependencia 1,4 % sobre el bruto
  const allowance = p.dividendAllowance * (taxClass === 2 ? 2 : 1)
  const dividendTaxable = Math.max(0, dividendsGross * (1 - p.dividendExemption) - allowance)
  const taxAll = householdIncomeTax(other + salaryTaxable + dividendTaxable, taxClass, p)
  const dividendIncomeTax = Math.max(0, taxAll - taxWithSalary)
  const dividendDependency = dividendsGross * p.dependencyRate

  const incomeTaxTotal = salaryIncomeTax + dividendIncomeTax
  const netInPocket = rem - social - dependencySalary - salaryIncomeTax + dividendsGross - dividendIncomeTax - dividendDependency
  const totalLevies = social + dependencySalary + corporateTaxTotal + incomeTaxTotal + dividendDependency

  return {
    remunerationGross: rem,
    socialBase: sBase,
    socialContributions: social,
    dependencySalary,
    corporateBase,
    irc,
    ircEmploymentFund: ircFund,
    icc,
    wealthTax,
    corporateTaxTotal,
    netProfitAfterTax,
    dividendsGross,
    retainedEarnings,
    dividendTaxable,
    dividendIncomeTax,
    dividendDependency,
    salaryTaxable,
    salaryIncomeTax,
    incomeTaxTotal,
    netInPocket,
    totalLevies,
    effectiveRate: result > 0 ? totalLevies / result : 0,
  }
}

export interface ScanPoint {
  /** % del resultado destinado a remuneración bruta */
  share: number
  remunerationGross: number
  netInPocket: number
  totalLevies: number
}

/** Recorre todos los repartos remuneración/dividendos y devuelve la curva y el óptimo */
export function scanStrategies(base: Omit<WithdrawalInput, 'remunerationGross'>, steps = 100): { curve: ScanPoint[]; best: ScanPoint } {
  const curve: ScanPoint[] = []
  let best: ScanPoint | null = null
  for (let i = 0; i <= steps; i++) {
    const share = i / steps
    const rem = remunerationForShare(base.resultBeforeRemuneration, share)
    const r = computeWithdrawal({ ...base, remunerationGross: rem })
    const pt: ScanPoint = { share, remunerationGross: rem, netInPocket: r.netInPocket, totalLevies: r.totalLevies }
    curve.push(pt)
    if (!best || pt.netInPocket > best.netInPocket) best = pt
  }
  return { curve, best: best! }
}

/** La remuneración bruta es el coste íntegro para la empresa (las cotizaciones son del gérant) */
export function remunerationForShare(result: number, share: number): number {
  return Math.max(0, result) * clamp01(share)
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x))
}
