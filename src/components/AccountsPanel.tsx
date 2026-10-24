import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { accountBalances, brl, fmtDate, iso } from '../lib/finance'

export default function AccountsPanel() {
  const { txs, initialBalance, accounts, transfers, addAccount, addTransfer } = useStore()
  const balances = useMemo(
    () => accountBalances(txs, transfers, accounts, initialBalance),
    [txs, transfers, accounts, initialBalance],
  )

  const [newName, setNewName] = useState('')
  const [newInitial, setNewInitial] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const fromId = from || balances[0]?.id || ''
  const toId = to || balances[1]?.id || ''

  const createAccount = (e: React.FormEvent) => {
    e.preventDefault()
    const initial = Number(newInitial.replace(',', '.')) || 0
    if (!newName.trim()) return
    addAccount(newName.trim(), initial)
    setNewName('')
    setNewInitial('')
  }

  const transfer = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(',', '.'))
    if (!value || value <= 0) return setError('Informe um valor maior que zero.')
    if (fromId === toId) return setError('Escolha contas diferentes.')
    setError('')
    const name = (id: string) => balances.find((b) => b.id === id)?.name ?? ''
    addTransfer({
      date: iso(new Date()),
      fromId,
      toId,
      amount: value,
      description: `${name(fromId)} → ${name(toId)}`,
    })
    setAmount('')
  }

  const name = (id: string) => balances.find((b) => b.id === id)?.name ?? '—'
  const recent = [...transfers].reverse().slice(0, 5)

  return (
    <section className="card">
      <div className="toolbar">
        <h3>Contas e carteiras</h3>
      </div>

      <ul className="upcoming" aria-label="Saldo por conta">
        {balances.map((b) => (
          <li key={b.id}>
            <div>
              <strong>{b.name}</strong>
            </div>
            <span className={b.balance >= 0 ? 'green' : 'red'}>{brl(b.balance)}</span>
          </li>
        ))}
      </ul>

      <div className="grid-2">
        <form onSubmit={transfer}>
          <h4>Transferir entre contas</h4>
          <div className="row">
            <label>
              De
              <select value={fromId} onChange={(e) => setFrom(e.target.value)}>
                {balances.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Para
              <select value={toId} onChange={(e) => setTo(e.target.value)}>
                {balances.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Valor (R$)
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          {error && <p className="alert red" role="alert">{error}</p>}
          <button type="submit" disabled={balances.length < 2}>
            Transferir
          </button>
          {recent.length > 0 && (
            <ul className="upcoming">
              {recent.map((t) => (
                <li key={t.id}>
                  <div>
                    <strong>{name(t.fromId)} → {name(t.toId)}</strong>
                    <small>{fmtDate(t.date)}</small>
                  </div>
                  <span>{brl(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </form>

        <form onSubmit={createAccount}>
          <h4>Nova conta ou carteira</h4>
          <label>
            Nome
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Caixa, Cartão" />
          </label>
          <label>
            Saldo inicial (R$)
            <input inputMode="decimal" value={newInitial} onChange={(e) => setNewInitial(e.target.value)} />
          </label>
          <button type="submit" disabled={!newName.trim()}>
            Criar conta
          </button>
        </form>
      </div>
    </section>
  )
}
