import type { Expense, ExpenseCategory, Order } from './types'

export interface PeriodSummary {
  /** Ventas TTC menos reembolsos */
  revenueTTC: number
  tvaCollected: number
  /** Cifra de negocio HT (base de facturación) */
  revenueHT: number
  refunds: number
  cogs: number
  shippingCost: number
  paymentFees: number
  grossMargin: number
  expensesHT: number
  tvaDeductible: number
  expensesByCategory: Record<ExpenseCategory, number>
  /** Resultado de explotación antes de remuneración del gérant e IS */
  operatingResult: number
  tvaToPay: number
  orders: number
  aov: number
}

export function orderNet(o: Order): number {
  return o.totalTTC - o.refunds
}

export function orderHT(o: Order): number {
  return orderNet(o) - o.tvaCollected
}

export function orderMargin(o: Order): number {
  return orderHT(o) - o.cogs - o.shippingCost - o.paymentFees
}

export function summarize(orders: Order[], expenses: Expense[]): PeriodSummary {
  const live = orders.filter((o) => o.status !== 'cancelled')
  const revenueTTC = sum(live, orderNet)
  const tvaCollected = sum(live, (o) => o.tvaCollected)
  const refunds = sum(live, (o) => o.refunds)
  const cogs = sum(live, (o) => o.cogs)
  const shippingCost = sum(live, (o) => o.shippingCost)
  const paymentFees = sum(live, (o) => o.paymentFees)
  const revenueHT = revenueTTC - tvaCollected
  const grossMargin = revenueHT - cogs - shippingCost - paymentFees

  const expensesByCategory = {} as Record<ExpenseCategory, number>
  let expensesHT = 0
  let tvaDeductible = 0
  for (const e of expenses) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amountHT
    expensesHT += e.amountHT
    if (e.deductible) tvaDeductible += e.tvaAmount
  }

  return {
    revenueTTC,
    tvaCollected,
    revenueHT,
    refunds,
    cogs,
    shippingCost,
    paymentFees,
    grossMargin,
    expensesHT,
    tvaDeductible,
    expensesByCategory,
    operatingResult: grossMargin - expensesHT,
    tvaToPay: tvaCollected - tvaDeductible,
    orders: live.length,
    aov: live.length ? revenueTTC / live.length : 0,
  }
}

export function monthKey(date: string): string {
  return date.slice(0, 7)
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4))
}

export function filterYear<T extends { date: string }>(items: T[], year: number): T[] {
  return items.filter((i) => yearOf(i.date) === year)
}

export interface MonthlyRow {
  month: string
  revenueHT: number
  cogs: number
  ads: number
  otherExpenses: number
  result: number
  orders: number
}

export function monthlySeries(orders: Order[], expenses: Expense[], year: number): MonthlyRow[] {
  const rows: MonthlyRow[] = []
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`
    const os = orders.filter((o) => monthKey(o.date) === key)
    const es = expenses.filter((e) => monthKey(e.date) === key)
    const s = summarize(os, es)
    rows.push({
      month: key,
      revenueHT: s.revenueHT,
      cogs: s.cogs + s.shippingCost + s.paymentFees,
      ads: s.expensesByCategory.ads ?? 0,
      otherExpenses: s.expensesHT - (s.expensesByCategory.ads ?? 0),
      result: s.operatingResult,
      orders: s.orders,
    })
  }
  return rows
}

export function availableYears(orders: Order[], expenses: Expense[]): number[] {
  const set = new Set<number>()
  for (const o of orders) set.add(yearOf(o.date))
  for (const e of expenses) set.add(yearOf(e.date))
  set.add(new Date().getFullYear())
  return [...set].sort((a, b) => b - a)
}

function sum<T>(items: T[], f: (t: T) => number): number {
  return items.reduce((acc, i) => acc + (f(i) || 0), 0)
}
