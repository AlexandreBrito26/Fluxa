import { describe, expect, it } from 'vitest'
import { reconcileAfterEdit } from './reconcile'
import type { Transaction } from '../types'

const base: Transaction = {
  id: '1',
  type: 'despesa',
  description: 'x',
  party: '',
  category: 'Outros',
  amount: 100,
  issueDate: '2026-10-01',
  dueDate: '2026-10-10',
  paidDate: '2026-10-10',
  recurring: false,
  reconciled: true,
}

describe('reconcileAfterEdit', () => {
  it('desfaz a conferência ao mudar valor, vencimento ou pagamento', () => {
    expect(reconcileAfterEdit(base, { amount: 90 })).toEqual({ reconciled: false })
    expect(reconcileAfterEdit(base, { dueDate: '2026-10-15' })).toEqual({ reconciled: false })
    expect(reconcileAfterEdit(base, { paidDate: undefined })).toEqual({ reconciled: false })
  })
  it('mantém a conferência ao editar só descrição ou categoria', () => {
    expect(reconcileAfterEdit(base, { description: 'novo nome', category: 'Marketing' })).toEqual({})
  })
  it('mantém a conferência quando o valor é o mesmo', () => {
    expect(reconcileAfterEdit(base, { amount: 100 })).toEqual({})
  })
  it('não faz nada em lançamento que não estava conferido', () => {
    expect(reconcileAfterEdit({ ...base, reconciled: false }, { amount: 5 })).toEqual({})
  })
})
