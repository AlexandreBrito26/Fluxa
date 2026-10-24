import { describe, expect, it } from 'vitest'
import { accountBalances, currentBalance } from './finance'
import { PRINCIPAL, type Account, type Transaction, type Transfer } from '../types'

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  type: 'receita',
  description: 'x',
  party: '',
  category: 'Outros',
  amount: 100,
  issueDate: '2026-10-01',
  dueDate: '2026-10-01',
  paidDate: '2026-10-01',
  recurring: false,
  ...over,
})

const find = (list: { id: string; balance: number }[], id: string) => list.find((b) => b.id === id)!.balance

describe('accountBalances', () => {
  it('conta corrente principal recebe o saldo inicial menos as contas extras', () => {
    const accounts: Account[] = [{ id: 'caixa', name: 'Caixa', initial: 500 }]
    // initialBalance total = 12000 (inclui os 500 do caixa)
    const b = accountBalances([], [], accounts, 12000)
    expect(find(b, PRINCIPAL)).toBe(11500)
    expect(find(b, 'caixa')).toBe(500)
  })

  it('lançamentos pagos vão para a conta indicada, sem accountId vão para a principal', () => {
    const accounts: Account[] = [{ id: 'caixa', name: 'Caixa', initial: 0 }]
    const txs = [
      tx({ amount: 300, accountId: 'caixa' }),
      tx({ amount: 200, type: 'despesa' }),
      tx({ amount: 999, paidDate: undefined }), // em aberto: não entra no saldo
    ]
    const b = accountBalances(txs, [], accounts, 1000)
    expect(find(b, 'caixa')).toBe(300)
    expect(find(b, PRINCIPAL)).toBe(1000 - 200)
  })

  it('transferência move valor e mantém o total', () => {
    const accounts: Account[] = [{ id: 'cartao', name: 'Cartão', initial: 0 }]
    const transfers: Transfer[] = [
      { id: 't1', date: '2026-10-02', fromId: PRINCIPAL, toId: 'cartao', amount: 400, description: 'pagar cartão' },
    ]
    const txs = [tx({ amount: 250, accountId: 'cartao' })]
    const b = accountBalances(txs, transfers, accounts, 5000)
    expect(find(b, PRINCIPAL)).toBe(5000 - 400)
    expect(find(b, 'cartao')).toBe(400 + 250)
    const total = b.reduce((acc, x) => acc + x.balance, 0)
    expect(total).toBeCloseTo(currentBalance(txs, 5000), 2)
  })

  it('soma das contas sempre bate com o saldo atual, mesmo com várias transferências', () => {
    const accounts: Account[] = [
      { id: 'a', name: 'A', initial: 1000 },
      { id: 'b', name: 'B', initial: 0 },
    ]
    const transfers: Transfer[] = [
      { id: '1', date: '2026-10-01', fromId: 'a', toId: 'b', amount: 300, description: '' },
      { id: '2', date: '2026-10-01', fromId: 'b', toId: PRINCIPAL, amount: 50, description: '' },
    ]
    const txs = [tx({ amount: 70, type: 'despesa', accountId: 'a' })]
    const b = accountBalances(txs, transfers, accounts, 3000)
    const total = b.reduce((acc, x) => acc + x.balance, 0)
    expect(total).toBeCloseTo(currentBalance(txs, 3000), 2)
  })
})
