import { describe, expect, it } from 'vitest'
import { monthReport } from './finance'
import type { Transaction } from '../types'

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  type: 'despesa',
  description: 'x',
  party: '',
  category: 'Outros',
  amount: 100,
  issueDate: '2026-03-01',
  dueDate: '2026-03-10',
  recurring: false,
  ...over,
})

describe('monthReport', () => {
  const txs = [
    tx({ amount: 500, type: 'receita', category: 'Serviços', dueDate: '2026-03-05', paidDate: '2026-03-06' }),
    tx({ amount: 200, category: 'Marketing', dueDate: '2026-03-12', paidDate: '2026-03-12' }),
    tx({ amount: 300, category: 'Marketing', dueDate: '2026-03-20' }), // em aberto: conta na categoria, não no caixa
    tx({ amount: 999, type: 'receita', dueDate: '2026-04-01', paidDate: '2026-04-01' }), // outro mês
  ]

  it('soma entradas e saídas pagas do mês', () => {
    const r = monthReport(txs, '2026-03')
    expect(r.entradas).toBe(500)
    expect(r.saidas).toBe(200)
    expect(r.saldo).toBe(300)
  })

  it('agrupa despesas do mês por categoria, incluindo as em aberto', () => {
    const r = monthReport(txs, '2026-03')
    expect(r.porCategoria).toEqual([{ category: 'Marketing', total: 500 }])
  })

  it('lista os lançamentos do mês em ordem de data, sem os de outros meses', () => {
    const r = monthReport(txs, '2026-03')
    expect(r.lancamentos).toHaveLength(3)
    const dates = r.lancamentos.map((t) => t.paidDate ?? t.dueDate)
    expect([...dates].sort()).toEqual(dates)
  })

  it('mês sem lançamentos retorna zeros', () => {
    const r = monthReport(txs, '2025-01')
    expect(r).toMatchObject({ entradas: 0, saidas: 0, saldo: 0, porCategoria: [], lancamentos: [] })
  })
})

import { budgetUsage } from './finance'

describe('budgetUsage por mês', () => {
  it('usa o mês informado, não o atual', () => {
    const txs = [
      tx({ amount: 400, category: 'Marketing', dueDate: '2026-03-10', paidDate: '2026-03-10' }),
      tx({ amount: 50, category: 'Marketing', dueDate: '2026-04-10', paidDate: '2026-04-10' }),
    ]
    const march = budgetUsage(txs, { Marketing: 500 }, ['Marketing'], '2026-03')
    expect(march[0]).toMatchObject({ spent: 400, state: 'alerta' })
    const april = budgetUsage(txs, { Marketing: 500 }, ['Marketing'], '2026-04')
    expect(april[0].spent).toBe(50)
  })
})
