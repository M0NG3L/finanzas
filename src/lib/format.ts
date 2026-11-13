export const fmtEUR = (n: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n || 0)

export const fmtPct = (n: number, digits = 1) =>
  new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: digits }).format(n || 0)

export const fmtNum = (n: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(n || 0)

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

export const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const monthLabel = (key: string) => MONTHS_ES[Number(key.slice(5, 7)) - 1] ?? key
