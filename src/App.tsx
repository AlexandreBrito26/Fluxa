import { lazy, Suspense, useEffect, useState } from 'react'
import { useStore } from './store'
import { usePwa } from './pwa'

// Cada aba vira um chunk próprio, carregado só quando é aberta.
const Overview = lazy(() => import('./components/Overview'))
const FlowTab = lazy(() => import('./components/FlowTab'))
const TransactionsTable = lazy(() => import('./components/TransactionsTable'))
const CategoriesTab = lazy(() => import('./components/CategoriesTab'))
const BudgetTab = lazy(() => import('./components/BudgetTab'))
const ImportTab = lazy(() => import('./components/ImportTab'))

const TABS = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'fluxo', label: 'Fluxo de caixa' },
  { id: 'pagar', label: 'Contas a pagar' },
  { id: 'receber', label: 'Contas a receber' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'metas', label: 'Metas' },
  { id: 'importar', label: 'Importar' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const { theme, toggleTheme, resetDemo } = useStore()
  const [tab, setTab] = useState<TabId>('geral')
  const { canInstall, install, offline } = usePwa()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // a barra de status do celular acompanha o tema
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b0f1a' : '#f4f6fb')
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
          {offline && <span className="badge atrasado offline-pill">offline</span>}
        </div>
        <div className="header-actions">
          {canInstall && <button onClick={install}>Instalar app</button>}
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
        <Suspense fallback={<div className="loading">Carregando…</div>}>
          {tab === 'geral' && <Overview />}
          {tab === 'fluxo' && <FlowTab />}
          {tab === 'pagar' && <TransactionsTable type="despesa" />}
          {tab === 'receber' && <TransactionsTable type="receita" />}
          {tab === 'categorias' && <CategoriesTab />}
          {tab === 'metas' && <BudgetTab />}
          {tab === 'importar' && <ImportTab />}
        </Suspense>
      </main>

      <footer>Dados fictícios de demonstração, salvos apenas no seu navegador.</footer>
    </div>
  )
}
