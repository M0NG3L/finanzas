export type ISODate = string // YYYY-MM-DD

export interface Order {
  id: string
  date: ISODate
  orderNumber: string
  customer?: string
  country?: string
  /** Importe total cobrado al cliente, impuestos incluidos (TTC) */
  totalTTC: number
  /** TVA/IVA recaudado incluido en el total */
  tvaCollected: number
  /** Reembolsos devueltos al cliente (TTC) */
  refunds: number
  /** Coste del producto pagado al proveedor */
  cogs: number
  /** Coste de envío pagado al proveedor / transportista */
  shippingCost: number
  /** Comisiones de pasarela de pago (Shopify Payments, PayPal, Stripe) */
  paymentFees: number
  status: 'paid' | 'pending' | 'refunded' | 'cancelled'
  channel?: string
  notes?: string
}

export type ExpenseCategory =
  | 'ads'
  | 'software'
  | 'shopify'
  | 'supplier'
  | 'fees'
  | 'bank'
  | 'accounting'
  | 'salary'
  | 'other'

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  ads: 'Publicidad (Meta, Google, TikTok)',
  software: 'Software y apps',
  shopify: 'Suscripción Shopify',
  supplier: 'Proveedor / stock',
  fees: 'Comisiones y pasarelas',
  bank: 'Banco y seguros',
  accounting: 'Contabilidad y legal',
  salary: 'Remuneración gerente',
  other: 'Otros',
}

export interface Expense {
  id: string
  date: ISODate
  category: ExpenseCategory
  vendor: string
  /** Importe sin impuestos (HT) */
  amountHT: number
  /** Tipo de TVA aplicado (0, 5.5, 10, 20) */
  tvaRate: number
  /** TVA deducible asociada */
  tvaAmount: number
  deductible: boolean
  notes?: string
}

export interface IRBracket {
  /** límite superior del tramo (null = sin límite) */
  upTo: number | null
  rate: number
}

export interface TaxParams {
  /** Año fiscal al que se refieren los parámetros */
  year: number
  /** Tipo reducido IS */
  isReducedRate: number
  /** Umbral del tipo reducido IS */
  isReducedThreshold: number
  /** Tipo normal IS */
  isNormalRate: number
  /** Cotizaciones TNS como % de la remuneración neta del gérant */
  tnsRate: number
  /** Cotizaciones mínimas anuales TNS (incluso con remuneración 0) */
  tnsMinimum: number
  /** Abattement 10% sobre remuneración para IR */
  salaryAllowanceRate: number
  salaryAllowanceMin: number
  salaryAllowanceMax: number
  /** PFU (flat tax) parte IR */
  pfuIncomeRate: number
  /** Prélèvements sociaux sobre dividendos */
  socialLevyRate: number
  /** Abattement sobre dividendos si opción barème */
  dividendAllowanceRate: number
  /** CSG deducible si opción barème */
  csgDeductibleRate: number
  /** Umbral: dividendos > 10 % de (capital + primas + CCA) → cotizaciones TNS */
  dividendTnsThresholdRate: number
  irBrackets: IRBracket[]
  /** Décote */
  decoteThresholdSingle: number
  decoteThresholdCouple: number
  decoteBaseSingle: number
  decoteBaseCouple: number
  decoteRate: number
}

export interface CompanySettings {
  name: string
  legalForm: string
  capitalSocial: number
  /** Primas de emisión + saldo medio cuenta corriente de socio */
  primesAndCCA: number
  /** Partes del cociente familiar */
  fiscalParts: number
  /** Otros ingresos imponibles del hogar (para situar el tramo marginal) */
  otherHouseholdIncome: number
  /** % de participación del gérant en el capital */
  ownershipPct: number
  defaultTvaRate: number
  currency: string
}

export interface AppData {
  orders: Order[]
  expenses: Expense[]
  company: CompanySettings
  tax: TaxParams
}
