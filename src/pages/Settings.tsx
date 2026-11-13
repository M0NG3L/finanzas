import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { downloadText } from '../lib/csv'
import { Field, NumberInput } from '../components/ui'
import type { IRBracket, TaxClass } from '../domain/types'

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
          <Field label="TVA por defecto (%)" hint="Luxemburgo: 17 % normal · 14 % · 8 % · 3 %"><NumberInput value={company.defaultTvaRate} onChange={(n) => setCompany({ defaultTvaRate: n })} step={0.5} /></Field>
          <Field label="Clase de impuesto del gérant" hint="Clase 2: casado o pacs con imposición colectiva (splitting)">
            <select className="select" value={company.taxClass} onChange={(e) => setCompany({ taxClass: Number(e.target.value) as TaxClass })}>
              <option value={1}>Clase 1 (soltero)</option>
              <option value={2}>Clase 2 (imposición colectiva)</option>
            </select>
          </Field>
          <Field label="Otros ingresos imponibles del hogar (€/año)" hint="Sueldo de la pareja, alquileres… sitúan tu tramo marginal"><NumberInput value={company.otherHouseholdIncome} onChange={(n) => setCompany({ otherHouseholdIncome: n })} step={500} /></Field>
          <Field label="Participación del gérant (%)" hint="Con menos del 25 % tributarías como asalariado"><NumberInput value={company.ownershipPct} onChange={(n) => setCompany({ ownershipPct: n })} step={1} min={0} max={100} /></Field>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-medium">Parámetros fiscales (Luxemburgo · {tax.year})</h2>
          <button className="btn btn-sm" onClick={() => confirm('¿Restaurar los valores por defecto?') && resetTax()}>Restaurar por defecto</button>
        </div>
        <p className="text-sm text-2">Todos los tipos y umbrales son editables para actualizarlos cada año o adaptarlos a tu municipio y situación. Los tipos van en porcentaje.</p>

        <h3 className="text-sm font-medium mt-1">Impuestos de la empresa</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="Año de referencia"><NumberInput value={tax.year} onChange={(n) => setTax({ year: n })} step={1} /></Field>
          <Field label="IRC tipo bajo (%)">{pct(tax.ircLowRate, (n) => setTax({ ircLowRate: n }))}</Field>
          <Field label="IRC umbral tipo bajo (€)"><NumberInput value={tax.ircLowThreshold} onChange={(n) => setTax({ ircLowThreshold: n })} step={1000} /></Field>
          <Field label="IRC tipo alto (%)">{pct(tax.ircHighRate, (n) => setTax({ ircHighRate: n }))}</Field>
          <Field label="IRC umbral tipo alto (€)"><NumberInput value={tax.ircHighThreshold} onChange={(n) => setTax({ ircHighThreshold: n })} step={1000} /></Field>
          <Field label="IRC tramo intermedio: base (€)"><NumberInput value={tax.ircMidBase} onChange={(n) => setTax({ ircMidBase: n })} step={100} /></Field>
          <Field label="IRC tramo intermedio: tipo marginal (%)">{pct(tax.ircMidRate, (n) => setTax({ ircMidRate: n }))}</Field>
          <Field label="Fondo de empleo sobre IRC (%)">{pct(tax.ircEmploymentFundRate, (n) => setTax({ ircEmploymentFundRate: n }))}</Field>
          <Field label="ICC municipal (%)" hint="Luxembourg-Ville 6,75 %; Esch 7,5 %…">{pct(tax.iccRate, (n) => setTax({ iccRate: n }), 0.01)}</Field>
          <Field label="ICC exención (€)"><NumberInput value={tax.iccAllowance} onChange={(n) => setTax({ iccAllowance: n })} step={100} /></Field>
          <Field label="Impuesto sobre el patrimonio mínimo (€)" hint="535 € para balances ≤ 350 k€"><NumberInput value={tax.minimumWealthTax} onChange={(n) => setTax({ minimumWealthTax: n })} step={5} /></Field>
        </div>

        <h3 className="text-sm font-medium mt-1">Gérant independiente (CCSS)</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="Cotizaciones CCSS (%)" hint="Pensión 16 % + salud ≈ 5,6 % + accidente + mutualidad">{pct(tax.socialRate, (n) => setTax({ socialRate: n }))}</Field>
          <Field label="Base mínima anual (€)" hint="Salario social mínimo × 12"><NumberInput value={tax.socialMinBase} onChange={(n) => setTax({ socialMinBase: n })} step={100} /></Field>
          <Field label="Techo anual (€)" hint="5 × salario social mínimo × 12"><NumberInput value={tax.socialMaxBase} onChange={(n) => setTax({ socialMaxBase: n })} step={100} /></Field>
          <Field label="Dependencia (%)" hint="No deducible; también sobre dividendos">{pct(tax.dependencyRate, (n) => setTax({ dependencyRate: n }))}</Field>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={tax.socialMinimumAlways} onChange={(e) => setTax({ socialMinimumAlways: e.target.checked })} />
            Cotizar sobre la base mínima aunque la remuneración sea cero (gérant con autorización de establecimiento)
          </label>
          <Field label="Deducciones a tanto alzado IR (€)" hint="Frais d'obtention 540 € + dépenses spéciales 480 €"><NumberInput value={tax.salaryDeductions} onChange={(n) => setTax({ salaryDeductions: n })} step={10} /></Field>
        </div>

        <h3 className="text-sm font-medium mt-1">Dividendos</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="Exención parcial (%)" hint="Art. 115 15a LIR">{pct(tax.dividendExemption, (n) => setTax({ dividendExemption: n }))}</Field>
          <Field label="Exención rentas de capital (€)" hint="Se duplica en clase 2"><NumberInput value={tax.dividendAllowance} onChange={(n) => setTax({ dividendAllowance: n })} step={100} /></Field>
        </div>

        <h3 className="text-sm font-medium mt-1">Barème del IR (clase 1) y fondo de empleo</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="Fondo de empleo (%)">{pct(tax.irEmploymentFundRate, (n) => setTax({ irEmploymentFundRate: n }))}</Field>
          <Field label="Fondo de empleo tipo alto (%)">{pct(tax.irEmploymentFundHighRate, (n) => setTax({ irEmploymentFundHighRate: n }))}</Field>
          <Field label="Umbral tipo alto clase 1 (€)"><NumberInput value={tax.irEmploymentFundThresholdClass1} onChange={(n) => setTax({ irEmploymentFundThresholdClass1: n })} step={1000} /></Field>
          <Field label="Umbral tipo alto clase 2 (€)"><NumberInput value={tax.irEmploymentFundThresholdClass2} onChange={(n) => setTax({ irEmploymentFundThresholdClass2: n })} step={1000} /></Field>
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>Tramo</th><th>Hasta (€)</th><th>Tipo (%)</th></tr></thead>
            <tbody>
              {tax.irBrackets.map((b, i) => (
                <tr key={i}>
                  <td className="muted">{i + 1}</td>
                  <td style={{ width: 200 }}>{b.upTo === null ? <input className="input" value="∞" disabled /> : <NumberInput value={b.upTo} onChange={(n) => setBracket(i, { upTo: n })} step={1} />}</td>
                  <td style={{ width: 140 }}>{pct(b.rate, (n) => setBracket(i, { rate: n }), 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
