import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { brl, indicators, monthlySeries, projectedBalance } from '../lib/finance'
import CashFlowChart from './CashFlowChart'

const PERIODS = [
  { label: '6 meses', back: 3, forward: 2 },
  { label: '9 meses', back: 5, forward: 3 },
  { label: '12 meses', back: 8, forward: 3 },
]

export default function FlowTab() {
  const { txs, initialBalance } = useStore()
  const [p, setP] = useState(1)
  const period = PERIODS[p]
  const series = useMemo(
    () => monthlySeries(txs, initialBalance, period.back, period.forward),
    [txs, initialBalance, period],
  )
  const ind = useMemo(() => indicators(txs), [txs])

  return (
    <>
      <section className="card">
        <div className="toolbar">
          <h3>Fluxo de caixa — realizado e previsto</h3>
          <div className="spacer" />
          <div className="segmented">
            {PERIODS.map((x, i) => (
              <button key={x.label} className={i === p ? 'active' : ''} onClick={() => setP(i)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <CashFlowChart data={series} height={340} />
        <p className="footnote">Meses futuros mostram apenas lançamentos já agendados (previsão).</p>
      </section>

      <div className="kpis">
        {[30, 60, 90].map((d) => {
          const v = projectedBalance(txs, initialBalance, d)
          return (
            <div className="card kpi" key={d}>
              <span className="kpi-label">Saldo projetado em {d} dias</span>
              <strong className={v >= 0 ? 'green' : 'red'}>{brl(v)}</strong>
            </div>
          )
        })}
        <div className="card kpi">
          <span className="kpi-label">Ticket médio</span>
          <strong>{brl(ind.ticketMedio)}</strong>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Prazo médio de recebimento</span>
          <strong>{ind.prazoMedio.toFixed(0)} dias</strong>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Inadimplência</span>
          <strong className={ind.inadimplencia > 10 ? 'amber' : ''}>{ind.inadimplencia.toFixed(1)}%</strong>
        </div>
      </div>
    </>
  )
}
