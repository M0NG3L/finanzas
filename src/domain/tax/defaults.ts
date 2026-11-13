import type { CompanySettings, TaxParams } from '../types'

/**
 * Parámetros fiscales por defecto — Francia, SARL sujeta al IS con gérant majoritaire (TNS).
 * Cifras del barème 2025 (sobre rentas 2024). Todo es editable en Ajustes.
 */
export const DEFAULT_TAX_PARAMS: TaxParams = {
  year: 2025,
  isReducedRate: 0.15,
  isReducedThreshold: 42_500,
  isNormalRate: 0.25,
  tnsRate: 0.45,
  tnsMinimum: 1_200,
  salaryAllowanceRate: 0.10,
  salaryAllowanceMin: 504,
  salaryAllowanceMax: 14_426,
  pfuIncomeRate: 0.128,
  socialLevyRate: 0.172,
  dividendAllowanceRate: 0.40,
  csgDeductibleRate: 0.068,
  dividendTnsThresholdRate: 0.10,
  irBrackets: [
    { upTo: 11_497, rate: 0 },
    { upTo: 29_315, rate: 0.11 },
    { upTo: 83_823, rate: 0.30 },
    { upTo: 180_294, rate: 0.41 },
    { upTo: null, rate: 0.45 },
  ],
  decoteThresholdSingle: 1_964,
  decoteThresholdCouple: 3_248,
  decoteBaseSingle: 889,
  decoteBaseCouple: 1_470,
  decoteRate: 0.4525,
}

export const DEFAULT_COMPANY: CompanySettings = {
  name: 'Mi SARL',
  legalForm: 'SARL (gérant majoritaire, TNS)',
  capitalSocial: 1_000,
  primesAndCCA: 0,
  fiscalParts: 1,
  otherHouseholdIncome: 0,
  ownershipPct: 100,
  defaultTvaRate: 20,
  currency: 'EUR',
}
