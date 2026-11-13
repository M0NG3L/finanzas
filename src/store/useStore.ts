import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppData, CompanySettings, Expense, Order, TaxParams } from '../domain/types'
import { DEFAULT_COMPANY, DEFAULT_TAX_PARAMS } from '../domain/tax/defaults'

interface StoreState extends AppData {
  year: number
  setYear: (y: number) => void
  addOrders: (orders: Order[]) => void
  upsertOrder: (o: Order) => void
  removeOrder: (id: string) => void
  addExpenses: (expenses: Expense[]) => void
  upsertExpense: (e: Expense) => void
  removeExpense: (id: string) => void
  setCompany: (c: Partial<CompanySettings>) => void
  setTax: (t: Partial<TaxParams>) => void
  resetTax: () => void
  importAll: (data: Partial<AppData>) => void
  clearAll: () => void
}

type Persisted = Pick<StoreState, 'orders' | 'expenses' | 'company' | 'tax' | 'year'>

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      orders: [],
      expenses: [],
      company: DEFAULT_COMPANY,
      tax: DEFAULT_TAX_PARAMS,
      year: new Date().getFullYear(),
      setYear: (year) => set({ year }),
      addOrders: (orders) =>
        set((s) => {
          const existing = new Set(s.orders.map((o) => o.orderNumber))
          const fresh = orders.filter((o) => !o.orderNumber || !existing.has(o.orderNumber))
          return { orders: [...s.orders, ...fresh].sort(byDateDesc) }
        }),
      upsertOrder: (o) =>
        set((s) => ({ orders: [...s.orders.filter((x) => x.id !== o.id), o].sort(byDateDesc) })),
      removeOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
      addExpenses: (expenses) => set((s) => ({ expenses: [...s.expenses, ...expenses].sort(byDateDesc) })),
      upsertExpense: (e) =>
        set((s) => ({ expenses: [...s.expenses.filter((x) => x.id !== e.id), e].sort(byDateDesc) })),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      setCompany: (c) => set((s) => ({ company: { ...s.company, ...c } })),
      setTax: (t) => set((s) => ({ tax: { ...s.tax, ...t } })),
      resetTax: () => set({ tax: DEFAULT_TAX_PARAMS }),
      importAll: (data) =>
        set((s) => ({
          orders: data.orders ?? s.orders,
          expenses: data.expenses ?? s.expenses,
          company: { ...s.company, ...(data.company ?? {}) },
          tax: { ...s.tax, ...(data.tax ?? {}) },
        })),
      clearAll: () => set({ orders: [], expenses: [] }),
    }),
    {
      name: 'finanzas-dropshipping',
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<Persisted>
        const merged: Persisted = {
          orders: state.orders ?? [],
          expenses: state.expenses ?? [],
          company: { ...DEFAULT_COMPANY, ...(state.company ?? {}) },
          tax: { ...DEFAULT_TAX_PARAMS, ...(state.tax ?? {}) },
          year: state.year ?? new Date().getFullYear(),
        }
        // v1 guardaba parámetros franceses: se sustituyen por los luxemburgueses
        if (version < 2) return { ...merged, tax: DEFAULT_TAX_PARAMS, company: { ...DEFAULT_COMPANY, name: state.company?.name ?? DEFAULT_COMPANY.name } }
        return merged
      },
      partialize: (s) => ({ orders: s.orders, expenses: s.expenses, company: s.company, tax: s.tax, year: s.year }),
    },
  ),
)

function byDateDesc(a: { date: string }, b: { date: string }) {
  return b.date.localeCompare(a.date)
}
