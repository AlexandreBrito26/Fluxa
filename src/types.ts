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
}

export const CATEGORIES: Record<TxType, string[]> = {
  receita: ['Serviços', 'Produtos', 'Assinaturas', 'Outros'],
  despesa: ['Estrutura', 'Pessoal', 'Tecnologia', 'Marketing', 'Impostos', 'Serviços', 'Outros'],
}
