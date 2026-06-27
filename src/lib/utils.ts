import type { DotStatus } from './types'

const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  const now = new Date()
  const n = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((t - n) / 86400000)
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${M[m - 1]} ${y}`
}

export function fmtEur(n: number): string {
  return n.toLocaleString('es-ES') + ' €'
}

export function fmtEurM(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + ' M€'
  return fmtEur(n)
}

export function statusOf(dias: number): DotStatus {
  if (dias < 0)  return 'venc'
  if (dias < 30) return 'danger'
  if (dias < 90) return 'warn'
  return 'ok'
}

export function dotColor(st: DotStatus): string {
  if (st === 'danger' || st === 'venc') return '#F87171'
  if (st === 'warn') return '#FBBF24'
  return '#34D399'
}

export function statusLabel(st: DotStatus): string {
  if (st === 'venc')   return 'Vencido'
  if (st === 'danger') return 'Crítico'
  if (st === 'warn')   return 'Atención'
  return 'En plazo'
}

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??'
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
