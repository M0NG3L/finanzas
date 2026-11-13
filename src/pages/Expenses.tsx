import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { filterYear } from '../domain/finance'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../domain/types'
import { downloadText, importGenericExpenses, toCSV } from '../lib/csv'
import { fmtEUR, todayISO, uid } from '../lib/format'
import { Empty, Field, Modal, NumberInput, Stat } from '../components/ui'

const blank = (tva: number): Expense => ({ id: uid(), date: todayISO(), category: 'ads', vendor: '', amountHT: 0, tvaRate: tva, tvaAmount: 0, deductible: true })

export default function Expenses() {
  const { expenses, year, addExpenses, upsertExpense, removeExpense, company } = useStore()
  const yExpenses = useMemo(() => filterYear(expenses, year), [expenses, year])
  const [editing, setEditing] = useState<Expense | null>(null)
  const [filter, setFilter] = useState<ExpenseCategory | 'all'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  const visible = yExpenses.filter((e) => filter === 'all' || e.category === filter)
  const totalHT = yExpenses.reduce((a, e) => a + e.amountHT, 0)
  const totalTVA = yExpenses.reduce((a, e) => a + (e.deductible ? e.tvaAmount : 0), 0)
  const ads = yExpenses.filter((e) => e.category === 'ads').reduce((a, e) => a + e.amountHT, 0)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    addExpenses(importGenericExpenses(await file.text(), company.defaultTvaRate))
    e.target.value = ''
  }

  function duplicateMonthly(e: Expense) {
    const d = new Date(e.date)
    d.setMonth(d.getMonth() + 1)
    upsertExpense({ ...e, id: uid(), date: d.toISOString().slice(0, 10) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Gastos · {year}</h1>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar CSV</button>
          <button className="btn" onClick={() => downloadText(`gastos-${year}.csv`, toCSV(yExpenses), 'text/csv')} disabled={!yExpenses.length}>Exportar</button>
          <button className="btn btn-primary" onClick={() => setEditing(blank(company.defaultTvaRate))}>+ Gasto</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Gastos HT" value={fmtEUR(totalHT)} />
        <Stat label="Publicidad" value={fmtEUR(ads)} sub={totalHT ? `${Math.round((ads / totalHT) * 100)} % del total` : undefined} />
        <Stat label="TVA deducible" value={fmtEUR(totalTVA)} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : ''}`} onClick={() => setFilter('all')}>Todas</button>
        {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((k) => (
          <button key={k} className={`btn btn-sm ${filter === k ? 'btn-primary' : ''}`} onClick={() => setFilter(k)}>{EXPENSE_CATEGORIES[k]}</button>
        ))}
      </div>

      {visible.length ? (
        <div className="card overflow-x-auto" style={{ padding: 0 }}>
          <table className="data">
            <thead>
              <tr><th>Fecha</th><th>Categoría</th><th>Proveedor</th><th className="num">HT</th><th className="num">TVA</th><th className="num">TTC</th><th>Notas</th><th></th></tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{e.date}</td>
                  <td><span className="chip">{EXPENSE_CATEGORIES[e.category]}</span></td>
                  <td className="font-medium">{e.vendor}</td>
                  <td className="num">{fmtEUR(e.amountHT, 2)}</td>
                  <td className="num">{fmtEUR(e.tvaAmount, 2)}{!e.deductible && <span className="muted"> (no ded.)</span>}</td>
                  <td className="num">{fmtEUR(e.amountHT + e.tvaAmount, 2)}</td>
                  <td className="text-2">{e.notes}</td>
                  <td className="whitespace-nowrap flex gap-1">
                    <button className="btn btn-sm" onClick={() => setEditing(e)}>Editar</button>
                    <button className="btn btn-sm" title="Duplicar al mes siguiente" onClick={() => duplicateMonthly(e)}>+1 mes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Sin gastos en {year}. Añade publicidad, suscripciones, comisiones y proveedores para calcular el beneficio real.</Empty>
      )}

      {editing && (
        <ExpenseForm
          expense={editing}
          onClose={() => setEditing(null)}
          onSave={(e) => { upsertExpense(e); setEditing(null) }}
          onDelete={expenses.some((x) => x.id === editing.id) ? () => { removeExpense(editing.id); setEditing(null) } : undefined}
        />
      )}
    </div>
  )
}

function ExpenseForm({ expense, onClose, onSave, onDelete }: { expense: Expense; onClose: () => void; onSave: (e: Expense) => void; onDelete?: () => void }) {
  const [e, setE] = useState<Expense>(expense)
  const [ttcMode, setTtcMode] = useState(false)
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setE((prev) => ({ ...prev, [k]: v }))
  const recalc = (amountHT: number, tvaRate: number) => setE((prev) => ({ ...prev, amountHT, tvaRate, tvaAmount: Math.round(amountHT * tvaRate) / 100 }))
  const setTTC = (ttc: number) => {
    const ht = Math.round((ttc / (1 + e.tvaRate / 100)) * 100) / 100
    setE((prev) => ({ ...prev, amountHT: ht, tvaAmount: Math.round((ttc - ht) * 100) / 100 }))
  }
  return (
    <Modal title={onDelete ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" className="input" value={e.date} onChange={(ev) => set('date', ev.target.value)} /></Field>
        <Field label="Categoría">
          <select className="select" value={e.category} onChange={(ev) => set('category', ev.target.value as ExpenseCategory)}>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Proveedor"><input className="input" value={e.vendor} onChange={(ev) => set('vendor', ev.target.value)} placeholder="Meta Ads, Shopify, CJ Dropshipping…" /></Field>
        <Field label="Tipo TVA (%)">
          <select className="select" value={e.tvaRate} onChange={(ev) => recalc(e.amountHT, Number(ev.target.value))}>
            {[0, 3, 8, 14, 17].map((r) => <option key={r} value={r}>{r} %</option>)}
          </select>
        </Field>
        <Field label={ttcMode ? 'Importe TTC' : 'Importe HT'} hint={<button type="button" className="underline" onClick={() => setTtcMode(!ttcMode)}>{ttcMode ? 'Introducir HT' : 'Introducir TTC'}</button>}>
          {ttcMode
            ? <NumberInput value={Math.round((e.amountHT + e.tvaAmount) * 100) / 100} onChange={setTTC} />
            : <NumberInput value={e.amountHT} onChange={(n) => recalc(n, e.tvaRate)} />}
        </Field>
        <Field label="TVA"><NumberInput value={e.tvaAmount} onChange={(n) => set('tvaAmount', n)} /></Field>
        <label className="flex items-center gap-2 text-sm col-span-2">
          <input type="checkbox" checked={e.deductible} onChange={(ev) => set('deductible', ev.target.checked)} />
          TVA deducible (factura con TVA luxemburguesa; las facturas intracomunitarias autoliquidadas no generan TVA neta)
        </label>
        <div className="col-span-2"><Field label="Notas"><input className="input" value={e.notes ?? ''} onChange={(ev) => set('notes', ev.target.value)} /></Field></div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        {onDelete && <button className="btn btn-danger" onClick={() => confirm('¿Eliminar este gasto?') && onDelete()}>Eliminar</button>}
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onSave(e)}>Guardar</button>
      </div>
    </Modal>
  )
}
