import { useState } from 'react'
import { CATEGORIES, type Transaction, type TxType } from '../types'
import { iso } from '../lib/finance'
import { useStore } from '../store'

interface Props {
  type: TxType
  editing?: Transaction
  onClose: () => void
}

export default function TransactionForm({ type, editing, onClose }: Props) {
  const { add, update } = useStore()
  const [description, setDescription] = useState(editing?.description ?? '')
  const [party, setParty] = useState(editing?.party ?? '')
  const [category, setCategory] = useState(editing?.category ?? CATEGORIES[type][0])
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? iso(new Date()))
  const [paid, setPaid] = useState(Boolean(editing?.paidDate))
  const [recurring, setRecurring] = useState(editing?.recurring ?? false)

  const label = type === 'despesa' ? 'Fornecedor' : 'Cliente'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(',', '.'))
    if (!description.trim() || !value || value <= 0) return
    const payload = {
      type,
      description: description.trim(),
      party: party.trim() || '—',
      category,
      amount: value,
      dueDate,
      issueDate: editing?.issueDate ?? iso(new Date()),
      paidDate: paid ? (editing?.paidDate ?? iso(new Date())) : undefined,
      recurring,
    }
    if (editing) update(editing.id, payload)
    else add(payload)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>
          {editing ? 'Editar' : 'Novo'} lançamento — {type === 'despesa' ? 'a pagar' : 'a receber'}
        </h3>
        <label>
          Descrição
          <input value={description} onChange={(e) => setDescription(e.target.value)} autoFocus required />
        </label>
        <label>
          {label}
          <input value={party} onChange={(e) => setParty(e.target.value)} />
        </label>
        <div className="row">
          <label>
            Valor (R$)
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>
            Vencimento
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
        </div>
        <label>
          Categoria
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES[type].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Já {type === 'despesa' ? 'pago' : 'recebido'}
        </label>
        {!editing && (
          <label className="check">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            Recorrente (gera 6 meses)
          </label>
        )}
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit">Salvar</button>
        </div>
      </form>
    </div>
  )
}
