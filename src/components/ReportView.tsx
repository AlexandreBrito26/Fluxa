import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { brl, budgetUsage, fmtDate, iso, monthReport } from '../lib/finance'
import { CATEGORIES } from '../types'

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function ReportView() {
  const { txs, initialBalance, profiles, profileId, budgets } = useStore()
  const [month, setMonth] = useState(iso(new Date()).slice(0, 7))
  const r = useMemo(() => monthReport(txs, month), [txs, month])
  const metas = useMemo(
    () => budgetUsage(txs, budgets, CATEGORIES.despesa, month).filter((b) => b.limit > 0),
    [txs, budgets, month],
  )
  const profile = profiles.find((p) => p.id === profileId)?.name ?? ''

  return (
    <section className="card">
      <div className="toolbar no-print">
        <h3>Relatório mensal</h3>
        <div className="spacer" />
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Mês do relatório" />
        <button onClick={() => window.print()}>Imprimir / Salvar em PDF</button>
      </div>
      <p className="footnote no-print">
        Escolha "Salvar como PDF" na janela de impressão. O relatório usa o perfil ativo.
      </p>

      <article className="print-area">
        <header className="report-head">
          <div>
            <h2>Fluxa — relatório de {monthLabel(month)}</h2>
            <small>
              Perfil: {profile} · gerado em {fmtDate(iso(new Date()))}
            </small>
          </div>
        </header>

        <div className="report-kpis">
          <div>
            <span>Entradas (recebido)</span>
            <strong className="green">{brl(r.entradas)}</strong>
          </div>
          <div>
            <span>Saídas (pago)</span>
            <strong className="red">{brl(r.saidas)}</strong>
          </div>
          <div>
            <span>Resultado do mês</span>
            <strong className={r.saldo >= 0 ? 'green' : 'red'}>{brl(r.saldo)}</strong>
          </div>
        </div>

        <h3>Despesas por categoria</h3>
        {r.porCategoria.length ? (
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {r.porCategoria.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td className="num">{brl(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">Nenhuma despesa neste mês.</p>
        )}

        <h3>Metas do mês</h3>
        {metas.length ? (
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="num">Gasto</th>
                <th className="num">Meta</th>
                <th className="num">Uso</th>
              </tr>
            </thead>
            <tbody>
              {metas.map((m) => (
                <tr key={m.category}>
                  <td>{m.category}</td>
                  <td className="num">{brl(m.spent)}</td>
                  <td className="num">{brl(m.limit)}</td>
                  <td className={`num ${m.state === 'estourado' ? 'red' : m.state === 'alerta' ? 'amber' : ''}`}>
                    {Math.round(m.pct)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">Nenhuma meta definida.</p>
        )}

        <h3>Lançamentos</h3>
        {r.lancamentos.length ? (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Situação</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {r.lancamentos.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.paidDate ?? t.dueDate)}</td>
                  <td>{t.description}</td>
                  <td>{t.type === 'receita' ? 'Receita' : 'Despesa'}</td>
                  <td>{t.paidDate ? 'Pago' : 'Em aberto'}</td>
                  <td className="num">{brl(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">Nenhum lançamento neste mês.</p>
        )}

        <p className="footnote">Saldo inicial de referência: {brl(initialBalance)}.</p>
      </article>
    </section>
  )
}
