import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '../types'
import {
  budgetUsage,
  categoryBreakdown,
  currentBalance,
  daysUntil,
  dueSoon,
  fmtDate,
  indicators,
  iso,
  monthTotals,
  monthlySeries,
  openTotal,
  projectedBalance,
  statusOf,
  toCSV,
} from './finance'

// "Hoje" fixo nos testes: 24/10/2026
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 24, 12, 0, 0))
})
afterAll(() => vi.useRealTimers())

let seq = 0
const mk = (over: Partial<Transaction> = {}): Transaction => ({
  id: `t${++seq}`,
  type: 'receita',
  description: 'Lançamento',
  party: 'Fulano',
  category: 'Serviços',
  amount: 100,
  issueDate: '2026-10-01',
  dueDate: '2026-10-24',
  recurring: false,
  ...over,
})

describe('datas', () => {
  it('iso e fmtDate', () => {
    expect(iso(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(fmtDate('2026-10-24')).toBe('24/10/2026')
  })

  it('daysUntil conta a partir de hoje', () => {
    expect(daysUntil('2026-10-24')).toBe(0)
    expect(daysUntil('2026-10-27')).toBe(3)
    expect(daysUntil('2026-10-20')).toBe(-4)
  })
})

describe('statusOf', () => {
  it('pago quando tem data de pagamento', () => {
    expect(statusOf(mk({ paidDate: '2026-10-20', dueDate: '2026-10-01' }))).toBe('pago')
  })
  it('atrasado quando venceu e não foi pago', () => {
    expect(statusOf(mk({ dueDate: '2026-10-23' }))).toBe('atrasado')
  })
  it('vencendo hoje ainda é pendente', () => {
    expect(statusOf(mk({ dueDate: '2026-10-24' }))).toBe('pendente')
  })
  it('futuro é pendente', () => {
    expect(statusOf(mk({ dueDate: '2026-10-30' }))).toBe('pendente')
  })
})

describe('saldo e projeção', () => {
  it('currentBalance soma só o que já foi pago/recebido', () => {
    const txs = [
      mk({ type: 'receita', amount: 500, paidDate: '2026-10-05' }),
      mk({ type: 'despesa', amount: 200, paidDate: '2026-10-06' }),
      mk({ type: 'receita', amount: 999 }),
      mk({ type: 'despesa', amount: 999 }),
    ]
    expect(currentBalance(txs, 1000)).toBe(1300)
  })

  it('projectedBalance inclui os abertos que vencem até N dias (e os atrasados)', () => {
    const txs = [
      mk({ type: 'receita', amount: 500, paidDate: '2026-10-05' }), // saldo = 1500
      mk({ type: 'despesa', amount: 300, dueDate: '2026-11-10' }), // +17 dias
      mk({ type: 'receita', amount: 200, dueDate: '2026-12-10' }), // +47 dias
      mk({ type: 'despesa', amount: 100, dueDate: '2026-10-01' }), // atrasada
    ]
    expect(projectedBalance(txs, 1000, 30)).toBe(1100)
    expect(projectedBalance(txs, 1000, 60)).toBe(1300)
  })
})

describe('totais', () => {
  it('monthTotals considera apenas o mês atual e só o que foi pago', () => {
    const txs = [
      mk({ type: 'receita', amount: 400, dueDate: '2026-10-03', paidDate: '2026-10-05' }),
      mk({ type: 'despesa', amount: 150, dueDate: '2026-10-10', paidDate: '2026-10-10' }),
      mk({ type: 'receita', amount: 999, dueDate: '2026-10-28' }), // em aberto
      mk({ type: 'receita', amount: 777, dueDate: '2026-09-10', paidDate: '2026-09-12' }), // outro mês
    ]
    expect(monthTotals(txs)).toEqual({ entradas: 400, saidas: 150 })
  })

  it('openTotal soma abertos por tipo e, opcionalmente, por status', () => {
    const txs = [
      mk({ type: 'despesa', amount: 100, dueDate: '2026-10-01' }), // atrasada
      mk({ type: 'despesa', amount: 50, dueDate: '2026-11-01' }), // pendente
      mk({ type: 'despesa', amount: 70, paidDate: '2026-10-02' }), // paga
      mk({ type: 'receita', amount: 999, dueDate: '2026-11-01' }), // outro tipo
    ]
    expect(openTotal(txs, 'despesa')).toBe(150)
    expect(openTotal(txs, 'despesa', 'atrasado')).toBe(100)
    expect(openTotal(txs, 'despesa', 'pendente')).toBe(50)
  })

  it('dueSoon lista abertos até N dias, em ordem de vencimento', () => {
    const a = mk({ dueDate: '2026-10-19' }) // atrasado
    const b = mk({ dueDate: '2026-10-24' }) // hoje
    const c = mk({ dueDate: '2026-10-31' }) // +7
    const d = mk({ dueDate: '2026-11-01' }) // +8 (fora)
    const e = mk({ dueDate: '2026-10-25', paidDate: '2026-10-20' }) // pago (fora)
    expect(dueSoon([c, e, d, b, a], 7).map((t) => t.id)).toEqual([a.id, b.id, c.id])
  })

  it('categoryBreakdown agrupa por categoria e ordena do maior para o menor', () => {
    const txs = [
      mk({ type: 'despesa', category: 'Estrutura', amount: 100.5 }),
      mk({ type: 'despesa', category: 'Estrutura', amount: 50 }),
      mk({ type: 'despesa', category: 'Marketing', amount: 200 }),
      mk({ type: 'receita', category: 'Serviços', amount: 9999 }),
    ]
    expect(categoryBreakdown(txs, 'despesa')).toEqual([
      { name: 'Marketing', value: 200 },
      { name: 'Estrutura', value: 150.5 },
    ])
  })
})

describe('budgetUsage', () => {
  const spend = (category: string, amount: number, over: Partial<Transaction> = {}) =>
    mk({ type: 'despesa', category, amount, dueDate: '2026-10-10', ...over })

  it('classifica cada categoria como ok, alerta, estourado ou sem meta', () => {
    const txs = [
      spend('Estrutura', 500), // 50%
      spend('Marketing', 850), // 85%
      spend('Pessoal', 1000), // 100%
      spend('Tecnologia', 123), // sem meta
    ]
    const budgets = { Estrutura: 1000, Marketing: 1000, Pessoal: 1000 }
    const rows = budgetUsage(txs, budgets, ['Estrutura', 'Marketing', 'Pessoal', 'Tecnologia'])
    expect(rows.map((r) => r.state)).toEqual(['ok', 'alerta', 'estourado', 'sem-meta'])
    expect(rows[0]).toMatchObject({ spent: 500, limit: 1000, pct: 50 })
    expect(rows[3]).toMatchObject({ spent: 123, limit: 0, pct: 0 })
  })

  it('soma pagos e agendados do mês atual e ignora outros meses e receitas', () => {
    const txs = [
      spend('Estrutura', 300, { paidDate: '2026-10-11' }), // pago
      spend('Estrutura', 200, { dueDate: '2026-10-28' }), // agendado no mês
      spend('Estrutura', 999, { dueDate: '2026-09-10', paidDate: '2026-09-10' }), // mês anterior
      spend('Estrutura', 999, { dueDate: '2026-11-05' }), // próximo mês
      mk({ type: 'receita', category: 'Estrutura', amount: 999, dueDate: '2026-10-10' }),
    ]
    const [row] = budgetUsage(txs, { Estrutura: 1000 }, ['Estrutura'])
    expect(row.spent).toBe(500)
    expect(row.pct).toBe(50)
  })
})

describe('indicators', () => {
  it('calcula ticket médio, prazo médio e inadimplência', () => {
    const txs = [
      mk({ amount: 1000, issueDate: '2026-10-01', dueDate: '2026-10-12', paidDate: '2026-10-11' }),
      mk({ amount: 3000, issueDate: '2026-10-01', dueDate: '2026-10-15', paidDate: '2026-10-21' }),
      mk({ amount: 1000, dueDate: '2026-10-10' }), // vencida e não paga
      mk({ amount: 5000, dueDate: '2026-11-30' }), // ainda não venceu
      mk({ type: 'despesa', amount: 99999 }), // ignorada
    ]
    const r = indicators(txs)
    expect(r.ticketMedio).toBe(2500)
    expect(r.prazoMedio).toBeCloseTo(15, 0)
    expect(r.inadimplencia).toBeCloseTo(20, 5) // 1000 de 5000 vencidos
  })

  it('não quebra sem dados', () => {
    expect(indicators([])).toEqual({ ticketMedio: 0, prazoMedio: 0, inadimplencia: 0 })
  })
})

describe('monthlySeries', () => {
  it('acumula o saldo mês a mês e marca meses futuros como projetados', () => {
    const txs = [
      mk({ type: 'receita', amount: 500, dueDate: '2026-08-15', paidDate: '2026-08-15' }), // antes da janela
      mk({ type: 'receita', amount: 1000, dueDate: '2026-09-10', paidDate: '2026-09-10' }),
      mk({ type: 'despesa', amount: 400, dueDate: '2026-09-05', paidDate: '2026-09-05' }),
      mk({ type: 'despesa', amount: 300, dueDate: '2026-10-28' }),
      mk({ type: 'receita', amount: 700, dueDate: '2026-11-15' }),
    ]
    const s = monthlySeries(txs, 1000, 1, 1)
    expect(s.map((p) => p.month)).toEqual(['set/26', 'out/26', 'nov/26'])
    expect(s.map((p) => p.projetado)).toEqual([false, false, true])
    expect(s[0]).toMatchObject({ receitas: 1000, despesas: 400, saldo: 2100 })
    expect(s[1]).toMatchObject({ receitas: 0, despesas: 300, saldo: 1800 })
    expect(s[2]).toMatchObject({ receitas: 700, despesas: 0, saldo: 2500 })
  })
})

describe('toCSV', () => {
  it('escapa aspas, usa ; e vírgula decimal e datas dd/mm/aaaa', () => {
    const csv = toCSV([
      mk({
        description: 'Café "premium"; extra',
        amount: 1234.5,
        issueDate: '2026-10-01',
        dueDate: '2026-10-24',
      }),
    ])
    const [head, row] = csv.split('\n')
    expect(head.startsWith('"Descrição";"Cliente/Fornecedor"')).toBe(true)
    expect(row).toContain('"Café ""premium""; extra"')
    expect(row).toContain('"1234,50"')
    expect(row).toContain('"01/10/2026";"24/10/2026"')
    expect(row.endsWith('"pendente"')).toBe(true)
  })
})
