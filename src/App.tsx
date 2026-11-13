import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { availableYears } from './domain/finance'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Expenses from './pages/Expenses'
import Taxes from './pages/Taxes'
import Settings from './pages/Settings'

type Page = 'dashboard' | 'orders' | 'expenses' | 'taxes' | 'settings'

const PAGES: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Panel', icon: '▦' },
  { id: 'orders', label: 'Pedidos', icon: '🛒' },
  { id: 'expenses', label: 'Gastos', icon: '🧾' },
  { id: 'taxes', label: 'Impuestos y retiro', icon: '⚖️' },
  { id: 'settings', label: 'Ajustes', icon: '⚙️' },
]

function pageFromHash(): Page {
  const h = window.location.hash.replace('#', '') as Page
  return PAGES.some((p) => p.id === h) ? h : 'dashboard'
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash)
  const { orders, expenses, year, setYear, company } = useStore()
  const years = availableYears(orders, expenses)

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') ?? 'auto')
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r p-4 flex flex-col gap-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div>
          <div className="font-semibold text-lg leading-tight">{company.name}</div>
          <div className="text-xs muted">{company.legalForm}</div>
        </div>
        <nav className="nav flex md:flex-col gap-1 overflow-x-auto">
          {PAGES.map((p) => (
            <a key={p.id} href={`#${p.id}`} className={page === p.id ? 'active' : ''}>
              <span aria-hidden>{p.icon}</span>
              <span className="whitespace-nowrap">{p.label}</span>
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <label className="field">
            <span>Ejercicio</span>
            <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tema</span>
            <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="auto">Automático</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </label>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-6 max-w-[1200px] w-full mx-auto">
        {page === 'dashboard' && <Dashboard />}
        {page === 'orders' && <Orders />}
        {page === 'expenses' && <Expenses />}
        {page === 'taxes' && <Taxes />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  )
}
