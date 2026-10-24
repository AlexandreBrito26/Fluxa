import type { Transaction } from '../types'

/**
 * Se um lançamento já conferido tiver valor, vencimento ou pagamento alterado,
 * a conferência deixa de valer: ele volta a ficar não conferido.
 */
export function reconcileAfterEdit(
  current: Transaction,
  patch: Partial<Transaction>,
): Partial<Pick<Transaction, 'reconciled'>> {
  if (!current.reconciled) return {}
  // 'in' e não !== undefined: paidDate: undefined (desmarcar "pago") também é mudança
  const changed =
    ('amount' in patch && patch.amount !== current.amount) ||
    ('dueDate' in patch && patch.dueDate !== current.dueDate) ||
    ('paidDate' in patch && patch.paidDate !== current.paidDate)
  return changed ? { reconciled: false } : {}
}
