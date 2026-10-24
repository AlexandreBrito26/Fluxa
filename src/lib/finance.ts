import type { Transaction, TxStatus, TxType } from '../types'

export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const fmtDate = (s: string) => s.split('-').reverse().join('/')

const parse = (s: string) => new Date(`${s}T00:00:00`)

/** Dias entre hoje e a data informada (negativo = já passou). */
export const daysUntil = (s: string) =>
  Math.round((parse(s).getTime() - parse(iso(new Date())).getTime()) / 86_400_000)

export const statusOf = (t: Transaction): TxStatus =>
  t.paidDate ? 'pago' : t.dueDate < iso(new Date()) ? 'atrasado' : 'pendente'

const signed = (t: Transaction) => (t.type === 'receita' ? t.amount : -t.amount)
const sum = (list: Transaction[]) => list.reduce((acc, t) => acc + t.amount, 0)
const monthOf = (s: string) => s.slice(0, 7)

/** Saldo realizado: saldo inicial + tudo que já foi pago/recebido. */
export const currentBalance = (txs: Transaction[], initial: number) =>
  initial + txs.filter((t) => t.paidDate).reduce((acc, t) => acc + signed(t), 0)

export interface MonthPoint {
  month: string
  receitas: number
  despesas: number
  saldo: number
  projetado: boolean
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Série mensal com saldo acumulado (realizado + previsto). */
export function monthlySeries(
  txs: Transaction[],
  initial: number,
  back: number,
  forward: number,
): MonthPoint[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - back, 1)
  const startISO = iso(start)
  const eff = (t: Transaction) => t.paidDate ?? t.dueDate
  let running =
    initial + txs.filter((t) => eff(t) < startISO).reduce((acc, t) => acc + signed(t), 0)
  const currentKey = monthOf(iso(now))
  const points: MonthPoint[] = []
  for (let i = 0; i <= back + forward; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const key = monthOf(iso(d))
    const inMonth = txs.filter((t) => monthOf(eff(t)) === key)
    const receitas = sum(inMonth.filter((t) => t.type === 'receita'))
    const despesas = sum(inMonth.filter((t) => t.type === 'despesa'))
    running += receitas - despesas
    points.push({
      month: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      receitas,
      despesas,
      saldo: Math.round(running * 100) / 100,
      projetado: key > currentKey,
    })
  }
  return points
}

/** Saldo projetado: saldo atual + tudo que está em aberto e vence até N dias. */
export function projectedBalance(txs: Transaction[], initial: number, days: number) {
  const limit = iso(addDays(new Date(), days))
  const open = txs.filter((t) => !t.paidDate && t.dueDate <= limit)
  return currentBalance(txs, initial) + open.reduce((acc, t) => acc + signed(t), 0)
}

export function monthTotals(txs: Transaction[]) {
  const key = monthOf(iso(new Date()))
  const eff = (t: Transaction) => t.paidDate ?? t.dueDate
  const inMonth = txs.filter((t) => monthOf(eff(t)) === key)
  return {
    entradas: sum(inMonth.filter((t) => t.type === 'receita' && t.paidDate)),
    saidas: sum(inMonth.filter((t) => t.type === 'despesa' && t.paidDate)),
  }
}

export function openTotal(txs: Transaction[], type: TxType, status?: TxStatus) {
  return sum(
    txs.filter((t) => t.type === type && !t.paidDate && (!status || statusOf(t) === status)),
  )
}

export function dueSoon(txs: Transaction[], days = 7) {
  return txs
    .filter((t) => !t.paidDate && daysUntil(t.dueDate) <= days)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function categoryBreakdown(txs: Transaction[], type: TxType) {
  const map = new Map<string, number>()
  txs
    .filter((t) => t.type === type)
    .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export type BudgetState = 'ok' | 'alerta' | 'estourado' | 'sem-meta'

export interface BudgetRow {
  category: string
  limit: number
  spent: number
  pct: number
  state: BudgetState
}

/**
 * Uso do orçamento no mês atual, por categoria de despesa.
 * Conta o que já foi pago e o que está agendado para o mês.
 * Estados: ok (<80%), alerta (80–99%), estourado (≥100%), sem-meta (sem limite).
 */
export function budgetUsage(
  txs: Transaction[],
  budgets: Record<string, number>,
  categories: string[],
): BudgetRow[] {
  const key = monthOf(iso(new Date()))
  return categories.map((category) => {
    const spent = sum(
      txs.filter(
        (t) =>
          t.type === 'despesa' && t.category === category && monthOf(t.paidDate ?? t.dueDate) === key,
      ),
    )
    const limit = budgets[category] ?? 0
    const pct = limit > 0 ? (spent / limit) * 100 : 0
    const state: BudgetState =
      limit <= 0 ? 'sem-meta' : pct >= 100 ? 'estourado' : pct >= 80 ? 'alerta' : 'ok'
    return { category, limit, spent: Math.round(spent * 100) / 100, pct, state }
  })
}

export function indicators(txs: Transaction[]) {
  const receitas = txs.filter((t) => t.type === 'receita')
  const paid = receitas.filter((t) => t.paidDate)
  const ticketMedio = receitas.length ? sum(receitas) / receitas.length : 0
  const prazoMedio = paid.length
    ? paid.reduce(
        (acc, t) => acc + (parse(t.paidDate!).getTime() - parse(t.issueDate).getTime()) / 86_400_000,
        0,
      ) / paid.length
    : 0
  const vencidas = receitas.filter((t) => t.dueDate < iso(new Date()))
  const atrasadas = vencidas.filter((t) => !t.paidDate)
  const inadimplencia = vencidas.length ? (sum(atrasadas) / sum(vencidas)) * 100 : 0
  return { ticketMedio, prazoMedio, inadimplencia }
}

export function toCSV(txs: Transaction[]) {
  const head = ['Descrição', 'Cliente/Fornecedor', 'Categoria', 'Valor', 'Emissão', 'Vencimento', 'Pagamento', 'Status']
  const rows = txs.map((t) => [
    t.description,
    t.party,
    t.category,
    t.amount.toFixed(2).replace('.', ','),
    fmtDate(t.issueDate),
    fmtDate(t.dueDate),
    t.paidDate ? fmtDate(t.paidDate) : '',
    statusOf(t),
  ])
  return [head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
}
