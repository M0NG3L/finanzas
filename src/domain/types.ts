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

export type TaxClass = 1 | 2

/** Parámetros fiscales — Luxemburgo, SARL sujeta al IRC con gérant majoritaire afiliado como independiente */
export interface TaxParams {
  year: number
  /** IRC: tipo hasta el primer umbral */
  ircLowRate: number
  ircLowThreshold: number
  /** IRC: tramo intermedio = base fija + tipo marginal sobre el exceso */
  ircMidBase: number
  ircMidRate: number
  ircHighThreshold: number
  ircHighRate: number
  /** Contribución al fondo de empleo sobre el IRC */
  ircEmploymentFundRate: number
  /** ICC (impôt commercial communal) del municipio y su exención */
  iccRate: number
  iccAllowance: number
  /** Impuesto sobre el patrimonio mínimo (IF minimum), importe fijo anual */
  minimumWealthTax: number
  /** Cotizaciones CCSS del independiente (pensión, salud, accidente, mutualidad), deducibles del IR */
  socialRate: number
  /** Base mínima anual (salario social mínimo × 12) y techo (5 × SSM × 12) */
  socialMinBase: number
  socialMaxBase: number
  /** El gérant con autorización de establecimiento cotiza sobre la base mínima aunque no cobre */
  socialMinimumAlways: boolean
  /** Seguro de dependencia (no deducible), sobre remuneración y rentas de capital */
  dependencyRate: number
  /** Deducciones a tanto alzado sobre la remuneración (frais d'obtention + dépenses spéciales) */
  salaryDeductions: number
  /** Exención parcial de dividendos (art. 115 15a LIR) */
  dividendExemption: number
  /** Exención de rentas de capital (clase 1; se duplica en clase 2) */
  dividendAllowance: number
  /** Barème del IR, clase 1 */
  irBrackets: IRBracket[]
  /** Recargo del fondo de empleo sobre el IR: tipo normal y tipo alto a partir de un umbral de renta imponible */
  irEmploymentFundRate: number
  irEmploymentFundHighRate: number
  irEmploymentFundThresholdClass1: number
  irEmploymentFundThresholdClass2: number
}

export interface CompanySettings {
  name: string
  legalForm: string
  /** Clase de impuesto del gérant: 1 (soltero) o 2 (casado / pacs con imposición colectiva) */
  taxClass: TaxClass
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
