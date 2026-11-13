import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../store/useStore'
import { filterYear, summarize } from '../domain/finance'
import { computeWithdrawal, remunerationForShare, scanStrategies, type WithdrawalResult } from '../domain/tax/luxembourg'
import { fmtEUR, fmtPct } from '../lib/format'
import { ChartTooltip, Field, Legend, NumberInput, Stat } from '../components/ui'

const axisStyle = { fontSize: 11, fill: 'var(--muted)' }

type SegKey = 'netInPocket' | 'social' | 'corporate' | 'incomeTax' | 'dependency' | 'retained'
const SEGMENTS: { key: SegKey; label: string; color: string }[] = [
  { key: 'netInPocket', label: 'Neto en tu cuenta', color: 'var(--series-1)' },
  { key: 'social', label: 'Cotizaciones CCSS', color: 'var(--series-2)' },
  { key: 'corporate', label: 'IRC + ICC + IF', color: 'var(--series-3)' },
  { key: 'incomeTax', label: 'IR', color: 'var(--series-4)' },
  { key: 'dependency', label: 'Dependencia 1,4 %', color: 'var(--series-5)' },
  { key: 'retained', label: 'Reservas en la empresa', color: 'var(--series-7)' },
]

export default function Taxes() {
  const { orders, expenses, year, company, tax } = useStore()
  const s = useMemo(() => summarize(filterYear(orders, year), filterYear(expenses, year)), [orders, expenses, year])

  const [useData, setUseData] = useState(true)
  const [manualResult, setManualResult] = useState(60_000)
  const result = useData ? s.operatingResult : manualResult

  const [share, setShare] = useState(0.4)
  const [distribution, setDistribution] = useState(1)

  const base = useMemo(() => ({ resultBeforeRemuneration: result, distributionRate: distribution, company, params: tax }), [result, distribution, company, tax])
  const { curve, best } = useMemo(() => scanStrategies(base, 100), [base])
  const rem = remunerationForShare(result, share)
  const r = useMemo(() => computeWithdrawal({ ...base, remunerationGross: rem }), [base, rem])
  const bestR = useMemo(() => computeWithdrawal({ ...base, remunerationGross: best.remunerationGross }), [base, best])
  const allDiv = useMemo(() => computeWithdrawal({ ...base, remunerationGross: 0 }), [base])
  const allRem = useMemo(() => computeWithdrawal({ ...base, remunerationGross: result }), [base, result])

  const retained = Math.max(0, r.retainedEarnings)
  const compositionRow: Record<SegKey, number> & { name: string } = {
    name: 'Reparto',
    netInPocket: Math.max(0, r.netInPocket),
    social: r.socialContributions,
    corporate: r.corporateTaxTotal,
    incomeTax: r.incomeTaxTotal,
    dependency: r.dependencySalary + r.dividendDependency,
    retained,
  }
  const gap = bestR.netInPocket - r.netInPocket
  const marginalTop = tax.irBrackets[tax.irBrackets.length - 1].rate * (1 + tax.irEmploymentFundRate)

  if (result <= 0 && useData) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Impuestos y retiro · {year}</h1>
        <div className="card text-2">
          El resultado del ejercicio {year} es {fmtEUR(result)}. No hay beneficio que distribuir. Puedes simular con un importe manual:
          <div className="mt-3 flex gap-2 items-end">
            <Field label="Resultado a simular (€)"><NumberInput value={manualResult} onChange={setManualResult} step={1000} /></Field>
            <button className="btn btn-primary" onClick={() => setUseData(false)}>Simular</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Impuestos y retiro · {year}</h1>
        <span className="chip">Luxemburgo · SARL · gérant independiente · clase {company.taxClass} · parámetros {tax.year}</span>
      </div>

      <section className="card flex flex-col gap-4">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Resultado antes de remuneración e impuestos" hint={useData ? `Calculado con los pedidos y gastos de ${year}` : 'Importe manual'}>
            <div className="flex gap-2">
              <NumberInput value={Math.round(result)} onChange={(n) => { setUseData(false); setManualResult(n) }} step={1000} />
              {!useData && <button className="btn btn-sm whitespace-nowrap" onClick={() => setUseData(true)}>Usar datos</button>}
            </div>
          </Field>
          <Field label={`Beneficio distribuido como dividendos: ${Math.round(distribution * 100)} %`} hint="El resto queda en reservas de la empresa">
            <input type="range" min={0} max={100} step={5} value={Math.round(distribution * 100)} onChange={(e) => setDistribution(Number(e.target.value) / 100)} />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="font-medium">
              Remuneración del gérant: <span className="tabular">{Math.round(share * 100)} %</span> del resultado
              <span className="text-2 font-normal"> · {fmtEUR(rem)} bruto/año · {fmtEUR(rem / 12)} al mes</span>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => setShare(best.share)} disabled={Math.abs(share - best.share) < 0.005}>
              Aplicar óptimo ({Math.round(best.share * 100)} %)
            </button>
          </div>
          <input type="range" min={0} max={100} step={1} value={Math.round(share * 100)} onChange={(e) => setShare(Number(e.target.value) / 100)} aria-label="Porcentaje del resultado destinado a remuneración" />
          <div className="flex justify-between text-xs muted"><span>100 % dividendos</span><span>100 % remuneración</span></div>
        </div>
        <p className="text-sm text-2">
          La remuneración es deducible para la empresa pero paga cotizaciones CCSS ({fmtPct(tax.socialRate)}, sobre una base entre {fmtEUR(tax.socialMinBase)} y {fmtEUR(tax.socialMaxBase)}) y el IR completo
          (hasta {fmtPct(marginalTop)} con fondo de empleo). Los dividendos pagan primero IRC + ICC en la empresa y luego el IR solo sobre el 50 % (exención del art. 115 15a LIR) más 1,4 % de dependencia.{' '}
          {best.share >= 0.99
            ? 'Con este resultado, la remuneración gana en todo el rango.'
            : best.share <= 0.01
              ? 'Con este resultado, los dividendos ganan en todo el rango.'
              : `El óptimo combina ${Math.round(best.share * 100)} % de remuneración (${fmtEUR(best.remunerationGross)}) con dividendos para el resto.`}
        </p>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Neto en tu cuenta personal" value={fmtEUR(r.netInPocket)} tone="good" sub={`${fmtPct(result ? r.netInPocket / result : 0)} del resultado`} />
        <Stat label="Impuestos y cotizaciones totales" value={fmtEUR(r.totalLevies)} sub={`Tipo efectivo ${fmtPct(r.effectiveRate)}`} />
        <Stat label="Óptimo alcanzable" value={fmtEUR(bestR.netInPocket)} sub={gap > 1 ? `Dejas ${fmtEUR(gap)} sobre la mesa` : 'Estás en el óptimo'} tone={gap > 1 ? undefined : 'good'} />
        <Stat label="Queda en la empresa" value={fmtEUR(retained)} sub="Reservas tras impuestos y dividendos" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card flex flex-col gap-3">
          <h2 className="font-medium">Neto en tu cuenta según la estrategia</h2>
          <p className="text-xs text-2">Cada punto es un reparto distinto entre remuneración y dividendos. El punto marca el óptimo; la línea vertical, tu selección.</p>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={curve.map((c) => ({ ...c, pct: Math.round(c.share * 100) }))} margin={{ left: 0, right: 12, top: 12 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="pct" type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axisStyle} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} tickFormatter={(v) => `${v} %`} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => fmtEUR(v)} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip format={(n) => fmtEUR(n)} />} labelFormatter={(v) => `${v} % remuneración`} />
                <Line type="monotone" dataKey="netInPocket" name="Neto en tu cuenta" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
                <ReferenceLine x={Math.round(share * 100)} stroke="var(--text-2)" strokeDasharray="4 4" />
                <ReferenceDot x={Math.round(best.share * 100)} y={best.netInPocket} r={6} fill="var(--series-2)" stroke="var(--surface)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card flex flex-col gap-3">
          <h2 className="font-medium">¿A dónde va cada euro del resultado?</h2>
          <div style={{ height: 70 }}>
            <ResponsiveContainer>
              <BarChart data={[compositionRow]} layout="vertical" margin={{ left: 0, right: 0, top: 4, bottom: 4 }} barCategoryGap={0}>
                <XAxis type="number" hide domain={[0, Math.max(result, 1)]} />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<ChartTooltip format={(n) => fmtEUR(n)} />} cursor={false} />
                {SEGMENTS.map((seg) => (
                  <Bar key={seg.key} dataKey={seg.key} name={seg.label} stackId="a" fill={seg.color} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend items={SEGMENTS.map((s) => ({ color: s.color, label: s.label }))} />
          <table className="data text-sm">
            <tbody>
              <Row label="Resultado antes de remuneración e impuestos" value={result} bold />
              <Row label="− Remuneración bruta del gérant" value={-r.remunerationGross} />
              <Row label="= Base imponible de la empresa" value={r.corporateBase} bold />
              <Row label={`− IRC (${fmtPct(tax.ircLowRate)} / ${fmtPct(tax.ircHighRate)})`} value={-r.irc} />
              <Row label={`− Fondo de empleo (${fmtPct(tax.ircEmploymentFundRate)} del IRC)`} value={-r.ircEmploymentFund} />
              <Row label={`− ICC (${fmtPct(tax.iccRate, 2)} tras exención de ${fmtEUR(tax.iccAllowance)})`} value={-r.icc} />
              <Row label="− Impuesto sobre el patrimonio mínimo" value={-r.wealthTax} />
              <Row label="= Beneficio neto" value={r.netProfitAfterTax} bold />
              <Row label="Dividendos brutos" value={r.dividendsGross} />
              <Row label={`− IR sobre dividendos (base ${fmtEUR(r.dividendTaxable)} tras exención del 50 %)`} value={-r.dividendIncomeTax} />
              <Row label="− Dependencia sobre dividendos" value={-r.dividendDependency} />
              <Row label={`− Cotizaciones CCSS (base ${fmtEUR(r.socialBase)})`} value={-r.socialContributions} />
              <Row label="− Dependencia sobre remuneración" value={-r.dependencySalary} />
              <Row label={`− IR sobre remuneración (base ${fmtEUR(r.salaryTaxable)})`} value={-r.salaryIncomeTax} />
              <Row label="= Neto en tu cuenta" value={r.netInPocket} bold />
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-medium mb-3">Comparativa de estrategias</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Estrategia</th><th className="num">Remuneración bruta</th><th className="num">Dividendos</th><th className="num">CCSS + dep.</th><th className="num">IRC + ICC + IF</th><th className="num">IR</th><th className="num">Neto en tu cuenta</th><th className="num">Tipo efectivo</th>
            </tr>
          </thead>
          <tbody>
            <StrategyRow label="100 % dividendos" r={allDiv} />
            <StrategyRow label={`Óptimo (${Math.round(best.share * 100)} % remuneración)`} r={bestR} highlight />
            <StrategyRow label={`Tu selección (${Math.round(share * 100)} %)`} r={r} />
            <StrategyRow label="100 % remuneración" r={allRem} />
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="TVA a pagar (ejercicio)" value={fmtEUR(s.tvaToPay)} sub={`Recaudada ${fmtEUR(s.tvaCollected)} − deducible ${fmtEUR(s.tvaDeductible)}`} />
        <Stat label="Impuestos de sociedad a provisionar" value={fmtEUR(r.corporateTaxTotal)} sub={`IRC ${fmtEUR(r.irc + r.ircEmploymentFund)} · ICC ${fmtEUR(r.icc)} · IF ${fmtEUR(r.wealthTax)}`} />
        <Stat label="Cotizaciones CCSS a provisionar" value={fmtEUR(r.socialContributions + r.dependencySalary)} sub="A cargo del gérant, regularizadas por el CCSS" />
      </div>

      <p className="text-xs muted">
        Simulación simplificada con fines orientativos: cotizaciones CCSS como porcentaje único, ICC de Luxembourg-Ville, IF mínimo fijo, sin créditos de impuesto (CIS/CII) ni
        retención del 15 % sobre dividendos (que se imputa en la declaración). Si tienes menos del 25 % del capital tributarías como asalariado. Contrasta la estrategia con tu fiduciaire.
      </p>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <tr className={bold ? 'font-semibold' : ''}>
      <td>{label}</td>
      <td className="num">{fmtEUR(value)}</td>
    </tr>
  )
}

function StrategyRow({ label, r, highlight }: { label: string; r: WithdrawalResult; highlight?: boolean }) {
  return (
    <tr style={highlight ? { background: 'var(--surface-2)' } : undefined} className={highlight ? 'font-semibold' : ''}>
      <td>{label}</td>
      <td className="num">{fmtEUR(r.remunerationGross)}</td>
      <td className="num">{fmtEUR(r.dividendsGross)}</td>
      <td className="num">{fmtEUR(r.socialContributions + r.dependencySalary + r.dividendDependency)}</td>
      <td className="num">{fmtEUR(r.corporateTaxTotal)}</td>
      <td className="num">{fmtEUR(r.incomeTaxTotal)}</td>
      <td className="num" style={{ color: 'var(--good-text)' }}>{fmtEUR(r.netInPocket)}</td>
      <td className="num">{fmtPct(r.effectiveRate)}</td>
    </tr>
  )
}
