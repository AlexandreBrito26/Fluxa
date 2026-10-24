import { lazy, Suspense, useEffect, useState } from 'react'
import { useStore } from './store'
import { usePwa } from './pwa'
import ProfileSwitcher from './components/ProfileSwitcher'
import TabSkeleton from './components/TabSkeleton'
import ReportView from './components/ReportView'
import { nextTabIndex } from './lib/tabs'
import { ACCENT_PRESETS, accentVisibleOn, onAccentFor } from './lib/accent'

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
  { id: 'relatorio', label: 'Relatório' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const { theme, toggleTheme, resetDemo, clearAll, accent, setAccent } = useStore()
  const [tab, setTab] = useState<TabId>('geral')
  const { canInstall, install, offline } = usePwa()

  // Cor de destaque personalizada sobrepõe a do tema; o texto sobre ela se ajusta sozinho.
  useEffect(() => {
    const root = document.documentElement.style
    if (accent) {
      root.setProperty('--accent', accent)
      root.setProperty('--on-accent', onAccentFor(accent))
    } else {
      root.removeProperty('--accent')
      root.removeProperty('--on-accent')
    }
  }, [accent])

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
          <span className="logo" aria-hidden="true">≈</span>
          <div>
            <h1>Fluxa</h1>
            <small>Seu fluxo de caixa, sempre claro</small>
          </div>
          {offline && <span className="badge atrasado offline-pill">offline</span>}
        </div>
        <div className="header-actions">
          <ProfileSwitcher />
          <div className="accent-picker">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                aria-label={`Usar cor de destaque ${c}`}
                aria-pressed={accent === c}
                onClick={() => setAccent(c)}
              />
            ))}
            <input
              type="color"
              value={accent || '#818cf8'}
              onChange={(e) => setAccent(e.target.value)}
              aria-label="Cor de destaque personalizada"
              title="Cor de destaque"
            />
            {accent && (
              <button className="mini ghost" onClick={() => setAccent('')}>
                Padrão
              </button>
            )}
            {accent && !accentVisibleOn(accent, theme === 'dark' ? '#131a2a' : '#ffffff') && (
              <small className="accent-warn" role="status">Cor pouco visível neste tema</small>
            )}
          </div>
          {canInstall && <button onClick={install}>Instalar app</button>}
          <button
            className="ghost"
            onClick={() => confirm('Restaurar os dados de demonstração? Seus lançamentos serão substituídos.') && resetDemo()}
          >
            Restaurar demo
          </button>
          <button
            className="ghost"
            onClick={() =>
              confirm('Começar do zero? Todos os lançamentos, metas e o saldo inicial serão apagados.') && clearAll()
            }
          >
            Começar do zero
          </button>
          <button className="ghost" onClick={toggleTheme} aria-label="Alternar tema">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <nav
        className="tabs"
        role="tablist"
        aria-label="Seções"
        onKeyDown={(e) => {
          const next = nextTabIndex(TABS.findIndex((t) => t.id === tab), e.key, TABS.length)
          if (next === null) return
          e.preventDefault()
          const id = TABS[next].id
          setTab(id)
          requestAnimationFrame(() => document.getElementById(`tab-${id}`)?.focus())
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            tabIndex={tab === t.id ? 0 : -1}
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {/* key força nova animação a cada troca de aba */}
        <div key={tab} className="fade-in">
        <Suspense fallback={<TabSkeleton />}>
          {tab === 'geral' && <Overview />}
          {tab === 'fluxo' && <FlowTab />}
          {tab === 'pagar' && <TransactionsTable type="despesa" />}
          {tab === 'receber' && <TransactionsTable type="receita" />}
          {tab === 'categorias' && <CategoriesTab />}
          {tab === 'metas' && <BudgetTab />}
          {tab === 'importar' && <ImportTab />}
          {tab === 'relatorio' && <ReportView />}
        </Suspense>
        </div>
      </main>

      <footer>Dados fictícios de demonstração, salvos apenas no seu navegador.</footer>
    </div>
  )
}
