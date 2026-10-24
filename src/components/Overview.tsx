import { useMemo } from 'react'
import { useStore } from '../store'
import {
  brl,
  currentBalance,
  daysUntil,
  dueSoon,
  fmtDate,
  monthTotals,
  monthlySeries,
  openTotal,
} from '../lib/finance'
import CashFlowChart from './CashFlowChart'

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' | 'amber' }) {
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  )
}

const dueLabel = (d: number) =>
  d < 0 ? `atrasado ${-d}d` : d === 0 ? 'vence hoje' : `em ${d}d`

export default function Overview() {
  const { txs, initialBalance } = useStore()
  const saldo = currentBalance(txs, initialBalance)
  const { entradas, saidas } = monthTotals(txs)
  const upcoming = useMemo(() => dueSoon(txs, 7).slice(0, 8), [txs])
  const series = useMemo(() => monthlySeries(txs, initialBalance, 5, 2), [txs, initialBalance])

  return (
    <>
      <div className="kpis">
        <Kpi label="Saldo atual" value={brl(saldo)} tone={saldo >= 0 ? 'green' : 'red'} />
        <Kpi label="Entradas do mês" value={brl(entradas)} tone="green" />
        <Kpi label="Saídas do mês" value={brl(saidas)} tone="red" />
        <Kpi label="A pagar (em aberto)" value={brl(openTotal(txs, 'despesa'))} />
        <Kpi label="A receber (em aberto)" value={brl(openTotal(txs, 'receita'))} />
        <Kpi label="Em atraso" value={brl(openTotal(txs, 'despesa', 'atrasado') + openTotal(txs, 'receita', 'atrasado'))} tone="amber" />
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Fluxo de caixa</h3>
          <CashFlowChart data={series} height={280} />
        </section>
        <section className="card">
          <h3>Vencendo nos próximos 7 dias</h3>
          <ul className="upcoming">
            {upcoming.map((t) => {
              const d = daysUntil(t.dueDate)
              return (
                <li key={t.id}>
                  <div>
                    <strong>{t.description}</strong>
                    <small>
                      {fmtDate(t.dueDate)} · {dueLabel(d)}
                    </small>
                  </div>
                  <span className={t.type === 'receita' ? 'green' : 'red'}>
                    {t.type === 'receita' ? '+' : '−'}
                    {brl(t.amount)}
                  </span>
                </li>
              )
            })}
            {!upcoming.length && <li className="empty">Nada vencendo nos próximos dias 🎉</li>}
          </ul>
        </section>
      </div>
    </>
  )
}
