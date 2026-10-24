export type TxType = 'receita' | 'despesa'
export type TxStatus = 'pendente' | 'pago' | 'atrasado'

export interface Transaction {
  id: string
  type: TxType
  description: string
  party: string // cliente ou fornecedor
  category: string
  amount: number
  issueDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD
  paidDate?: string // YYYY-MM-DD
  recurring: boolean
  /** Conta onde o lançamento acontece. Ausente = conta corrente principal. */
  accountId?: string
  /** Conferido com o extrato bancário (conciliação). */
  reconciled?: boolean
  /** Observação livre do lançamento. */
  note?: string
  /** Comprovante (imagem ou PDF pequeno), guardado como data URL. */
  attachment?: { name: string; dataUrl: string }
}

/** Id reservado da conta corrente principal (saldo inicial em `initialBalance`). */
export const PRINCIPAL = 'principal'

/** Conta extra (carteira, caixa, cartão). Seu saldo inicial já entra em `initialBalance`. */
export interface Account {
  id: string
  name: string
  initial: number
}

/** Transferência entre contas: move dinheiro sem alterar o saldo total nem receitas/despesas. */
export interface Transfer {
  id: string
  date: string // YYYY-MM-DD
  fromId: string
  toId: string
  amount: number
  description: string
}

export const CATEGORIES: Record<TxType, string[]> = {
  receita: ['Serviços', 'Produtos', 'Assinaturas', 'Outros'],
  despesa: ['Estrutura', 'Pessoal', 'Tecnologia', 'Marketing', 'Impostos', 'Serviços', 'Outros'],
}
