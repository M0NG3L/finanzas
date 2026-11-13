import Papa from 'papaparse'
import type { Expense, Order } from '../domain/types'
import { uid } from './format'

type Row = Record<string, string>

function num(v: string | undefined): number {
  if (!v) return 0
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function toISO(v: string | undefined): string {
  if (!v) return new Date().toISOString().slice(0, 10)
  const d = new Date(v)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  const m = v.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return v.slice(0, 10)
}

function pick(row: Row, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const found = Object.keys(row).find((h) => h.trim().toLowerCase() === k.toLowerCase())
    if (found && row[found] !== '') return row[found]
  }
  return undefined
}

export function parseCSV(text: string): Row[] {
  const res = Papa.parse<Row>(text, { header: true, skipEmptyLines: true })
  return res.data
}

/**
 * Importa la exportación de pedidos de Shopify (Orders export CSV).
 * Shopify repite el pedido en varias filas (una por línea de producto); solo la primera lleva los totales.
 */
export function importShopifyOrders(text: string): Order[] {
  const rows = parseCSV(text)
  const orders: Order[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const name = pick(r, 'Name', 'Order', 'Pedido', 'Nombre')
    if (!name || seen.has(name)) continue
    const total = pick(r, 'Total')
    if (total === undefined) continue
    seen.add(name)
    const financial = (pick(r, 'Financial Status', 'Estado financiero') ?? '').toLowerCase()
    const status: Order['status'] =
      financial.includes('refund') ? 'refunded' : financial.includes('void') ? 'cancelled' : financial === 'pending' ? 'pending' : 'paid'
    orders.push({
      id: uid(),
      date: toISO(pick(r, 'Created at', 'Paid at', 'Fecha de creación')),
      orderNumber: name,
      customer: pick(r, 'Email', 'Billing Name', 'Correo electrónico'),
      country: pick(r, 'Shipping Country', 'Billing Country', 'País de envío'),
      totalTTC: num(total),
      tvaCollected: num(pick(r, 'Taxes', 'Impuestos')),
      refunds: num(pick(r, 'Refunded Amount', 'Importe reembolsado')),
      cogs: 0,
      shippingCost: 0,
      paymentFees: 0,
      status,
      channel: 'Shopify',
    })
  }
  return orders
}

/** CSV genérico de pedidos: columnas date, orderNumber, totalTTC, tvaCollected, refunds, cogs, shippingCost, paymentFees, status */
export function importGenericOrders(text: string): Order[] {
  return parseCSV(text).map((r) => ({
    id: uid(),
    date: toISO(pick(r, 'date', 'fecha')),
    orderNumber: pick(r, 'orderNumber', 'pedido', 'order') ?? '',
    customer: pick(r, 'customer', 'cliente'),
    country: pick(r, 'country', 'pais', 'país'),
    totalTTC: num(pick(r, 'totalTTC', 'total')),
    tvaCollected: num(pick(r, 'tvaCollected', 'tva', 'iva')),
    refunds: num(pick(r, 'refunds', 'reembolsos')),
    cogs: num(pick(r, 'cogs', 'coste')),
    shippingCost: num(pick(r, 'shippingCost', 'envio', 'envío')),
    paymentFees: num(pick(r, 'paymentFees', 'comisiones')),
    status: ((pick(r, 'status', 'estado') ?? 'paid') as Order['status']),
    channel: pick(r, 'channel', 'canal'),
  }))
}

/** CSV genérico de gastos: date, category, vendor, amountHT, tvaRate, notes */
export function importGenericExpenses(text: string, defaultTva: number): Expense[] {
  return parseCSV(text).map((r) => {
    const amountHT = num(pick(r, 'amountHT', 'importe', 'amount'))
    const tvaRate = pick(r, 'tvaRate', 'tva', 'iva') !== undefined ? num(pick(r, 'tvaRate', 'tva', 'iva')) : defaultTva
    return {
      id: uid(),
      date: toISO(pick(r, 'date', 'fecha')),
      category: ((pick(r, 'category', 'categoria', 'categoría') ?? 'other') as Expense['category']),
      vendor: pick(r, 'vendor', 'proveedor') ?? '',
      amountHT,
      tvaRate,
      tvaAmount: Math.round(amountHT * tvaRate) / 100,
      deductible: (pick(r, 'deductible') ?? 'true').toLowerCase() !== 'false',
      notes: pick(r, 'notes', 'notas'),
    }
  })
}

export function toCSV<T extends object>(rows: T[]): string {
  return Papa.unparse(rows)
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
