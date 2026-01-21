export default function NovoRelatorioPage() {
  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header centered">
          <div>
            <h1 className="hero-title">Novo Relatorio</h1>
            <p className="hero-copy">Preencha as informacoes do evento</p>
          </div>
        </header>

        <section className="form-layout">
          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Informacoes do Evento</h2>
              <p>Dados basicos da festa</p>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Data do Evento (Obrigatorio)</span>
                <div className="field-input">
                  <input
                    className="input"
                    type="text"
                    placeholder="dd/mm/aaaa"
                  />
                  <span className="input-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20">
                      <rect x="3" y="4.5" width="14" height="12" rx="2" />
                      <path d="M6.5 2.8v3M13.5 2.8v3M3 8h14" />
                    </svg>
                  </span>
                </div>
              </label>
              <label className="field">
                <span>Titulo/Cronograma</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Colocar titulo que aparece na agenda"
                />
              </label>
              <label className="field full">
                <span>Aniversariante / Contratante (Obrigatorio)</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Nome do aniversariante, contratante ou empresa"
                />
              </label>
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Locomocao</h2>
              <p>Informacoes sobre transporte</p>
            </div>
            <div className="form-grid">
              <label className="field full">
                <span>Forma de Locomocao</span>
                <select className="input" defaultValue="Uber/99">
                  <option>Uber/99</option>
                  <option>Carro proprio</option>
                  <option>Van</option>
                  <option>Onibus</option>
                </select>
              </label>
              <label className="field">
                <span>Valor Uber (ida)</span>
                <input className="input" type="text" placeholder="Ex: 25,50" />
              </label>
              <label className="field">
                <span>Valor Uber (volta)</span>
                <input className="input" type="text" placeholder="Ex: 30,00" />
              </label>
              <p className="helper full">
                Some valores de multiplos Ubers se houver
              </p>
            </div>
            <div className="toggle-row">
              <label className="toggle-card">
                <span>Fora de Brasilia?</span>
                <span className="switch">
                  <input type="checkbox" aria-label="Fora de Brasilia" />
                  <span className="slider" />
                </span>
              </label>
              <label className="toggle-card">
                <span>Hora Extra?</span>
                <span className="switch">
                  <input type="checkbox" aria-label="Hora Extra" />
                  <span className="slider" />
                </span>
              </label>
              <label className="toggle-card">
                <span>Exclusividade?</span>
                <span className="switch">
                  <input type="checkbox" aria-label="Exclusividade" />
                  <span className="slider" />
                </span>
              </label>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
