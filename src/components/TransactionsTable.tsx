import { useMemo, useRef, useState } from 'react'
import { CATEGORIES, type Transaction, type TxStatus, type TxType } from '../types'
import { brl, fmtDate, statusOf, toCSV } from '../lib/finance'
import { useStore } from '../store'
import TransactionForm from './TransactionForm'
import { swipeDirection } from '../lib/swipe'

export default function TransactionsTable({ type }: { type: TxType }) {
  const { txs, markPaid, remove, toggleReconciled } = useStore()
  const [status, setStatus] = useState<'todos' | TxStatus>('todos')
  const [recon, setRecon] = useState<'todos' | 'sim' | 'nao'>('todos')
  const [category, setCategory] = useState('todas')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState<{ editing?: Transaction } | null>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const isPay = type === 'despesa'

  const rows = useMemo(
    () =>
      txs
        .filter((t) => t.type === type)
        .filter((t) => status === 'todos' || statusOf(t) === status)
        .filter((t) => category === 'todas' || t.category === category)
        .filter((t) => recon === 'todos' || (recon === 'sim') === Boolean(t.reconciled))
        .filter((t) => !from || t.dueDate >= from)
        .filter((t) => !to || t.dueDate <= to)
        .filter((t) => !q || `${t.description} ${t.party}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [txs, type, status, category, from, to, q, recon],
  )

  const total = rows.reduce((acc, t) => acc + t.amount, 0)

  // Deslizar no celular: direita = dar baixa; esquerda = excluir (com confirmação).
  const onSwipe = (t: Transaction, dx: number, dy: number) => {
    const dir = swipeDirection(dx, dy)
    if (dir === 'right' && !t.paidDate) markPaid(t.id)
    if (dir === 'left' && confirm(`Excluir "${t.description}"?`)) remove(t.id)
  }
  const conferidos = rows.filter((t) => t.reconciled).length

  const exportCSV = () => {
    const blob = new Blob(['﻿' + toCSV(rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fluxa-${isPay ? 'a-pagar' : 'a-receber'}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="card">
      <div className="toolbar">
        <input placeholder="Buscar…" aria-label="Buscar lançamentos" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value as 'todos' | TxStatus)}>
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendentes</option>
          <option value="atrasado">Atrasados</option>
          <option value="pago">{isPay ? 'Pagos' : 'Recebidos'}</option>
        </select>
        <select value={recon} onChange={(e) => setRecon(e.target.value as 'todos' | 'sim' | 'nao')} aria-label="Conciliação">
          <option value="todos">Conciliação: todos</option>
          <option value="nao">Não conferidos</option>
          <option value="sim">Conferidos</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="todas">Todas as categorias</option>
          {CATEGORIES[type].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="De" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="Até" />
        <div className="spacer" />
        <button className="ghost" onClick={exportCSV}>
          Exportar CSV
        </button>
        <button onClick={() => setForm({})}>+ Lançamento</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>{isPay ? 'Fornecedor' : 'Cliente'}</th>
              <th>Categoria</th>
              <th className="num">Valor</th>
              <th>Status</th>
              <th>Conferido</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const st = statusOf(t)
              return (
                <tr
                  key={t.id}
                  onTouchStart={(e) => {
                    const p = e.touches[0]
                    touch.current = { x: p.clientX, y: p.clientY }
                  }}
                  onTouchEnd={(e) => {
                    const start = touch.current
                    touch.current = null
                    const p = e.changedTouches[0]
                    if (start) onSwipe(t, p.clientX - start.x, p.clientY - start.y)
                  }}
                >
                  <td>{fmtDate(t.dueDate)}</td>
                  <td>
                    {t.description}
                    {t.recurring && <span className="tag"> ↻</span>}
                    {t.note && <small className="note"> · {t.note}</small>}
                    {t.attachment && (
                      <a className="tag" href={t.attachment.dataUrl} download={t.attachment.name} title="Baixar comprovante">
                        {' '}📎
                      </a>
                    )}
                  </td>
                  <td>{t.party}</td>
                  <td>{t.category}</td>
                  <td className="num">{brl(t.amount)}</td>
                  <td>
                    <span className={`badge ${st}`}>{st}</span>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(t.reconciled)}
                      onChange={() => toggleReconciled(t.id)}
                      aria-label={`Conferido: ${t.description}`}
                    />
                  </td>
                  <td className="row-actions">
                    {!t.paidDate && (
                      <button className="mini" onClick={() => markPaid(t.id)}>
                        {isPay ? 'Dar baixa' : 'Receber'}
                      </button>
                    )}
                    <button className="mini ghost" onClick={() => setForm({ editing: t })}>
                      Editar
                    </button>
                    <button className="mini ghost danger" onClick={() => remove(t.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              )
            })}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="empty">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        {rows.length} lançamentos · {conferidos} conferidos · total {brl(total)}
        <span className="swipe-hint"> · No celular: deslize para a direita para dar baixa, ou para a esquerda para excluir.</span>
      </p>

      {form && <TransactionForm type={type} editing={form.editing} onClose={() => setForm(null)} />}
    </section>
  )
}
