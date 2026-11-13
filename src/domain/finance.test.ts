import { describe, expect, it } from 'vitest'
import { summarize } from './finance'
import type { Expense, Order } from './types'

const order = (over: Partial<Order> = {}): Order => ({
  id: '1', date: '2025-03-01', orderNumber: '#1001', totalTTC: 120, tvaCollected: 20, refunds: 0,
  cogs: 30, shippingCost: 5, paymentFees: 3, status: 'paid', ...over,
})
const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'e1', date: '2025-03-02', category: 'ads', vendor: 'Meta', amountHT: 40, tvaRate: 20, tvaAmount: 8, deductible: true, ...over,
})

describe('summarize', () => {
  it('calcula CA HT, margen y resultado', () => {
    const s = summarize([order(), order({ id: '2', status: 'cancelled' })], [expense()])
    expect(s.orders).toBe(1)
    expect(s.revenueHT).toBe(100)
    expect(s.grossMargin).toBe(100 - 30 - 5 - 3)
    expect(s.operatingResult).toBe(62 - 40)
    expect(s.tvaToPay).toBe(20 - 8)
  })
  it('descuenta reembolsos', () => {
    const s = summarize([order({ refunds: 60 })], [])
    expect(s.revenueTTC).toBe(60)
    expect(s.refunds).toBe(60)
  })
})
