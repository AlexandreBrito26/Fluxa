import { useEffect, useState } from 'react'
import { useStore } from './store'
import Overview from './components/Overview'
import FlowTab from './components/FlowTab'
import TransactionsTable from './components/TransactionsTable'
import CategoriesTab from './components/CategoriesTab'

const TABS = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'fluxo', label: 'Fluxo de caixa' },
  { id: 'pagar', label: 'Contas a pagar' },
  { id: 'receber', label: 'Contas a receber' },
  { id: 'categorias', label: 'Categorias' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const { theme, toggleTheme, resetDemo } = useStore()
  const [tab, setTab] = useState<TabId>('geral')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo">≈</span>
          <div>
            <h1>Fluxa</h1>
            <small>Seu fluxo de caixa, sempre claro</small>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="ghost"
            onClick={() => confirm('Restaurar os dados de demonstração? Seus lançamentos serão substituídos.') && resetDemo()}
          >
            Restaurar demo
          </button>
          <button className="ghost" onClick={toggleTheme} aria-label="Alternar tema">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'geral' && <Overview />}
        {tab === 'fluxo' && <FlowTab />}
        {tab === 'pagar' && <TransactionsTable type="despesa" />}
        {tab === 'receber' && <TransactionsTable type="receita" />}
        {tab === 'categorias' && <CategoriesTab />}
      </main>

      <footer>Dados fictícios de demonstração, salvos apenas no seu navegador.</footer>
    </div>
  )
}
