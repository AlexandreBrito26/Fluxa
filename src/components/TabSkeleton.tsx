/** Placeholder exibido enquanto o chunk da aba carrega. Mantém o layout estável. */
export default function TabSkeleton() {
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label="Carregando conteúdo">
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div className="card kpi" key={i}>
            <div className="skeleton sk-line sk-small" />
            <div className="skeleton sk-line sk-big" />
          </div>
        ))}
      </div>
      <section className="card">
        <div className="skeleton sk-line sk-title" />
        <div className="skeleton sk-block" />
      </section>
    </div>
  )
}
