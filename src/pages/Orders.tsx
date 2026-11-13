import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { filterYear, orderHT, orderMargin, summarize } from '../domain/finance'
import type { Order } from '../domain/types'
import { downloadText, importGenericOrders, importShopifyOrders, toCSV } from '../lib/csv'
import { fmtEUR, fmtNum, todayISO, uid } from '../lib/format'
import { Empty, Field, Modal, NumberInput, Stat } from '../components/ui'

const STATUS_ES: Record<Order['status'], string> = { paid: 'Pagado', pending: 'Pendiente', refunded: 'Reembolsado', cancelled: 'Cancelado' }

const blank = (): Order => ({
  id: uid(), date: todayISO(), orderNumber: '', totalTTC: 0, tvaCollected: 0, refunds: 0, cogs: 0, shippingCost: 0, paymentFees: 0, status: 'paid', channel: 'Shopify',
})

export default function Orders() {
  const { orders, year, addOrders, upsertOrder, removeOrder, company } = useStore()
  const yOrders = useMemo(() => filterYear(orders, year), [orders, year])
  const [editing, setEditing] = useState<Order | null>(null)
  const [bulk, setBulk] = useState(false)
  const [query, setQuery] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const s = summarize(yOrders, [])

  const visible = yOrders.filter((o) => {
    if (!query) return true
    const q = query.toLowerCase()
    return o.orderNumber.toLowerCase().includes(q) || (o.customer ?? '').toLowerCase().includes(q) || (o.country ?? '').toLowerCase().includes(q)
  })

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const isShopify = /(^|,)"?Name"?,/.test(text.split('\n')[0]) && /Financial Status|Fulfillment Status/.test(text.split('\n')[0])
    const parsed = isShopify ? importShopifyOrders(text) : importGenericOrders(text)
    const before = orders.length
    addOrders(parsed)
    const after = useStore.getState().orders.length
    setImportMsg(`${after - before} pedidos importados (${parsed.length - (after - before)} duplicados omitidos) · formato ${isShopify ? 'Shopify' : 'genérico'}`)
    e.target.value = ''
  }

  function exportCSV() {
    downloadText(`pedidos-${year}.csv`, toCSV(yOrders), 'text/csv')
  }

  /** Aplica un coste por defecto a todos los pedidos del ejercicio que aún no tienen COGS */
  function applyBulkCosts(cogsPct: number, shipping: number, feePct: number, feeFixed: number) {
    for (const o of yOrders) {
      upsertOrder({
        ...o,
        cogs: o.cogs || Math.round(orderHT(o) * cogsPct) / 100,
        shippingCost: o.shippingCost || shipping,
        paymentFees: o.paymentFees || Math.round((o.totalTTC * feePct + feeFixed * 100)) / 100,
      })
    }
    setBulk(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Pedidos · {year}</h1>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar CSV (Shopify)</button>
          <button className="btn" onClick={() => setBulk(true)} disabled={!yOrders.length}>Costes en bloque</button>
          <button className="btn" onClick={exportCSV} disabled={!yOrders.length}>Exportar</button>
          <button className="btn btn-primary" onClick={() => setEditing(blank())}>+ Pedido</button>
        </div>
      </div>
      {importMsg && <div className="chip">{importMsg}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Pedidos" value={fmtNum(s.orders)} />
        <Stat label="Ventas TTC (neto reembolsos)" value={fmtEUR(s.revenueTTC)} />
        <Stat label="Facturación HT" value={fmtEUR(s.revenueHT)} />
        <Stat label="Margen bruto" value={fmtEUR(s.grossMargin)} tone={s.grossMargin >= 0 ? 'good' : 'bad'} />
      </div>

      <input className="input" placeholder="Buscar por nº de pedido, cliente o país…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {visible.length ? (
        <div className="card overflow-x-auto" style={{ padding: 0 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Fecha</th><th>Pedido</th><th>Cliente</th><th>Estado</th>
                <th className="num">Total TTC</th><th className="num">TVA</th><th className="num">Reemb.</th>
                <th className="num">Coste prod.</th><th className="num">Envío</th><th className="num">Comis.</th><th className="num">Margen</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const m = orderMargin(o)
                return (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap">{o.date}</td>
                    <td className="font-medium">{o.orderNumber}</td>
                    <td className="text-2">{o.customer}{o.country ? ` · ${o.country}` : ''}</td>
                    <td><span className="chip">{STATUS_ES[o.status]}</span></td>
                    <td className="num">{fmtEUR(o.totalTTC, 2)}</td>
                    <td className="num">{fmtEUR(o.tvaCollected, 2)}</td>
                    <td className="num">{o.refunds ? fmtEUR(o.refunds, 2) : '—'}</td>
                    <td className="num">{fmtEUR(o.cogs, 2)}</td>
                    <td className="num">{fmtEUR(o.shippingCost, 2)}</td>
                    <td className="num">{fmtEUR(o.paymentFees, 2)}</td>
                    <td className="num" style={{ color: m < 0 ? 'var(--critical)' : 'var(--good-text)' }}>{fmtEUR(m, 2)}</td>
                    <td className="whitespace-nowrap">
                      <button className="btn btn-sm" onClick={() => setEditing(o)}>Editar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          No hay pedidos en {year}. Exporta tus pedidos desde Shopify (Pedidos → Exportar → CSV) e impórtalos aquí, o añádelos a mano.
        </Empty>
      )}

      {editing && (
        <OrderForm
          order={editing}
          defaultTva={company.defaultTvaRate}
          onClose={() => setEditing(null)}
          onSave={(o) => { upsertOrder(o); setEditing(null) }}
          onDelete={orders.some((x) => x.id === editing.id) ? () => { removeOrder(editing.id); setEditing(null) } : undefined}
        />
      )}
      {bulk && <BulkCosts onClose={() => setBulk(false)} onApply={applyBulkCosts} count={yOrders.filter((o) => !o.cogs).length} />}
    </div>
  )
}

function OrderForm({ order, defaultTva, onClose, onSave, onDelete }: { order: Order; defaultTva: number; onClose: () => void; onSave: (o: Order) => void; onDelete?: () => void }) {
  const [o, setO] = useState<Order>(order)
  const set = <K extends keyof Order>(k: K, v: Order[K]) => setO((prev) => ({ ...prev, [k]: v }))
  const margin = orderMargin(o)
  return (
    <Modal title={onDelete ? `Pedido ${o.orderNumber}` : 'Nuevo pedido'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="input" value={o.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Nº pedido"><input className="input" value={o.orderNumber} onChange={(e) => set('orderNumber', e.target.value)} /></Field>
        <Field label="Cliente"><input className="input" value={o.customer ?? ''} onChange={(e) => set('customer', e.target.value)} /></Field>
        <Field label="País"><input className="input" value={o.country ?? ''} onChange={(e) => set('country', e.target.value)} /></Field>
        <Field label="Estado">
          <select className="select" value={o.status} onChange={(e) => set('status', e.target.value as Order['status'])}>
            {Object.entries(STATUS_ES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Canal"><input className="input" value={o.channel ?? ''} onChange={(e) => set('channel', e.target.value)} /></Field>
        <Field label="Total cobrado TTC"><NumberInput value={o.totalTTC} onChange={(n) => set('totalTTC', n)} /></Field>
        <Field label="TVA incluida" hint={`Calcular al ${defaultTva} %`}>
          <div className="flex gap-2">
            <NumberInput value={o.tvaCollected} onChange={(n) => set('tvaCollected', n)} />
            <button type="button" className="btn btn-sm" onClick={() => set('tvaCollected', Math.round((o.totalTTC - o.totalTTC / (1 + defaultTva / 100)) * 100) / 100)}>Calc.</button>
          </div>
        </Field>
        <Field label="Reembolsos TTC"><NumberInput value={o.refunds} onChange={(n) => set('refunds', n)} /></Field>
        <Field label="Coste producto (proveedor)"><NumberInput value={o.cogs} onChange={(n) => set('cogs', n)} /></Field>
        <Field label="Coste envío"><NumberInput value={o.shippingCost} onChange={(n) => set('shippingCost', n)} /></Field>
        <Field label="Comisiones de pago"><NumberInput value={o.paymentFees} onChange={(n) => set('paymentFees', n)} /></Field>
        <div className="col-span-2">
          <Field label="Notas"><input className="input" value={o.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
        <div className="text-sm text-2">Margen: <span className="font-semibold tabular" style={{ color: margin < 0 ? 'var(--critical)' : 'var(--good-text)' }}>{fmtEUR(margin, 2)}</span></div>
        <div className="flex gap-2">
          {onDelete && <button className="btn btn-danger" onClick={() => confirm('¿Eliminar este pedido?') && onDelete()}>Eliminar</button>}
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(o)}>Guardar</button>
        </div>
      </div>
    </Modal>
  )
}

function BulkCosts({ onClose, onApply, count }: { onClose: () => void; onApply: (cogsPct: number, shipping: number, feePct: number, feeFixed: number) => void; count: number }) {
  const [cogsPct, setCogsPct] = useState(30)
  const [shipping, setShipping] = useState(0)
  const [feePct, setFeePct] = useState(1.6)
  const [feeFixed, setFeeFixed] = useState(0.25)
  return (
    <Modal title="Aplicar costes en bloque" onClose={onClose}>
      <p className="text-sm text-2 mb-3">
        Shopify no exporta tus costes de proveedor. Aplica aquí una estimación a los {count} pedidos del ejercicio que aún no tienen coste. Los pedidos con coste ya informado no se tocan.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Coste producto (% del precio HT)"><NumberInput value={cogsPct} onChange={setCogsPct} step={1} /></Field>
        <Field label="Envío por pedido (€)"><NumberInput value={shipping} onChange={setShipping} /></Field>
        <Field label="Comisión pasarela (%)"><NumberInput value={feePct} onChange={setFeePct} step={0.1} /></Field>
        <Field label="Comisión fija por pedido (€)"><NumberInput value={feeFixed} onChange={setFeeFixed} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onApply(cogsPct, shipping, feePct / 100, feeFixed)}>Aplicar</button>
      </div>
    </Modal>
  )
}
