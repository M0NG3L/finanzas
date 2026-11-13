import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn btn-sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="text-xs muted">{label}</div>
      <div className="hero" style={tone === 'bad' ? { color: 'var(--critical)' } : tone === 'good' ? { color: 'var(--good-text)' } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs text-2">{sub}</div>}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs muted">{hint}</span>}
    </label>
  )
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="swatch" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

export function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: { name: string; value: number; color?: string; fill?: string }[]; label?: string | number; format: (n: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card text-xs" style={{ padding: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      {label !== undefined && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-2">
            <span className="swatch" style={{ background: p.color ?? p.fill }} />
            {p.name}
          </span>
          <span className="tabular">{format(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-center text-2 py-10">{children}</div>
}

export function NumberInput({ value, onChange, step = 0.01, min, max, ...rest }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; className?: string; placeholder?: string }) {
  return (
    <input
      type="number"
      className={`input ${rest.className ?? ''}`}
      value={Number.isFinite(value) ? value : ''}
      step={step}
      min={min}
      max={max}
      placeholder={rest.placeholder}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  )
}
