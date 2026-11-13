import type { Expense, Order } from '../domain/types'
import { uid } from './format'

/** Datos de ejemplo deterministas para probar la aplicación */
export function demoData(year: number): { orders: Order[]; expenses: Expense[] } {
  let seed = 42
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const orders: Order[] = []
  const expenses: Expense[] = []
  const countries = ['FR', 'FR', 'FR', 'BE', 'ES', 'DE', 'IT']
  let n = 1001
  for (let m = 1; m <= 12; m++) {
    const count = Math.round(40 + m * 6 + rnd() * 12)
    for (let i = 0; i < count; i++) {
      const day = 1 + Math.floor(rnd() * 28)
      const price = 49.9 + Math.floor(rnd() * 4) * 10
      const qty = rnd() > 0.8 ? 2 : 1
      const total = Math.round(price * qty * 100) / 100
      const refunded = rnd() > 0.95
      orders.push({
        id: uid(),
        date: `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        orderNumber: `#${n++}`,
        customer: `cliente${n}@mail.com`,
        country: countries[Math.floor(rnd() * countries.length)],
        totalTTC: total,
        tvaCollected: Math.round((total - total / 1.2) * 100) / 100,
        refunds: refunded ? total : 0,
        cogs: Math.round(price * qty * 0.22 * 100) / 100,
        shippingCost: 3.5 * qty,
        paymentFees: Math.round((total * 0.016 + 0.25) * 100) / 100,
        status: refunded ? 'refunded' : 'paid',
        channel: 'Shopify',
      })
    }
    const monthRevenue = orders.filter((o) => o.date.startsWith(`${year}-${String(m).padStart(2, '0')}`)).reduce((a, o) => a + o.totalTTC, 0)
    const ads = Math.round(monthRevenue * 0.2)
    const date = `${year}-${String(m).padStart(2, '0')}-28`
    expenses.push(
      { id: uid(), date, category: 'ads', vendor: 'Meta Ads', amountHT: ads * 0.7, tvaRate: 0, tvaAmount: 0, deductible: false, notes: 'Autoliquidación TVA intracomunitaria' },
      { id: uid(), date, category: 'ads', vendor: 'TikTok Ads', amountHT: ads * 0.3, tvaRate: 0, tvaAmount: 0, deductible: false },
      { id: uid(), date, category: 'shopify', vendor: 'Shopify', amountHT: 36, tvaRate: 0, tvaAmount: 0, deductible: false },
      { id: uid(), date, category: 'software', vendor: 'Apps Shopify', amountHT: 59, tvaRate: 0, tvaAmount: 0, deductible: false },
      { id: uid(), date, category: 'accounting', vendor: 'Expert-comptable', amountHT: 120, tvaRate: 20, tvaAmount: 24, deductible: true },
      { id: uid(), date, category: 'bank', vendor: 'Qonto', amountHT: 29, tvaRate: 20, tvaAmount: 5.8, deductible: true },
    )
  }
  return { orders, expenses }
}
