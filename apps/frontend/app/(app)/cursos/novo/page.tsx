export default function NovoCursoPage() {
  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header centered">
          <div>
            <h1 className="hero-title">Novo Curso</h1>
            <p className="hero-copy">Cadastre uma nova turma de forma rapida</p>
          </div>
        </header>

        <section className="form-layout">
          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Informacoes do Curso</h2>
              <p>Dados principais para divulgar</p>
            </div>
            <div className="form-grid">
              <label className="field full">
                <span>Nome do Curso (Obrigatorio)</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Ex: Ritmos para iniciantes"
                />
              </label>
              <label className="field">
                <span>Professor/Responsavel</span>
                <input className="input" type="text" placeholder="Nome completo" />
              </label>
              <label className="field">
                <span>Nivel</span>
                <select className="input" defaultValue="Iniciante">
                  <option>Iniciante</option>
                  <option>Intermediario</option>
                  <option>Avancado</option>
                </select>
              </label>
              <label className="field">
                <span>Modalidade</span>
                <select className="input" defaultValue="Presencial">
                  <option>Presencial</option>
                  <option>Online</option>
                  <option>Hibrido</option>
                </select>
              </label>
              <label className="field">
                <span>Vagas Disponiveis</span>
                <input className="input" type="number" placeholder="Ex: 25" />
              </label>
              <label className="field full">
                <span>Descricao</span>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Resumo do conteudo do curso"
                />
              </label>
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Agenda e Valores</h2>
              <p>Datas, horario e investimento</p>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Data de Inicio</span>
                <div className="field-input">
                  <input className="input" type="text" placeholder="dd/mm/aaaa" />
                  <span className="input-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20">
                      <rect x="3" y="4.5" width="14" height="12" rx="2" />
                      <path d="M6.5 2.8v3M13.5 2.8v3M3 8h14" />
                    </svg>
                  </span>
                </div>
              </label>
              <label className="field">
                <span>Data de Termino</span>
                <div className="field-input">
                  <input className="input" type="text" placeholder="dd/mm/aaaa" />
                  <span className="input-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20">
                      <rect x="3" y="4.5" width="14" height="12" rx="2" />
                      <path d="M6.5 2.8v3M13.5 2.8v3M3 8h14" />
                    </svg>
                  </span>
                </div>
              </label>
              <label className="field">
                <span>Horario</span>
                <input className="input" type="text" placeholder="Ex: Seg e Qua, 19h" />
              </label>
              <label className="field">
                <span>Duracao Total</span>
                <input className="input" type="text" placeholder="Ex: 8 aulas" />
              </label>
              <label className="field">
                <span>Valor do Curso</span>
                <input className="input" type="text" placeholder="Ex: R$ 250,00" />
              </label>
              <label className="field">
                <span>Desconto</span>
                <input className="input" type="text" placeholder="Ex: 10% a vista" />
              </label>
              <label className="field full">
                <span>Local</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Endereco ou link da sala online"
                />
              </label>
            </div>
            <div className="toggle-row">
              <label className="toggle-card">
                <span>Certificado?</span>
                <span className="switch">
                  <input type="checkbox" aria-label="Certificado" />
                  <span className="slider" />
                </span>
              </label>
              <label className="toggle-card">
                <span>Material incluso?</span>
                <span className="switch">
                  <input type="checkbox" aria-label="Material incluso" />
                  <span className="slider" />
                </span>
              </label>
              <label className="toggle-card">
                <span>Turma aberta?</span>
                <span className="switch">
                  <input type="checkbox" aria-label="Turma aberta" />
                  <span className="slider" />
                </span>
              </label>
            </div>
          </article>

          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Contato e Midia</h2>
              <p>Informacoes para comunicacao</p>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>WhatsApp</span>
                <input className="input" type="text" placeholder="(61) 99999-9999" />
              </label>
              <label className="field">
                <span>Link de Inscricao</span>
                <input className="input" type="text" placeholder="URL do formulario" />
              </label>
              <label className="field full">
                <span>Imagem de Capa</span>
                <input className="input" type="file" />
              </label>
              <p className="helper full">
                Use uma imagem quadrada para divulgar nas redes sociais.
              </p>
            </div>
          </article>

          <div className="form-actions">
            <p className="helper">Revise os dados antes de salvar</p>
            <div className="form-buttons">
              <button className="button secondary" type="button">
                Salvar rascunho
              </button>
              <button className="button" type="button">
                Publicar curso
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
