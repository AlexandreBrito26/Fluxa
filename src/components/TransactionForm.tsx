import { useId, useState } from 'react'
import { CATEGORIES, PRINCIPAL, type Transaction, type TxType } from '../types'
import { iso } from '../lib/finance'
import { readAttachment, type Attachment } from '../lib/attachments'
import { useStore } from '../store'

interface Props {
  type: TxType
  editing?: Transaction
  onClose: () => void
}

export default function TransactionForm({ type, editing, onClose }: Props) {
  const { add, update, accounts } = useStore()
  const [accountId, setAccountId] = useState(editing?.accountId ?? PRINCIPAL)
  const [description, setDescription] = useState(editing?.description ?? '')
  const [party, setParty] = useState(editing?.party ?? '')
  const [category, setCategory] = useState(editing?.category ?? CATEGORIES[type][0])
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? iso(new Date()))
  const [paid, setPaid] = useState(Boolean(editing?.paidDate))
  const [recurring, setRecurring] = useState(editing?.recurring ?? false)
  const [note, setNote] = useState(editing?.note ?? '')
  const [attachment, setAttachment] = useState<Attachment | undefined>(editing?.attachment)
  const [fileError, setFileError] = useState('')

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setAttachment(await readAttachment(file))
      setFileError('')
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Erro ao anexar o arquivo.')
    }
  }

  const label = type === 'despesa' ? 'Fornecedor' : 'Cliente'
  const titleId = useId()

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
      accountId: accountId === PRINCIPAL ? undefined : accountId,
      note: note.trim() || undefined,
      attachment,
    }
    if (editing) update(editing.id, payload)
    else add(payload)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3 id={titleId}>
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
        {accounts.length > 0 && (
          <label>
            Conta
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value={PRINCIPAL}>Conta corrente</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
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
        <label>
          Observação
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </label>
        <div className="attach">
          {attachment ? (
            <>
              <span>📎 {attachment.name}</span>
              <button type="button" className="mini ghost danger" onClick={() => setAttachment(undefined)}>
                Remover
              </button>
            </>
          ) : (
            <label className="file-btn">
              Anexar comprovante (até 400 KB)
              <input type="file" accept="image/*,application/pdf" onChange={onFile} hidden />
            </label>
          )}
          {fileError && <p className="alert red" role="alert">{fileError}</p>}
        </div>
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
