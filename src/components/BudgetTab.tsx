import { useMemo } from 'react'
import { useStore } from '../store'
import { brl, budgetUsage } from '../lib/finance'
import { CATEGORIES } from '../types'

const STATE_LABEL = {
  ok: 'Dentro da meta',
  alerta: 'Atenção',
  estourado: 'Meta estourada',
  'sem-meta': 'Sem meta',
} as const

export default function BudgetTab() {
  const { txs, budgets, setBudget } = useStore()
  const rows = useMemo(() => budgetUsage(txs, budgets, CATEGORIES.despesa), [txs, budgets])

  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const withGoal = rows.filter((r) => r.state !== 'sem-meta')
  const over = withGoal.filter((r) => r.state === 'estourado')
  const warn = withGoal.filter((r) => r.state === 'alerta')
  const totalLimit = withGoal.reduce((acc, r) => acc + r.limit, 0)
  const totalSpent = withGoal.reduce((acc, r) => acc + r.spent, 0)

  return (
    <section className="card">
      <div className="toolbar">
        <h3>Metas de gastos — {month}</h3>
        <div className="spacer" />
        <small className="muted">
          {brl(totalSpent)} de {brl(totalLimit)} nas categorias com meta
        </small>
      </div>

      {(over.length > 0 || warn.length > 0) && (
        <div className="alerts">
          {over.length > 0 && (
            <p className="alert red">
              ⚠ {over.length === 1 ? 'Categoria acima do limite' : 'Categorias acima do limite'}:{' '}
              <strong>{over.map((r) => r.category).join(', ')}</strong>
            </p>
          )}
          {warn.length > 0 && (
            <p className="alert amber">
              Perto do limite (80%+): <strong>{warn.map((r) => r.category).join(', ')}</strong>
            </p>
          )}
        </div>
      )}

      <ul className="budgets">
        {rows.map((r) => (
          <li key={r.category}>
            <div className="budget-head">
              <strong>{r.category}</strong>
              <span className={`badge ${r.state}`}>{STATE_LABEL[r.state]}</span>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={Math.round(r.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uso da meta de ${r.category}`}>
              <div className={`fill ${r.state}`} style={{ width: `${Math.min(r.pct, 100)}%` }} />
            </div>
            <div className="budget-foot">
              <span>
                {brl(r.spent)}
                {r.limit > 0 && (
                  <>
                    {' '}
                    de {brl(r.limit)} · <strong>{r.pct.toFixed(0)}%</strong>
                  </>
                )}
              </span>
              <label>
                Meta (R$)
                <input
                  key={`${r.category}-${r.limit}`}
                  type="number"
                  min="0"
                  step="50"
                  inputMode="decimal"
                  placeholder="sem meta"
                  defaultValue={r.limit || ''}
                  onBlur={(e) => {
                    const v = Number(e.target.value)
                    if (v !== r.limit) setBudget(r.category, v > 0 ? v : null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
      <p className="footnote">
        Conta pagamentos feitos e lançamentos agendados do mês. Deixe a meta vazia para desativá-la.
      </p>
    </section>
  )
}
