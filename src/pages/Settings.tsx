import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { downloadText } from '../lib/csv'
import { Field, NumberInput } from '../components/ui'
import type { IRBracket } from '../domain/types'

export default function Settings() {
  const { company, tax, setCompany, setTax, resetTax, importAll, clearAll, orders, expenses } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  function exportJSON() {
    downloadText(`finanzas-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ orders, expenses, company, tax }, null, 2), 'application/json')
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      importAll(JSON.parse(await f.text()))
      setMsg('Copia restaurada correctamente.')
    } catch {
      setMsg('El archivo no es una copia válida.')
    }
    e.target.value = ''
  }
  const pct = (v: number, set: (n: number) => void, step = 0.1) => <NumberInput value={Math.round(v * 10000) / 100} onChange={(n) => set(n / 100)} step={step} />
  const setBracket = (i: number, patch: Partial<IRBracket>) => setTax({ irBrackets: tax.irBrackets.map((b, j) => (j === i ? { ...b, ...patch } : b)) })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">Empresa y situación personal</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Nombre"><input className="input" value={company.name} onChange={(e) => setCompany({ name: e.target.value })} /></Field>
          <Field label="Forma jurídica"><input className="input" value={company.legalForm} onChange={(e) => setCompany({ legalForm: e.target.value })} /></Field>
          <Field label="TVA por defecto (%)"><NumberInput value={company.defaultTvaRate} onChange={(n) => setCompany({ defaultTvaRate: n })} step={0.5} /></Field>
          <Field label="Capital social (€)" hint="Base del umbral del 10 % para dividendos"><NumberInput value={company.capitalSocial} onChange={(n) => setCompany({ capitalSocial: n })} step={100} /></Field>
          <Field label="Primas de emisión + cuenta corriente de socio (€)" hint="Saldo medio del ejercicio"><NumberInput value={company.primesAndCCA} onChange={(n) => setCompany({ primesAndCCA: n })} step={100} /></Field>
          <Field label="Participación del gérant (%)"><NumberInput value={company.ownershipPct} onChange={(n) => setCompany({ ownershipPct: n })} step={1} min={0} max={100} /></Field>
          <Field label="Partes del cociente familiar" hint="1 soltero · 2 pareja · +0,5 por hijo"><NumberInput value={company.fiscalParts} onChange={(n) => setCompany({ fiscalParts: n })} step={0.5} min={1} /></Field>
          <Field label="Otros ingresos imponibles del hogar (€/año)" hint="Sueldo de la pareja, alquileres… sitúan tu tramo marginal"><NumberInput value={company.otherHouseholdIncome} onChange={(n) => setCompany({ otherHouseholdIncome: n })} step={500} /></Field>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-medium">Parámetros fiscales (Francia · {tax.year})</h2>
          <button className="btn btn-sm" onClick={() => confirm('¿Restaurar los valores por defecto?') && resetTax()}>Restaurar por defecto</button>
        </div>
        <p className="text-sm text-2">Todos los tipos y umbrales son editables para actualizarlos cada año o adaptarlos a tu situación. Los valores van en porcentaje.</p>
        <h3 className="text-sm font-medium mt-1">Impuesto de sociedades (IS)</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="Año de referencia"><NumberInput value={tax.year} onChange={(n) => setTax({ year: n })} step={1} /></Field>
          <Field label="Tipo reducido (%)">{pct(tax.isReducedRate, (n) => setTax({ isReducedRate: n }))}</Field>
          <Field label="Umbral tipo reducido (€)"><NumberInput value={tax.isReducedThreshold} onChange={(n) => setTax({ isReducedThreshold: n })} step={500} /></Field>
          <Field label="Tipo normal (%)">{pct(tax.isNormalRate, (n) => setTax({ isNormalRate: n }))}</Field>
        </div>
        <h3 className="text-sm font-medium mt-1">Remuneración del gérant (TNS)</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="Cotizaciones TNS (% del neto)" hint="≈ 45 % del neto para un gérant majoritaire">{pct(tax.tnsRate, (n) => setTax({ tnsRate: n }))}</Field>
          <Field label="Cotizaciones mínimas (€/año)"><NumberInput value={tax.tnsMinimum} onChange={(n) => setTax({ tnsMinimum: n })} step={50} /></Field>
          <Field label="Abattement IR (%)">{pct(tax.salaryAllowanceRate, (n) => setTax({ salaryAllowanceRate: n }))}</Field>
          <Field label="Abattement máximo (€)"><NumberInput value={tax.salaryAllowanceMax} onChange={(n) => setTax({ salaryAllowanceMax: n })} step={1} /></Field>
        </div>
        <h3 className="text-sm font-medium mt-1">Dividendos</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="PFU parte IR (%)">{pct(tax.pfuIncomeRate, (n) => setTax({ pfuIncomeRate: n }))}</Field>
          <Field label="Prélèvements sociaux (%)">{pct(tax.socialLevyRate, (n) => setTax({ socialLevyRate: n }))}</Field>
          <Field label="Abattement opción barème (%)">{pct(tax.dividendAllowanceRate, (n) => setTax({ dividendAllowanceRate: n }))}</Field>
          <Field label="Umbral TNS sobre dividendos (% capital)">{pct(tax.dividendTnsThresholdRate, (n) => setTax({ dividendTnsThresholdRate: n }))}</Field>
        </div>
        <h3 className="text-sm font-medium mt-1">Barème del impuesto sobre la renta (por parte)</h3>
        <div className="grid md:grid-cols-5 gap-3">
          {tax.irBrackets.map((b, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Field label={`Tramo ${i + 1}: hasta (€)`}>
                {b.upTo === null ? <input className="input" value="∞" disabled /> : <NumberInput value={b.upTo} onChange={(n) => setBracket(i, { upTo: n })} step={1} />}
              </Field>
              <Field label="Tipo (%)">{pct(b.rate, (n) => setBracket(i, { rate: n }), 1)}</Field>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-5 gap-3">
          <Field label="Décote umbral soltero (€)"><NumberInput value={tax.decoteThresholdSingle} onChange={(n) => setTax({ decoteThresholdSingle: n })} step={1} /></Field>
          <Field label="Décote base soltero (€)"><NumberInput value={tax.decoteBaseSingle} onChange={(n) => setTax({ decoteBaseSingle: n })} step={1} /></Field>
          <Field label="Décote umbral pareja (€)"><NumberInput value={tax.decoteThresholdCouple} onChange={(n) => setTax({ decoteThresholdCouple: n })} step={1} /></Field>
          <Field label="Décote base pareja (€)"><NumberInput value={tax.decoteBaseCouple} onChange={(n) => setTax({ decoteBaseCouple: n })} step={1} /></Field>
          <Field label="Décote tipo (%)">{pct(tax.decoteRate, (n) => setTax({ decoteRate: n }), 0.01)}</Field>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">Datos</h2>
        <p className="text-sm text-2">Los datos se guardan en este navegador. Haz copias de seguridad periódicas y restáuralas en otro dispositivo si lo necesitas.</p>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />
          <button className="btn btn-primary" onClick={exportJSON}>Exportar copia (JSON)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Restaurar copia</button>
          <button className="btn btn-danger" onClick={() => confirm('Se borrarán todos los pedidos y gastos. ¿Continuar?') && clearAll()}>Borrar pedidos y gastos</button>
        </div>
        {msg && <div className="chip">{msg}</div>}
      </section>
    </div>
  )
}
