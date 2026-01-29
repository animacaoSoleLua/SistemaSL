"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NovoRelatorioPage() {
  const router = useRouter();
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [reportContent, setReportContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would normally handle the form submission, e.g., send to an API
    console.log({ reportName, reportDate, reportContent });
    router.push("/relatorios");
  };

  return (
    <main className="app-page">
      <section className="shell reveal">
        <header className="page-header">
          <div>
            <h1 className="hero-title">Novo Relatorio</h1>
            <p className="hero-copy">Crie um novo relatorio de evento</p>
          </div>
          <Link className="button secondary" href="/relatorios">
            Voltar
          </Link>
        </header>

        <form className="form-layout" onSubmit={handleSubmit}>
          <article className="form-card">
            <div className="form-card-head">
              <h2 className="section-title">Informacoes do relatorio</h2>
              <p>Preencha os dados principais do evento.</p>
            </div>
            <div className="form-grid">
              <label className="field full" htmlFor="reportName">
                <span>Nome do Relatorio</span>
                <input
                  type="text"
                  name="reportName"
                  id="reportName"
                  className="input"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  required
                />
              </label>

              <label className="field" htmlFor="reportDate">
                <span>Data do Evento</span>
                <input
                  type="date"
                  name="reportDate"
                  id="reportDate"
                  className="input"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                />
              </label>

              <label className="field full" htmlFor="reportContent">
                <span>Conteudo do Relatorio</span>
                <textarea
                  id="reportContent"
                  name="reportContent"
                  rows={8}
                  className="input"
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  required
                />
              </label>
            </div>
          </article>

          <div className="form-actions">
            <p className="helper">Revise as informacoes antes de salvar.</p>
            <div className="form-buttons">
              <Link className="button secondary" href="/relatorios">
                Cancelar
              </Link>
              <button type="submit" className="button">
                Salvar
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
