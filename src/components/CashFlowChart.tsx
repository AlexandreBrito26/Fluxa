import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthPoint } from '../lib/finance'
import { brl } from '../lib/finance'

export default function CashFlowChart({ data, height = 300 }: { data: MonthPoint[]; height?: number }) {
  const firstProjected = data.find((d) => d.projetado)?.month
  // Duas séries de saldo: realizado (sólido) e previsto (tracejado).
  // O último ponto realizado é repetido na série prevista para a linha não quebrar.
  const split = data.map((d, i) => ({
    ...d,
    saldoReal: d.projetado ? undefined : d.saldo,
    saldoPrev: d.projetado || data[i + 1]?.projetado ? d.saldo : undefined,
  }))
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={split} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="var(--muted)" tickLine={false} fontSize={12} />
          <YAxis
            stroke="var(--muted)"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={56}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            formatter={(v) => brl(Number(v))}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text)',
            }}
            labelFormatter={(l) => (l === firstProjected || data.find((d) => d.month === l)?.projetado ? `${l} (previsto)` : l)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="receitas" name="Receitas" fill="var(--green)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesas" name="Despesas" fill="var(--red)" radius={[4, 4, 0, 0]} />
          <Line
            dataKey="saldoReal"
            name="Saldo realizado"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            type="monotone"
            legendType="line"
          />
          <Line
            dataKey="saldoPrev"
            name="Saldo previsto"
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={{ r: 3 }}
            type="monotone"
            legendType="plainline"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
