import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useStore } from '../store'
import { brl, categoryBreakdown } from '../lib/finance'
import type { TxType } from '../types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#94a3b8']

export default function CategoriesTab() {
  const { txs } = useStore()
  const [type, setType] = useState<TxType>('despesa')
  const data = useMemo(() => categoryBreakdown(txs, type), [txs, type])
  const total = data.reduce((acc, d) => acc + d.value, 0)

  return (
    <section className="card">
      <div className="toolbar">
        <h3>Por categoria</h3>
        <div className="spacer" />
        <div className="segmented">
          <button className={type === 'despesa' ? 'active' : ''} onClick={() => setType('despesa')}>
            Despesas
          </button>
          <button className={type === 'receita' ? 'active' : ''} onClick={() => setType('receita')}>
            Receitas
          </button>
        </div>
      </div>
      <div className="grid-2 cat">
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={105} paddingAngle={2} stroke="none">
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => brl(Number(v))}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="legend">
          {data.map((d, i) => (
            <li key={d.name}>
              <i style={{ background: COLORS[i % COLORS.length] }} />
              <span>{d.name}</span>
              <small>{total ? ((d.value / total) * 100).toFixed(0) : 0}%</small>
              <strong>{brl(d.value)}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
