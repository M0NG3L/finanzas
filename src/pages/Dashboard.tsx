import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../store/useStore'
import { filterYear, monthlySeries, summarize } from '../domain/finance'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../domain/types'
import { computeWithdrawal } from '../domain/tax/france'
import { fmtEUR, fmtNum, fmtPct, monthLabel } from '../lib/format'
import { ChartTooltip, Empty, Legend, Stat } from '../components/ui'
import { demoData } from '../lib/demo'

const axisStyle = { fontSize: 11, fill: 'var(--muted)' }

export default function Dashboard() {
  const { orders, expenses, year, company, tax, addOrders, addExpenses } = useStore()
  const yOrders = useMemo(() => filterYear(orders, year), [orders, year])
  const yExpenses = useMemo(() => filterYear(expenses, year), [expenses, year])
  const s = useMemo(() => summarize(yOrders, yExpenses), [yOrders, yExpenses])
  const monthly = useMemo(() => monthlySeries(yOrders, yExpenses, year), [yOrders, yExpenses, year])

  // Estimación rápida: todo el resultado se queda en la empresa (IS) — la optimización está en Impuestos
  const quick = computeWithdrawal({
    resultBeforeRemuneration: s.operatingResult,
    remunerationNet: 0,
    distributionRate: 0,
    dividendMode: 'pfu',
    company,
    params: tax,
  })

  const categories = (Object.entries(s.expensesByCategory) as [ExpenseCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ name: EXPENSE_CATEGORIES[k], value: v }))

  if (!yOrders.length && !yExpenses.length) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Panel · {year}</h1>
        <Empty>
          <p>No hay datos en {year}. Importa tus pedidos de Shopify en <a href="#orders" className="underline">Pedidos</a> o añade gastos en <a href="#expenses" className="underline">Gastos</a>.</p>
          <button className="btn mt-4" onClick={() => { const d = demoData(year); addOrders(d.orders); addExpenses(d.expenses) }}>Cargar datos de ejemplo para {year}</button>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Panel · {year}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Facturación HT" value={fmtEUR(s.revenueHT)} sub={`${fmtNum(s.orders)} pedidos · ticket medio ${fmtEUR(s.aov, 2)}`} />
        <Stat label="Margen bruto" value={fmtEUR(s.grossMargin)} sub={s.revenueHT ? `${fmtPct(s.grossMargin / s.revenueHT)} sobre CA HT` : undefined} />
        <Stat label="Gastos de explotación" value={fmtEUR(s.expensesHT)} sub={`Publicidad ${fmtEUR(s.expensesByCategory.ads ?? 0)}`} />
        <Stat
          label="Resultado antes de remuneración e IS"
          value={fmtEUR(s.operatingResult)}
          tone={s.operatingResult >= 0 ? 'good' : 'bad'}
          sub={s.revenueHT ? `${fmtPct(s.operatingResult / s.revenueHT)} de margen neto` : undefined}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="TVA recaudada" value={fmtEUR(s.tvaCollected)} />
        <Stat label="TVA deducible" value={fmtEUR(s.tvaDeductible)} />
        <Stat label="TVA a pagar (estimada)" value={fmtEUR(s.tvaToPay)} tone={s.tvaToPay > 0 ? undefined : 'good'} />
        <Stat label="IS estimado (sin remuneración)" value={fmtEUR(quick.corporateTax)} sub="Optimiza en Impuestos y retiro" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-medium">Facturación y resultado por mes</h2>
            <Legend items={[{ color: 'var(--series-1)', label: 'CA HT' }, { color: 'var(--series-2)', label: 'Resultado' }]} />
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))} barGap={2} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip content={<ChartTooltip format={(n) => fmtEUR(n)} />} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="revenueHT" name="CA HT" fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="result" name="Resultado" fill="var(--series-2)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="font-medium">Gastos por categoría</h2>
          {categories.length ? (
            <div style={{ height: Math.max(120, categories.length * 34) }}>
              <ResponsiveContainer>
                <BarChart data={categories} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip format={(n) => fmtEUR(n)} />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Bar dataKey="value" name="HT" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-2">Sin gastos registrados.</div>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-medium mb-3">Cuenta de resultados mensual</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Mes</th>
              <th className="num">Pedidos</th>
              <th className="num">CA HT</th>
              <th className="num">Coste ventas</th>
              <th className="num">Publicidad</th>
              <th className="num">Otros gastos</th>
              <th className="num">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m) => (
              <tr key={m.month}>
                <td>{monthLabel(m.month)}</td>
                <td className="num">{fmtNum(m.orders)}</td>
                <td className="num">{fmtEUR(m.revenueHT)}</td>
                <td className="num">{fmtEUR(m.cogs)}</td>
                <td className="num">{fmtEUR(m.ads)}</td>
                <td className="num">{fmtEUR(m.otherExpenses)}</td>
                <td className="num" style={{ color: m.result < 0 ? 'var(--critical)' : undefined }}>{fmtEUR(m.result)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td>Total</td>
              <td className="num">{fmtNum(s.orders)}</td>
              <td className="num">{fmtEUR(s.revenueHT)}</td>
              <td className="num">{fmtEUR(s.cogs + s.shippingCost + s.paymentFees)}</td>
              <td className="num">{fmtEUR(s.expensesByCategory.ads ?? 0)}</td>
              <td className="num">{fmtEUR(s.expensesHT - (s.expensesByCategory.ads ?? 0))}</td>
              <td className="num">{fmtEUR(s.operatingResult)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
